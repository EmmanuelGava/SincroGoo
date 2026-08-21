import { describe, expect, it } from 'vitest';
import { assertSafePublicHttpUrl, followSafeRedirects } from '../ssrfGuard';

describe('assertSafePublicHttpUrl', () => {
  it('rechaza localhost', async () => {
    await expect(assertSafePublicHttpUrl('http://localhost/secret')).rejects.toThrow(/ssrf|no permit/i);
    await expect(assertSafePublicHttpUrl('http://127.0.0.1/')).rejects.toThrow(/ssrf|no permit/i);
  });

  it('rechaza IPs privadas 10.x', async () => {
    await expect(assertSafePublicHttpUrl('http://10.0.0.8/internal')).rejects.toThrow(/ssrf|no permit/i);
  });

  it('rechaza file:// y esquemas que no son http(s)', async () => {
    await expect(assertSafePublicHttpUrl('file:///etc/passwd')).rejects.toThrow(/ssrf|no permit/i);
    await expect(assertSafePublicHttpUrl('ftp://example.com/x')).rejects.toThrow(/ssrf|no permit/i);
  });

  it('rechaza un hostname que resuelve a IP privada', async () => {
    await expect(
      assertSafePublicHttpUrl('https://evil.example', {
        lookup: async () => ['10.1.2.3'],
      })
    ).rejects.toThrow(/ssrf|no permit/i);
  });

  it('acepta https público', async () => {
    const url = await assertSafePublicHttpUrl('https://example.com/path', {
      lookup: async () => ['93.184.216.34'],
    });
    expect(url.href).toBe('https://example.com/path');
  });
});

describe('followSafeRedirects', () => {
  it('no sigue un redirect a IP privada', async () => {
    await expect(
      followSafeRedirects(new URL('https://example.com/go'), {
        lookup: async (hostname) => {
          if (hostname === 'example.com') return ['93.184.216.34'];
          return ['192.168.1.10'];
        },
        fetchHop: async () => ({
          status: 302,
          location: 'http://192.168.1.10/secret',
          contentType: null,
          body: null,
        }),
      })
    ).rejects.toThrow(/ssrf|no permit/i);
  });
});
