import { NextResponse } from 'next/server';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { getMlEnv } from '@/lib/mercadolibre/api';
import { disconnectMl, getMlConnectionByOrg } from '@/lib/mercadolibre/connection';

export async function GET() {
  const ctx = await getOrganizacionContext();
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const conn = await getMlConnectionByOrg(getSupabaseAdmin(), ctx.organizacionId);
  return NextResponse.json({
    configurado: Boolean(getMlEnv()),
    conectado: Boolean(conn),
    nickname: conn?.nickname || null,
    renovable: Boolean(conn?.refreshToken),
    es_admin: ctx.rol === 'admin',
  });
}

export async function DELETE() {
  const ctx = await getOrganizacionContext();
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (ctx.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores pueden desconectar Mercado Libre' }, { status: 403 });
  }
  await disconnectMl(getSupabaseAdmin(), ctx.organizacionId);
  return NextResponse.json({ success: true });
}
