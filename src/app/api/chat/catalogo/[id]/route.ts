import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { validateCatalogoItem } from '@/lib/chat/catalogoVentas';
import { CATALOGO_DB_SELECT, mapCatalogoRow } from '@/lib/catalogo/catalogoImagenes';

import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const ctx = await getOrganizacionContext(session);
  if (!ctx) return null;
  return {
    supabase: getSupabaseAdmin() as unknown as SupabaseClient,
    usuarioId: ctx.usuarioId,
    organizacionId: ctx.organizacionId,
  };
}

type RouteContext = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const client = await requireUser();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const id = params.id;
    if (!id) return NextResponse.json({ error: 'El id es requerido' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const parsed = validateCatalogoItem(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { data, error } = await client.supabase
      .from('chat_catalogo')
      .update({ ...parsed.fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organizacion_id', client.organizacionId)
      .select(CATALOGO_DB_SELECT)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 });
    return NextResponse.json({ item: mapCatalogoRow(data as Record<string, unknown>) });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const client = await requireUser();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const id = params.id;
    if (!id) return NextResponse.json({ error: 'El id es requerido' }, { status: 400 });

    const { data, error } = await client.supabase
      .from('chat_catalogo')
      .delete()
      .eq('id', id)
      .eq('organizacion_id', client.organizacionId)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
