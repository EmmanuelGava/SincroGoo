import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/app/api/auth/[...nextauth]/options', () => ({
  authOptions: {},
}));

vi.mock('@/lib/supabase/client', () => ({
  getServerSession: vi.fn(),
  getUsuarioIdFromSession: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}));

import { getServerSession } from 'next-auth/next';
import { getUsuarioIdFromSession } from '@/lib/supabase/client';
import { GET, POST } from '../route';

const mockSession = getServerSession as unknown as ReturnType<typeof vi.fn>;
const mockUsuario = getUsuarioIdFromSession as unknown as ReturnType<typeof vi.fn>;

describe('POST /api/chat/respuestas-rapidas', () => {
  beforeEach(() => {
    mockSession.mockReset();
    mockUsuario.mockReset();
  });

  it('responde 401 sin sesión', async () => {
    mockSession.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/chat/respuestas-rapidas', {
      method: 'POST',
      body: JSON.stringify({ atajo: 'hola', texto: 'Hola' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('responde 400 si el atajo es corto', async () => {
    mockSession.mockResolvedValue({ user: { id: 'u1' } });
    mockUsuario.mockResolvedValue('uuid-1');
    const req = new NextRequest('http://localhost/api/chat/respuestas-rapidas', {
      method: 'POST',
      body: JSON.stringify({ atajo: 'h', texto: 'Hola' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/chat/respuestas-rapidas', () => {
  it('responde 401 sin sesión', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
