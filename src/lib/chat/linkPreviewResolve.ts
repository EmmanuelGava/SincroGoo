import { parseOgHtml } from './ogHtml';
import { assertSafePublicHttpUrl, type FetchHtmlResult } from './ssrfGuard';

export type CachedLinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
  fetched_at: string;
  expires_at: string;
};

export type LinkPreviewJson = {
  title: string;
  description: string;
  image: string | null;
  siteName: string;
  url: string;
};

export function previewImageProxyPath(imageUrl: string): string {
  return `/api/chat/link-preview/image?url=${encodeURIComponent(imageUrl)}`;
}

function toJson(row: CachedLinkPreview): LinkPreviewJson {
  return {
    title: row.title || '',
    description: row.description || '',
    image: row.image_url ? previewImageProxyPath(row.image_url) : null,
    siteName: row.site_name || '',
    url: row.url,
  };
}

function cacheTtl(now: Date) {
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { fetched_at: now.toISOString(), expires_at: expires.toISOString() };
}

export async function resolveLinkPreview(
  rawUrl: string,
  deps: {
    cacheGet: (url: string) => Promise<CachedLinkPreview | null>;
    cacheSet: (row: CachedLinkPreview) => Promise<void>;
    fetchHtml: (url: URL) => Promise<FetchHtmlResult>;
    assertSafeUrl?: (url: string) => Promise<URL>;
    now?: Date;
  }
): Promise<LinkPreviewJson | null> {
  const url = String(rawUrl || '').trim();
  if (!url) return null;
  const now = deps.now || new Date();

  const cached = await deps.cacheGet(url);
  if (cached && new Date(cached.expires_at).getTime() > now.getTime()) {
    return toJson(cached);
  }

  try {
    const safe = await (deps.assertSafeUrl || ((value: string) => assertSafePublicHttpUrl(value)))(url);
    const fetched = await deps.fetchHtml(safe);
    if (!fetched.ok) return null;

    const hostname = fetched.finalUrl.hostname;
    const parsed = parseOgHtml(fetched.html, hostname);
    let imageUrl = parsed.image;
    if (imageUrl) {
      try {
        const absolute = new URL(imageUrl, fetched.finalUrl).href;
        await (deps.assertSafeUrl || ((value: string) => assertSafePublicHttpUrl(value)))(absolute);
        imageUrl = absolute;
      } catch {
        imageUrl = null;
      }
    }

    const row: CachedLinkPreview = {
      url,
      title: parsed.title,
      description: parsed.description || null,
      image_url: imageUrl,
      site_name: parsed.siteName,
      ...cacheTtl(now),
    };
    await deps.cacheSet(row);
    return toJson(row);
  } catch {
    return null;
  }
}
