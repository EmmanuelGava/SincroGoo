export const INSTAGRAM_GRAPH_VERSION = 'v23.0';
const GRAPH = `https://graph.instagram.com/${INSTAGRAM_GRAPH_VERSION}`;

export const INSTAGRAM_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
];

export type InstagramEnv = {
  appId: string;
  appSecret: string;
  redirectUri: string;
};

export function getInstagramEnv(): InstagramEnv | null {
  const appId = process.env.INSTAGRAM_APP_ID || '';
  const appSecret = process.env.INSTAGRAM_APP_SECRET || '';
  const base = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  if (!appId || !appSecret || !base) return null;
  return { appId, appSecret, redirectUri: `${base}/api/integrations/instagram/callback` };
}

export class InstagramApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: number) {
    super(message);
    this.name = 'InstagramApiError';
  }
}

async function readJson(res: Response): Promise<Record<string, any>> {
  const body = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok || body.error) {
    const err = body.error || {};
    const message = String(err.message || err.error_message || body.error_message || `HTTP ${res.status}`);
    throw new InstagramApiError(message, res.status, typeof err.code === 'number' ? err.code : undefined);
  }
  return body;
}

export function buildInstagramAuthorizeUrl(env: InstagramEnv, state: string): string {
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.searchParams.set('client_id', env.appId);
  url.searchParams.set('redirect_uri', env.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', INSTAGRAM_SCOPES.join(','));
  url.searchParams.set('state', state);
  url.searchParams.set('enable_fb_login', '0');
  return url.toString();
}

export async function exchangeInstagramCode(env: InstagramEnv, code: string): Promise<string> {
  const form = new URLSearchParams({
    client_id: env.appId,
    client_secret: env.appSecret,
    grant_type: 'authorization_code',
    redirect_uri: env.redirectUri,
    code: code.replace(/#_$/, ''),
  });
  const res = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body: form });
  const body = await readJson(res);
  const token = body.access_token || body.data?.[0]?.access_token;
  if (!token) throw new InstagramApiError('Instagram no devolvió token', 400);
  return String(token);
}

export type InstagramLongLivedToken = { accessToken: string; expiresAt: string };

function toLongLived(body: Record<string, any>): InstagramLongLivedToken {
  const seconds = Number(body.expires_in) || 60 * 24 * 60 * 60;
  return {
    accessToken: String(body.access_token),
    expiresAt: new Date(Date.now() + seconds * 1000).toISOString(),
  };
}

export async function getLongLivedInstagramToken(
  env: InstagramEnv,
  shortToken: string
): Promise<InstagramLongLivedToken> {
  const url = new URL('https://graph.instagram.com/access_token');
  url.searchParams.set('grant_type', 'ig_exchange_token');
  url.searchParams.set('client_secret', env.appSecret);
  url.searchParams.set('access_token', shortToken);
  return toLongLived(await readJson(await fetch(url)));
}

export async function refreshInstagramToken(token: string): Promise<InstagramLongLivedToken> {
  const url = new URL('https://graph.instagram.com/refresh_access_token');
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', token);
  return toLongLived(await readJson(await fetch(url)));
}

export type InstagramAccount = {
  igUserId: string;
  username: string;
  name: string | null;
  profilePictureUrl: string | null;
};

export async function getInstagramAccount(token: string): Promise<InstagramAccount> {
  const url = new URL(`${GRAPH}/me`);
  url.searchParams.set('fields', 'user_id,username,name,profile_picture_url');
  url.searchParams.set('access_token', token);
  const body = await readJson(await fetch(url));
  return {
    igUserId: String(body.user_id || body.id),
    username: String(body.username || ''),
    name: body.name ? String(body.name) : null,
    profilePictureUrl: body.profile_picture_url ? String(body.profile_picture_url) : null,
  };
}

export async function subscribeInstagramWebhooks(token: string): Promise<void> {
  const url = new URL(`${GRAPH}/me/subscribed_apps`);
  url.searchParams.set('subscribed_fields', 'messages');
  url.searchParams.set('access_token', token);
  await readJson(await fetch(url, { method: 'POST' }));
}

export type InstagramProfile = { name: string | null; username: string | null };

export async function getInstagramProfile(token: string, igsid: string): Promise<InstagramProfile> {
  const url = new URL(`${GRAPH}/${encodeURIComponent(igsid)}`);
  url.searchParams.set('fields', 'name,username');
  url.searchParams.set('access_token', token);
  const body = await readJson(await fetch(url));
  return {
    name: body.name ? String(body.name) : null,
    username: body.username ? String(body.username) : null,
  };
}

export type InstagramOutgoing =
  | { kind: 'text'; text: string }
  | { kind: 'image' | 'audio' | 'video' | 'file'; url: string };

export const INSTAGRAM_TEXT_MAX = 1000;

export async function sendInstagramMessage(
  token: string,
  igUserId: string,
  igsid: string,
  outgoing: InstagramOutgoing
): Promise<string> {
  const message =
    outgoing.kind === 'text'
      ? { text: outgoing.text }
      : { attachment: { type: outgoing.kind, payload: { url: outgoing.url } } };
  const res = await fetch(`${GRAPH}/${encodeURIComponent(igUserId)}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: igsid }, message }),
  });
  const body = await readJson(res);
  return String(body.message_id || '');
}

/** Corta un texto largo en partes que entren en un DM. */
export function splitInstagramText(text: string, max: number = INSTAGRAM_TEXT_MAX): string[] {
  const parts: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    let cut = rest.lastIndexOf('\n', max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(' ', max);
    if (cut < max * 0.5) cut = max;
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) parts.push(rest);
  return parts;
}
