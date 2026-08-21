import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { validateRespuestaRapida } from '@/lib/chat/respuestasRapidas';

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
    if (!id) {
      return NextResponse.json({ error: 'El id es requerido' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = validateRespuestaRapida(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { data, error } = await client.supabase
      .from('chat_respuestas_rapidas')
      .update({
        atajo: parsed.atajo,
        texto: parsed.texto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('usuario_id', client.usuarioId)
      .select('id, atajo, texto, created_at, updated_at')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe una respuesta con ese atajo' }, { status: 409 });
      }
      throw error;
    }
    if (!data) {
      return NextResponse.json({ error: 'Respuesta no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ respuesta: data });
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
    if (!id) {
      return NextResponse.json({ error: 'El id es requerido' }, { status: 400 });
    }

    const { data, error } = await client.supabase
      .from('chat_respuestas_rapidas')
      .delete()
      .eq('id', id)
      .eq('usuario_id', client.usuarioId)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Respuesta no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
