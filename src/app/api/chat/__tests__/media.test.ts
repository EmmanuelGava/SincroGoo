import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/app/api/auth/[...nextauth]/options', () => ({
  authOptions: {},
}));

import { getServerSession } from 'next-auth/next';
import { GET } from '../media/route';

const mockSession = getServerSession as unknown as ReturnType<typeof vi.fn>;

describe('GET /api/chat/media', () => {
  beforeEach(() => {
    mockSession.mockReset();
    mockSession.mockResolvedValue({ user: { id: 'u1' } });
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abcd.supabase.co';
  });

  it('acepta chat-files del host de Supabase (no 400 por bucket)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('pdf', { status: 200, headers: { 'content-type': 'application/pdf' } })
    );
    const url = 'https://abcd.supabase.co/storage/v1/object/public/chat-files/u/in/a.pdf';
    const req = new NextRequest(`http://localhost/api/chat/media?url=${encodeURIComponent(url)}`);
    const res = await GET(req);
    expect(res.status).toBe(200);
    fetchSpy.mockRestore();
  });

  it('rechaza un host ajeno con 400', async () => {
    const url = 'https://evil.example/storage/v1/object/public/chat-files/a.pdf';
    const req = new NextRequest(`http://localhost/api/chat/media?url=${encodeURIComponent(url)}`);
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
