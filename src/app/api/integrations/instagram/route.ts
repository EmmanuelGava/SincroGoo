import { NextResponse } from 'next/server';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { getInstagramEnv } from '@/lib/instagram/api';
import { disconnectInstagram, getInstagramConnectionByOrg } from '@/lib/instagram/connection';

export async function GET() {
  const ctx = await getOrganizacionContext();
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const conn = await getInstagramConnectionByOrg(getSupabaseAdmin(), ctx.organizacionId);
  return NextResponse.json({
    configurado: Boolean(getInstagramEnv() && process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN),
    conectado: Boolean(conn),
    username: conn?.username || null,
    token_expires_at: conn?.tokenExpiresAt || null,
    es_admin: ctx.rol === 'admin',
  });
}

export async function DELETE() {
  const ctx = await getOrganizacionContext();
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (ctx.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores pueden desconectar Instagram' }, { status: 403 });
  }
  await disconnectInstagram(getSupabaseAdmin(), ctx.organizacionId);
  return NextResponse.json({ success: true });
}
