import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { v4 as uuidv4 } from 'uuid';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';

type RouteContext = { params: { id: string } };

type NotaRow = {
  id: string;
  contenido: string;
  fecha_mensaje: string;
  tipo?: string | null;
  metadata?: Record<string, unknown> | null;
};

type AutorInfo = { id: string; nombre: string };

async function resolveAutores(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  rows: NotaRow[]
): Promise<Map<string, AutorInfo>> {
  const ids = new Set<string>();
  for (const row of rows) {
    const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const autorId = meta.autor_usuario_id;
    if (typeof autorId === 'string' && autorId) ids.add(autorId);
  }
  if (ids.size === 0) return new Map();

  const { data } = await supabase
    .from('usuarios')
    .select('id, nombre')
    .in('id', [...ids]);

  return new Map((data || []).map((u) => [u.id, { id: u.id, nombre: u.nombre || 'Usuario' }]));
}

function isInternalNoteRow(row: NotaRow): boolean {
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return (
    meta.internal_note === true
    || meta.direction === 'internal'
    || String(row.tipo || '').toLowerCase() === 'nota_interna'
  );
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const ctx = await getOrganizacionContext(session);
    if (!ctx) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const { data: convCheck } = await supabase
      .from('conversaciones')
      .select('id')
      .eq('id', params.id)
      .eq('organizacion_id', ctx.organizacionId)
      .maybeSingle();
    if (!convCheck) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('mensajes_conversacion')
      .select('id, contenido, fecha_mensaje, tipo, metadata')
      .eq('conversacion_id', params.id)
      .order('fecha_mensaje', { ascending: false })
      .limit(50);

    if (error) throw error;

    const notaRows = ((data || []) as NotaRow[]).filter(isInternalNoteRow);
    const autores = await resolveAutores(supabase, notaRows);

    const notas = notaRows.map((row) => {
      const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
      const autorId = typeof meta.autor_usuario_id === 'string' ? meta.autor_usuario_id : null;
      const autor = autorId ? autores.get(autorId) : null;
      return {
        id: row.id,
        contenido: row.contenido,
        fecha_mensaje: row.fecha_mensaje,
        autor_nombre: autor?.nombre || null,
        autor_usuario_id: autorId,
      };
    });

    return NextResponse.json({ notas });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await getUsuarioIdFromSession();
    const ctx = await getOrganizacionContext(session);
    if (!ctx) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const contenido = String(body.contenido || '').trim();
    const leadId = body.lead_id ? String(body.lead_id) : null;

    if (!contenido) {
      return NextResponse.json({ error: 'El contenido es requerido' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const conversacionId = params.id;

    const { data: conv, error: convError } = await supabase
      .from('conversaciones')
      .select('id, lead_id, servicio_origen')
      .eq('id', conversacionId)
      .eq('organizacion_id', ctx.organizacionId)
      .maybeSingle();

    if (convError || !conv) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const messageId = uuidv4();
    const resolvedLeadId = leadId || conv.lead_id || null;

    const { error: insertError } = await supabase.from('mensajes_conversacion').insert({
      id: messageId,
      conversacion_id: conversacionId,
      tipo: 'nota_interna',
      contenido,
      remitente: 'yo',
      fecha_mensaje: now,
      canal: conv.servicio_origen || 'whatsapp',
      usuario_id: session.user.id,
      metadata: {
        internal_note: true,
        direction: 'internal',
        estado_envio: 'nota',
        pinned_header: true,
        autor_usuario_id: ctx.usuarioId,
      },
    });

    if (insertError) throw insertError;

    if (resolvedLeadId) {
      await supabase.from('interacciones_lead').insert({
        lead_id: resolvedLeadId,
        tipo: 'nota_interna',
        descripcion: contenido,
        fecha: now,
        canal: 'interno',
        metadata: { conversacion_id: conversacionId, mensaje_id: messageId },
      });
    }

    return NextResponse.json({
      success: true,
      nota: {
        id: messageId,
        contenido,
        fecha_mensaje: now,
        autor_usuario_id: ctx.usuarioId,
      },
    });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const notaId = req.nextUrl.searchParams.get('nota_id');
    if (!notaId) {
      return NextResponse.json({ error: 'nota_id requerido' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: row, error: fetchError } = await supabase
      .from('mensajes_conversacion')
      .select('id, tipo, metadata')
      .eq('id', notaId)
      .eq('conversacion_id', params.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!row || !isInternalNoteRow(row as NotaRow)) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('mensajes_conversacion')
      .delete()
      .eq('id', notaId)
      .eq('conversacion_id', params.id);

    if (deleteError) throw deleteError;

    await supabase
      .from('interacciones_lead')
      .delete()
      .filter('metadata->>mensaje_id', 'eq', notaId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
