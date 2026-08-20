type GoogleJwtFields = {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  sub?: string;
  error?: string;
};

const SKEW_MS = 30_000;

const cache = new Map<string, { token: GoogleJwtFields; expiresAt: number }>();
const inflight = new Map<string, Promise<GoogleJwtFields>>();

export function resetGoogleAccessTokenCache() {
  cache.clear();
  inflight.clear();
}

export function googleAccessTokenIsExpired(
  token: Pick<GoogleJwtFields, 'accessTokenExpires'>,
  now = Date.now()
): boolean {
  if (!token.accessTokenExpires) return false;
  return now >= token.accessTokenExpires - SKEW_MS;
}

function cacheKey(token: GoogleJwtFields): string {
  return String(token.sub || token.refreshToken || '');
}

export async function refreshGoogleAccessToken<T extends GoogleJwtFields>(token: T): Promise<T> {
  const key = cacheKey(token);
  if (!key || !token.refreshToken) {
    return { ...token, error: token.error || 'RefreshAccessTokenError' };
  }

  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt - SKEW_MS) {
    return {
      ...token,
      accessToken: cached.token.accessToken,
      refreshToken: cached.token.refreshToken ?? token.refreshToken,
      accessTokenExpires: cached.token.accessTokenExpires,
      error: undefined,
    };
  }

  const pending = inflight.get(key);
  if (pending) {
    const refreshed = await pending;
    return {
      ...token,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? token.refreshToken,
      accessTokenExpires: refreshed.accessTokenExpires,
      error: refreshed.error,
    };
  }

  const promise = doRefresh(token)
    .then((refreshed) => {
      if (refreshed.accessTokenExpires && !refreshed.error) {
        cache.set(key, { token: refreshed, expiresAt: refreshed.accessTokenExpires });
      }
      return refreshed;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  const refreshed = await promise;
  return {
    ...token,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? token.refreshToken,
    accessTokenExpires: refreshed.accessTokenExpires,
    error: refreshed.error,
  };
}

async function doRefresh(token: GoogleJwtFields): Promise<GoogleJwtFields> {
  try {
    console.log('[NextAuth] Renovando token de Google expirado');
    const response = await fetch('https://oauth2.googleapis.com/token', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken || '',
      }),
    });

    const refreshedTokens = await response.json();
    if (!response.ok) {
      throw refreshedTokens;
    }

    const expiresIn = Number(refreshedTokens.expires_in) || 3600;
    console.log('✅ [NextAuth] Token renovado exitosamente');
    return {
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + expiresIn * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error('❌ [NextAuth] Error al renovar token:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}
