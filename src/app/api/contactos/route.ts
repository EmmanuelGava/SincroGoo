import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { contactoWriteFields, isUniquePhoneViolation } from '@/lib/contactos/contactoWrite';

async function requireContactos() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const usuarioId = await getUsuarioIdFromSession();
  if (!usuarioId) return null;
  return {
    supabase: getSupabaseAdmin() as unknown as SupabaseClient,
    usuarioId,
  };
}

export async function GET(req: NextRequest) {
  try {
    const client = await requireContactos();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const q = req.nextUrl.searchParams.get('q')?.trim() || '';
    const etiqueta = req.nextUrl.searchParams.get('etiqueta')?.trim().toLowerCase() || '';
    const { data, error } = await client.supabase.rpc('buscar_contactos', {
      p_usuario: client.usuarioId,
      p_q: q,
      p_etiqueta: etiqueta || null,
    });
    if (error) throw error;

    return NextResponse.json(
      { contactos: data || [] },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ contactos: [], error: errorMessage }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const client = await requireContactos();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = contactoWriteFields(body, { requireNombre: true, partial: false });
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { data, error } = await client.supabase
      .from('contactos')
      .insert({
        usuario_id: client.usuarioId,
        ...parsed.fields,
      })
      .select('*')
      .single();

    if (error) {
      if (isUniquePhoneViolation(error)) {
        return NextResponse.json(
          { error: 'Ya existe un contacto con ese teléfono' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ contacto: data }, { status: 201 });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
