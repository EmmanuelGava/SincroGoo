const API = 'https://api.mercadolibre.com';

export type MlEnv = {
  appId: string;
  clientSecret: string;
  redirectUri: string;
  authDomain: string;
};

export function getMlEnv(): MlEnv | null {
  const appId = process.env.MERCADOLIBRE_APP_ID || '';
  const clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET || '';
  const base = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  if (!appId || !clientSecret || !base) return null;
  return {
    appId,
    clientSecret,
    redirectUri: `${base}/api/integrations/mercadolibre/callback`,
    authDomain: process.env.MERCADOLIBRE_AUTH_DOMAIN || 'auth.mercadolibre.com.ar',
  };
}

export class MlApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'MlApiError';
  }
}

async function readJson(res: Response): Promise<Record<string, any>> {
  const body = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) {
    const message = String(body.message || body.error_description || body.error || `HTTP ${res.status}`);
    throw new MlApiError(message, res.status);
  }
  return body;
}

export function buildMlAuthorizeUrl(env: MlEnv, state: string): string {
  const url = new URL(`https://${env.authDomain}/authorization`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', env.appId);
  url.searchParams.set('redirect_uri', env.redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}

export type MlTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  userId: string;
};

async function tokenRequest(params: Record<string, string>): Promise<MlTokens> {
  const res = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(params),
  });
  const body = await readJson(res);
  const seconds = Number(body.expires_in) || 6 * 60 * 60;
  return {
    accessToken: String(body.access_token),
    refreshToken: body.refresh_token ? String(body.refresh_token) : null,
    expiresAt: new Date(Date.now() + seconds * 1000).toISOString(),
    userId: String(body.user_id || ''),
  };
}

export function exchangeMlCode(env: MlEnv, code: string): Promise<MlTokens> {
  return tokenRequest({
    grant_type: 'authorization_code',
    client_id: env.appId,
    client_secret: env.clientSecret,
    code,
    redirect_uri: env.redirectUri,
  });
}

export function refreshMlToken(env: MlEnv, refreshToken: string): Promise<MlTokens> {
  return tokenRequest({
    grant_type: 'refresh_token',
    client_id: env.appId,
    client_secret: env.clientSecret,
    refresh_token: refreshToken,
  });
}

async function get(path: string, token?: string): Promise<Record<string, any>> {
  const res = await fetch(`${API}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return readJson(res);
}

export type MlSeller = { id: string; nickname: string; siteId: string };

export async function getMlMe(token: string): Promise<MlSeller> {
  const body = await get('/users/me', token);
  return { id: String(body.id), nickname: String(body.nickname || ''), siteId: String(body.site_id || '') };
}

export type MlQuestion = {
  id: string;
  sellerId: string;
  itemId: string;
  buyerId: string;
  text: string;
  status: string;
  dateCreated: string;
  answer: { text: string; dateCreated: string } | null;
};

export async function getMlQuestion(token: string, questionId: string): Promise<MlQuestion> {
  const body = await get(`/questions/${encodeURIComponent(questionId)}?api_version=4`, token);
  const answer = body.answer && typeof body.answer === 'object' && body.answer.text
    ? { text: String(body.answer.text), dateCreated: String(body.answer.date_created || new Date().toISOString()) }
    : null;
  return {
    id: String(body.id),
    sellerId: String(body.seller_id),
    itemId: String(body.item_id),
    buyerId: String(body.from?.id ?? ''),
    text: String(body.text || ''),
    status: String(body.status || ''),
    dateCreated: String(body.date_created || new Date().toISOString()),
    answer,
  };
}

export type MlItem = { title: string; permalink: string | null; thumbnail: string | null; price: number | null };

export async function getMlItem(token: string, itemId: string): Promise<MlItem> {
  const body = await get(`/items/${encodeURIComponent(itemId)}?attributes=title,permalink,thumbnail,price`, token);
  return {
    title: String(body.title || ''),
    permalink: body.permalink ? String(body.permalink) : null,
    thumbnail: body.thumbnail ? String(body.thumbnail) : null,
    price: typeof body.price === 'number' ? body.price : null,
  };
}

export async function getMlNickname(userId: string): Promise<string | null> {
  try {
    const body = await get(`/users/${encodeURIComponent(userId)}`);
    return body.nickname ? String(body.nickname) : null;
  } catch {
    return null;
  }
}

export async function answerMlQuestion(token: string, questionId: string, text: string): Promise<void> {
  const res = await fetch(`${API}/answers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ question_id: Number(questionId), text }),
  });
  await readJson(res);
}
