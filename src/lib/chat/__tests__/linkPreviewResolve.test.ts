import { describe, expect, it, vi } from 'vitest';
import { resolveLinkPreview } from '../linkPreviewResolve';

function htmlResponse(html: string) {
  return {
    ok: true as const,
    html,
    finalUrl: new URL('https://example.com/page'),
    contentType: 'text/html',
  };
}

describe('resolveLinkPreview', () => {
  it('en cache hit no vencido devuelve el JSON cacheado (image como proxy same-origin)', async () => {
    const cacheGet = vi.fn().mockResolvedValue({
      url: 'https://example.com/page',
      title: 'Cached',
      description: 'desc',
      image_url: 'https://cdn.example.com/og.jpg',
      site_name: 'Example',
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
    const cacheSet = vi.fn();
    const fetchHtml = vi.fn();

    const result = await resolveLinkPreview('https://example.com/page', {
      cacheGet,
      cacheSet,
      fetchHtml,
    });

    expect(result).toEqual({
      title: 'Cached',
      description: 'desc',
      image: '/api/chat/link-preview/image?url=' + encodeURIComponent('https://cdn.example.com/og.jpg'),
      siteName: 'Example',
      url: 'https://example.com/page',
    });
    expect(fetchHtml).not.toHaveBeenCalled();
    expect(cacheSet).not.toHaveBeenCalled();
  });

  it('HTML ok sin OG cachea title = hostname y sin imagen', async () => {
    const cacheGet = vi.fn().mockResolvedValue(null);
    const cacheSet = vi.fn();
    const result = await resolveLinkPreview('https://example.com/page', {
      cacheGet,
      cacheSet,
      fetchHtml: async () => htmlResponse('<html><head></head><body>ok</body></html>'),
      assertSafeUrl: async (raw) => new URL(raw),
    });

    expect(result?.title).toBe('example.com');
    expect(result?.image).toBeNull();
    expect(cacheSet).toHaveBeenCalledOnce();
    const saved = cacheSet.mock.calls[0][0];
    expect(saved.title).toBe('example.com');
    expect(saved.image_url).toBeNull();
  });

  it('timeout / no-HTML / error de red no cachea 7 días y no hay tarjeta', async () => {
    const cacheGet = vi.fn().mockResolvedValue(null);
    const cacheSet = vi.fn();
    const result = await resolveLinkPreview('https://example.com/page', {
      cacheGet,
      cacheSet,
      fetchHtml: async () => ({ ok: false, reason: 'timeout' }),
      assertSafeUrl: async (raw) => new URL(raw),
    });
    expect(result).toBeNull();
    expect(cacheSet).not.toHaveBeenCalled();
  });

  it('SSRF no cachea y no hay tarjeta', async () => {
    const cacheGet = vi.fn().mockResolvedValue(null);
    const cacheSet = vi.fn();
    const result = await resolveLinkPreview('http://127.0.0.1/', {
      cacheGet,
      cacheSet,
      fetchHtml: async () => ({ ok: false, reason: 'ssrf' }),
      assertSafeUrl: async () => {
        throw new Error('ssrf');
      },
    });
    expect(result).toBeNull();
    expect(cacheSet).not.toHaveBeenCalled();
  });
});
