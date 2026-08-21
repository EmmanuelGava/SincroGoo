import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/app/api/auth/[...nextauth]/options', () => ({
  authOptions: {},
}));

vi.mock('@/lib/chat/linkPreviewResolve', () => ({
  resolveLinkPreview: vi.fn(),
  previewImageProxyPath: (url: string) =>
    `/api/chat/link-preview/image?url=${encodeURIComponent(url)}`,
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { getServerSession } from 'next-auth/next';
import { resolveLinkPreview } from '@/lib/chat/linkPreviewResolve';
import { GET } from '../link-preview/route';

const mockSession = getServerSession as unknown as ReturnType<typeof vi.fn>;
const mockResolve = resolveLinkPreview as unknown as ReturnType<typeof vi.fn>;

describe('GET /api/chat/link-preview', () => {
  beforeEach(() => {
    mockSession.mockReset();
    mockResolve.mockReset();
  });

  it('responde 401 sin sesión', async () => {
    mockSession.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/chat/link-preview?url=https://example.com');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('responde 400 si la URL es inválida', async () => {
    mockSession.mockResolvedValue({ user: { id: 'u1' } });
    const req = new NextRequest('http://localhost/api/chat/link-preview?url=not-a-url');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('responde 200 en cache hit', async () => {
    mockSession.mockResolvedValue({ user: { id: 'u1' } });
    mockResolve.mockResolvedValue({
      title: 'Cached',
      description: 'd',
      image: '/api/chat/link-preview/image?url=https%3A%2F%2Fcdn.example.com%2Fog.jpg',
      siteName: 'Example',
      url: 'https://example.com',
    });
    const req = new NextRequest('http://localhost/api/chat/link-preview?url=https://example.com');
    const res = await GET(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ title: 'Cached', url: 'https://example.com' });
  });

  it('no sigue / no cachea una IP privada (sin tarjeta)', async () => {
    mockSession.mockResolvedValue({ user: { id: 'u1' } });
    mockResolve.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/chat/link-preview?url=http://10.0.0.8/');
    const res = await GET(req);
    expect(res.status).toBe(204);
  });
});
