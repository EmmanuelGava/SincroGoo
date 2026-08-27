import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { validateCatalogoItem } from '@/lib/chat/catalogoVentas';

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const usuarioId = await getUsuarioIdFromSession();
  if (!usuarioId) return null;
  return {
    supabase: getSupabaseAdmin() as unknown as SupabaseClient,
    usuarioId,
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
      .eq('usuario_id', client.usuarioId)
      .select('id, tipo, nombre, precio, descripcion, imagen_url, archivo_url, categoria, stock, stock_minimo, created_at')
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 });
    return NextResponse.json({ item: data });
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
      .eq('usuario_id', client.usuarioId)
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
