import { promises as dns } from 'node:dns';

const SSRF_ERROR = 'URL no permitida (ssrf)';
const MAX_REDIRECTS = 5;

export type LookupFn = (hostname: string) => Promise<string[]>;

export function isPrivateOrLocalIp(ip: string): boolean {
  const raw = String(ip || '').trim().toLowerCase();
  if (!raw) return true;
  if (raw === '::1' || raw === '0:0:0:0:0:0:0:1') return true;
  const v4 = raw.startsWith('::ffff:') ? raw.slice(7) : raw;
  const parts = v4.split('.');
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const [a, b] = parts.map(Number);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  if (raw.startsWith('fe80:') || raw.startsWith('fc') || raw.startsWith('fd')) return true;
  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host === 'localhost.localdomain') {
    return true;
  }
  if (host.endsWith('.local') || host === '0.0.0.0') return true;
  return isPrivateOrLocalIp(host);
}

async function defaultLookup(hostname: string): Promise<string[]> {
  const result = await dns.lookup(hostname, { all: true, verbatim: true });
  return result.map((entry) => entry.address);
}

export async function assertSafePublicHttpUrl(
  raw: string,
  opts?: { lookup?: LookupFn }
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(String(raw || '').trim());
  } catch {
    throw new Error(SSRF_ERROR);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(SSRF_ERROR);
  }
  if (parsed.username || parsed.password) {
    throw new Error(SSRF_ERROR);
  }
  const hostname = parsed.hostname;
  if (!hostname || isBlockedHostname(hostname)) {
    throw new Error(SSRF_ERROR);
  }
  const lookup = opts?.lookup || defaultLookup;
  let addresses: string[];
  try {
    addresses = isPrivateOrLocalIp(hostname) ? [hostname] : await lookup(hostname);
  } catch {
    throw new Error(SSRF_ERROR);
  }
  if (!addresses.length || addresses.some(isPrivateOrLocalIp)) {
    throw new Error(SSRF_ERROR);
  }
  return parsed;
}

export type HopResult = {
  status: number;
  location: string | null;
  contentType: string | null;
  body: string | null;
};

export async function followSafeRedirects(
  start: URL,
  deps: {
    lookup?: LookupFn;
    fetchHop: (url: URL) => Promise<HopResult>;
    maxHops?: number;
  }
): Promise<{ url: URL; contentType: string | null; body: string | null }> {
  let current = await assertSafePublicHttpUrl(start.href, { lookup: deps.lookup });
  const maxHops = deps.maxHops ?? MAX_REDIRECTS;

  for (let hop = 0; hop <= maxHops; hop += 1) {
    const result = await deps.fetchHop(current);
    const redirected = result.status >= 300 && result.status < 400 && result.location;
    if (!redirected) {
      return { url: current, contentType: result.contentType, body: result.body };
    }
    const next = new URL(result.location, current);
    current = await assertSafePublicHttpUrl(next.href, { lookup: deps.lookup });
  }
  throw new Error(SSRF_ERROR);
}

const HTML_MAX_BYTES = 512 * 1024;
const FETCH_TIMEOUT_MS = 5000;

export type FetchHtmlResult =
  | { ok: true; html: string; finalUrl: URL; contentType: string }
  | { ok: false; reason: string };

export async function fetchSafeHtml(
  start: URL,
  opts?: { lookup?: LookupFn; fetchImpl?: typeof fetch }
): Promise<FetchHtmlResult> {
  const fetchImpl = opts?.fetchImpl || fetch;
  try {
    const done = await followSafeRedirects(start, {
      lookup: opts?.lookup,
      fetchHop: async (url) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
          const response = await fetchImpl(url.href, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
            headers: { Accept: 'text/html,application/xhtml+xml' },
          });
          const location = response.headers.get('location');
          const contentType = response.headers.get('content-type');
          if (response.status >= 300 && response.status < 400) {
            return { status: response.status, location, contentType, body: null };
          }
          const length = Number(response.headers.get('content-length') || 0);
          if (length > HTML_MAX_BYTES) {
            throw new Error('too-large');
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          if (buffer.length > HTML_MAX_BYTES) {
            throw new Error('too-large');
          }
          return {
            status: response.status,
            location: null,
            contentType,
            body: buffer.toString('utf8'),
          };
        } finally {
          clearTimeout(timer);
        }
      },
    });
    const contentType = (done.contentType || '').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return { ok: false, reason: 'no-html' };
    }
    if (!done.body) return { ok: false, reason: 'empty' };
    return { ok: true, html: done.body, finalUrl: done.url, contentType };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'error';
    if (/ssrf|no permit/i.test(message)) return { ok: false, reason: 'ssrf' };
    if (message === 'too-large') return { ok: false, reason: 'too-large' };
    if (error instanceof Error && error.name === 'AbortError') return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'network' };
  }
}

export async function fetchSafeBinary(
  start: URL,
  opts?: { lookup?: LookupFn; fetchImpl?: typeof fetch; maxBytes?: number }
): Promise<{ ok: true; bytes: Buffer; contentType: string } | { ok: false; reason: string }> {
  const fetchImpl = opts?.fetchImpl || fetch;
  const maxBytes = opts?.maxBytes ?? 2 * 1024 * 1024;
  try {
    const done = await followSafeRedirects(start, {
      lookup: opts?.lookup,
      fetchHop: async (url) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
          const response = await fetchImpl(url.href, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
          });
          const location = response.headers.get('location');
          const contentType = response.headers.get('content-type');
          if (response.status >= 300 && response.status < 400) {
            return { status: response.status, location, contentType, body: null };
          }
          const length = Number(response.headers.get('content-length') || 0);
          if (length > maxBytes) throw new Error('too-large');
          const buffer = Buffer.from(await response.arrayBuffer());
          if (buffer.length > maxBytes) throw new Error('too-large');
          return {
            status: response.status,
            location: null,
            contentType,
            body: buffer.toString('base64'),
          };
        } finally {
          clearTimeout(timer);
        }
      },
    });
    if (!done.body) return { ok: false, reason: 'empty' };
    return {
      ok: true,
      bytes: Buffer.from(done.body, 'base64'),
      contentType: done.contentType || 'application/octet-stream',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'error';
    if (/ssrf|no permit/i.test(message)) return { ok: false, reason: 'ssrf' };
    if (message === 'too-large') return { ok: false, reason: 'too-large' };
    if (error instanceof Error && error.name === 'AbortError') return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'network' };
  }
}
