import { NextRequest, NextResponse } from 'next/server';
import { normalizeTelegramMessage, MensajeTelegramNormalizado } from '../handlers/telegram-handler';
import { getSupabaseAdmin } from '@/lib/supabase/client';

// Endpoint para recibir webhooks de Telegram
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    // 1. Leer el body del webhook
    const body = await req.json();
    console.log('📩 Webhook recibido de Telegram:', JSON.stringify(body));

    // 2. Normalizar el mensaje usando el handler
    const mensajeNormalizado: MensajeTelegramNormalizado | null = normalizeTelegramMessage(body);
    if (!mensajeNormalizado) {
      return NextResponse.json({ error: 'No se pudo normalizar el mensaje' }, { status: 400 });
    }

    // Usar siempre el remitente_id numérico para agrupar correctamente
    const remitenteId = mensajeNormalizado.remitente_id;

    // 3. Buscar primero una conversación asociada a un lead (lead_id no null)
    let { data: conversacionExistente } = await supabase
      .from('conversaciones')
      .select('id, lead_id')
      .eq('remitente', remitenteId)
      .eq('servicio_origen', 'telegram')
      .not('lead_id', 'is', null)
      .order('fecha_mensaje', { ascending: false })
      .limit(1)
      .single();

    // Si no existe, buscar una conversación activa sin lead asociado
    if (!conversacionExistente) {
      const res = await supabase
        .from('conversaciones')
        .select('id, lead_id')
        .eq('remitente', remitenteId)
        .eq('servicio_origen', 'telegram')
        .is('lead_id', null)
        .order('fecha_mensaje', { ascending: false })
        .limit(1)
        .single();
      conversacionExistente = res.data;
    }

    let conversacionId;
    if (conversacionExistente) {
      conversacionId = conversacionExistente.id;
      // Actualizar la fecha_mensaje de la conversación
      await supabase.from('conversaciones').update({ fecha_mensaje: mensajeNormalizado.fecha_mensaje }).eq('id', conversacionId);
    } else {
      // Crear nueva conversación
      const conversacion = {
        lead_id: null,
        servicio_origen: 'telegram',
        tipo: 'entrante',
        remitente: remitenteId, // SIEMPRE el id numérico
        fecha_mensaje: mensajeNormalizado.fecha_mensaje,
        metadata: mensajeNormalizado.metadata || {},
      };
      const { data: conversacionInsertada, error: errorConversacion } = await supabase
        .from('conversaciones')
        .insert(conversacion)
        .select('id')
        .single();
      if (errorConversacion) {
        console.error('Error guardando conversación:', errorConversacion);
        return NextResponse.json({ error: 'Error guardando conversación' }, { status: 500 });
      }
      conversacionId = conversacionInsertada.id;
    }

    // 4. Guardar el mensaje en mensajes_conversacion
    const mensaje = {
      conversacion_id: conversacionId,
      tipo: 'texto',
      contenido: mensajeNormalizado.contenido,
      remitente: remitenteId, // SIEMPRE el id numérico
      fecha_mensaje: mensajeNormalizado.fecha_mensaje,
      canal: 'telegram',
      metadata: mensajeNormalizado.metadata || {},
      usuario_id: null,
    };
    const { error: errorMensaje } = await supabase
      .from('mensajes_conversacion')
      .insert(mensaje);
    if (errorMensaje) {
      console.error('Error guardando mensaje:', errorMensaje);
      return NextResponse.json({ error: 'Error guardando mensaje' }, { status: 500 });
    }

    // 5. Responder a Telegram
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error en webhook de Telegram:', error);
    return NextResponse.json({ error: 'Error procesando el webhook' }, { status: 500 });
  }
} 