import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { missingDefaultRespuestas, validateRespuestaRapida } from '@/lib/chat/respuestasRapidas';

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

function uniqueAtajo(error: { code?: string } | null | undefined) {
  return error?.code === '23505';
}

export async function GET() {
  try {
    const client = await requireUser();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data, error } = await client.supabase
      .from('chat_respuestas_rapidas')
      .select('id, atajo, texto, created_at, updated_at')
      .eq('usuario_id', client.usuarioId)
      .order('atajo', { ascending: true });

    if (error) throw error;

    let rows = data || [];
    const missing = missingDefaultRespuestas(rows.map((row: { atajo: string }) => row.atajo));
    if (missing.length > 0) {
      const { error: seedError } = await client.supabase
        .from('chat_respuestas_rapidas')
        .insert(
          missing.map((item) => ({
            usuario_id: client.usuarioId,
            atajo: item.atajo,
            texto: item.texto,
          }))
        );
      if (seedError && !uniqueAtajo(seedError)) throw seedError;

      const { data: seeded, error: reloadError } = await client.supabase
        .from('chat_respuestas_rapidas')
        .select('id, atajo, texto, created_at, updated_at')
        .eq('usuario_id', client.usuarioId)
        .order('atajo', { ascending: true });
      if (reloadError) throw reloadError;
      rows = seeded || [];
    }

    return NextResponse.json(
      { respuestas: rows },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ respuestas: [], error: errorMessage }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const client = await requireUser();
    if (!client) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = validateRespuestaRapida(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { data, error } = await client.supabase
      .from('chat_respuestas_rapidas')
      .insert({
        usuario_id: client.usuarioId,
        atajo: parsed.atajo,
        texto: parsed.texto,
      })
      .select('id, atajo, texto, created_at, updated_at')
      .single();

    if (error) {
      if (uniqueAtajo(error)) {
        return NextResponse.json({ error: 'Ya existe una respuesta con ese atajo' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ respuesta: data }, { status: 201 });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
