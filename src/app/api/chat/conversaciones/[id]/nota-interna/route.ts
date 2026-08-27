import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { v4 as uuidv4 } from 'uuid';
import { notifyInboxRealtime } from '@/lib/chat/notifyInbox';

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuarioId = await getUsuarioIdFromSession();
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
      },
    });

    if (insertError) throw insertError;

    await supabase
      .from('conversaciones')
      .update({ fecha_mensaje: now })
      .eq('id', conversacionId);

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

    await notifyInboxRealtime(session.user.id, {
      conversacionId,
      platform: conv.servicio_origen || 'whatsapp',
      preview: `[Nota] ${contenido.slice(0, 80)}`,
      direction: 'outgoing',
    });

    return NextResponse.json({
      success: true,
      mensaje: {
        id: messageId,
        conversacion_id: conversacionId,
        contenido,
        tipo: 'nota_interna',
        fecha_mensaje: now,
        metadata: { internal_note: true, direction: 'internal' },
      },
    });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
