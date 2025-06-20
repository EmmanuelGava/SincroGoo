import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

export async function GET(req: NextRequest) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener todas las conversaciones sin lead asociada
    const { data: conversaciones, error: errorConversaciones } = await supabase
      .from('conversaciones')
      .select('id, remitente, fecha_mensaje, metadata, servicio_origen')
      .is('lead_id', null)
      .order('fecha_mensaje', { ascending: false });
    if (errorConversaciones) throw errorConversaciones;

    // Para cada conversación, obtener el último mensaje
    const mensajesPromises = conversaciones.map(async (conv) => {
      const { data: mensaje, error: errorMensaje } = await supabase
        .from('mensajes_conversacion')
        .select('contenido, fecha_mensaje')
        .eq('conversacion_id', conv.id)
        .order('fecha_mensaje', { ascending: false })
        .limit(1)
        .single();
      return {
        id: conv.id,
        remitente: conv.remitente,
        contenido: mensaje?.contenido || '',
        fecha_mensaje: mensaje?.fecha_mensaje || conv.fecha_mensaje,
        metadata: conv.metadata,
        servicio_origen: conv.servicio_origen,
      };
    });
    const mensajes = await Promise.all(mensajesPromises);

    return NextResponse.json({ mensajes }, { status: 200 });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ mensajes: [], error: errorMessage }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

    const { error } = await supabase.from('conversaciones').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { conversationId, leadId } = await req.json();
    if (!conversationId || !leadId) {
      return NextResponse.json({ error: 'Faltan conversationId o leadId' }, { status: 400 });
    }

    const { error } = await supabase
      .from('conversaciones')
      .update({ lead_id: leadId })
      .eq('id', conversationId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error detallado al asociar conversación:', JSON.stringify(error, null, 2));
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
} 