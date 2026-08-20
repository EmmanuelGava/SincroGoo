import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  googleAccessTokenIsExpired,
  refreshGoogleAccessToken,
  resetGoogleAccessTokenCache,
} from '../googleTokenRefresh';

describe('googleAccessTokenIsExpired', () => {
  it('no está vencido si falta accessTokenExpires', () => {
    expect(googleAccessTokenIsExpired({}, 1_000_000)).toBe(false);
  });

  it('está vencido cuando ya pasó accessTokenExpires', () => {
    expect(googleAccessTokenIsExpired({ accessTokenExpires: 1_000 }, 2_000)).toBe(true);
  });

  it('está vigente si falta más de 30s', () => {
    expect(googleAccessTokenIsExpired({ accessTokenExpires: 100_000 }, 50_000)).toBe(false);
  });
});

describe('refreshGoogleAccessToken', () => {
  beforeEach(() => {
    resetGoogleAccessTokenCache();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetGoogleAccessTokenCache();
  });

  it('reutiliza el token fresco y no vuelve a llamar a Google', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'nuevo', expires_in: 3600, refresh_token: 'r2' }),
    } as Response);

    const expired = {
      sub: 'user-1',
      accessToken: 'viejo',
      refreshToken: 'r1',
      accessTokenExpires: 1,
    };

    const first = await refreshGoogleAccessToken(expired);
    const second = await refreshGoogleAccessToken({ ...expired, accessToken: 'viejo' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.accessToken).toBe('nuevo');
    expect(second.accessToken).toBe('nuevo');
  });

  it('comparte una sola renovación si hay llamadas concurrentes', async () => {
    const fetchMock = vi.mocked(fetch);
    let resolveJson: (value: unknown) => void = () => {};
    const jsonPromise = new Promise((resolve) => {
      resolveJson = resolve;
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => jsonPromise,
    } as Response);

    const expired = {
      sub: 'user-2',
      accessToken: 'viejo',
      refreshToken: 'r1',
      accessTokenExpires: 1,
    };

    const pending = Promise.all([
      refreshGoogleAccessToken(expired),
      refreshGoogleAccessToken(expired),
    ]);
    resolveJson({ access_token: 'nuevo', expires_in: 3600 });
    const [a, b] = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a.accessToken).toBe('nuevo');
    expect(b.accessToken).toBe('nuevo');
  });
});
