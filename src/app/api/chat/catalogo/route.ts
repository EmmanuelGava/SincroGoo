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

export async function GET() {
  try {
    const client = await requireUser();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data, error } = await client.supabase
      .from('chat_catalogo')
      .select('id, tipo, nombre, precio, descripcion, imagen_url, archivo_url, categoria, stock, created_at')
      .eq('usuario_id', client.usuarioId)
      .order('nombre', { ascending: true });

    if (error) throw error;
    return NextResponse.json(
      { items: data || [] },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ items: [], error: errorMessage }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const client = await requireUser();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = validateCatalogoItem(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { data, error } = await client.supabase
      .from('chat_catalogo')
      .insert({ usuario_id: client.usuarioId, ...parsed.fields })
      .select('id, tipo, nombre, precio, descripcion, imagen_url, archivo_url, categoria, stock, created_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
