import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import {
  actualizarCategoria,
  CategoriaConflictError,
  eliminarCategoria,
} from '@/lib/catalogo/catalogoCategoriasDb';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: { id: string } };

async function requireAdmin(id: string) {
  const ctx = await getOrganizacionContext();
  if (!ctx) return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  if (ctx.rol !== 'admin') {
    return {
      error: NextResponse.json({ error: 'Solo admin puede editar categorías' }, { status: 403 }),
    };
  }
  if (!UUID_RE.test(id)) {
    return { error: NextResponse.json({ error: 'Id inválido' }, { status: 400 }) };
  }
  return { ctx, supabase: getSupabaseAdmin() as unknown as SupabaseClient };
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const client = await requireAdmin(params.id);
    if ('error' in client) return client.error;

    const body = await req.json().catch(() => ({}));
    const categoria = await actualizarCategoria(
      client.supabase,
      client.ctx.organizacionId,
      params.id,
      body,
    );
    if (!categoria) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ categoria });
  } catch (error) {
    if (error instanceof CategoriaConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Error && !('code' in error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const { error: msg, status } = formatErrorResponse(error);
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const client = await requireAdmin(params.id);
    if ('error' in client) return client.error;

    const ok = await eliminarCategoria(client.supabase, client.ctx.organizacionId, params.id);
    if (!ok) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const { error: msg, status } = formatErrorResponse(error);
    return NextResponse.json({ error: msg }, { status });
  }
}
