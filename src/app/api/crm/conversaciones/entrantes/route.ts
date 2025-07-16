import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

export async function GET(req: NextRequest) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 1. Obtener conversaciones sin lead asociado con su último mensaje
    const { data: conversaciones, error } = await supabase
      .from('conversaciones')
      .select(`
        id,
        remitente,
        servicio_origen,
        fecha_mensaje,
        lead_id,
        mensajes_conversacion!inner(
          contenido,
          fecha_mensaje,
          tipo
        )
      `)
      .is('lead_id', null)
      .order('fecha_mensaje', { ascending: false });

    if (error) throw error;

    // Procesar para obtener solo el último mensaje por conversación
    const mensajes = conversaciones?.map(conv => ({
      id: conv.id,
      remitente: conv.remitente,
      servicio_origen: conv.servicio_origen,
      fecha_mensaje: conv.fecha_mensaje,
      ultimo_mensaje: conv.mensajes_conversacion?.[0]?.contenido || 'Sin mensajes'
    })) || [];

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

    // Obtener remitente y servicio_origen de la conversación original
    const { data: conversacionOriginal, error: errorConsulta } = await supabase
      .from('conversaciones')
      .select('remitente, servicio_origen')
      .eq('id', conversationId)
      .single();
    if (errorConsulta || !conversacionOriginal) {
      return NextResponse.json({ error: 'No se pudo obtener la conversación original' }, { status: 400 });
    }

    // Actualizar TODAS las conversaciones de ese remitente y canal
    const { error } = await supabase
      .from('conversaciones')
      .update({ lead_id: leadId })
      .eq('remitente', conversacionOriginal.remitente)
      .eq('servicio_origen', conversacionOriginal.servicio_origen);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error detallado al asociar conversación:', JSON.stringify(error, null, 2));
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
} 