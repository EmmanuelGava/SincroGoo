import { NextRequest, NextResponse } from 'next/server';
import { normalizeTelegramMessage, MensajeTelegramNormalizado } from '../handlers/telegram-handler';
import { supabase } from '@/lib/supabase/client';

// Endpoint para recibir webhooks de Telegram
export async function POST(req: NextRequest) {
  try {
    // 1. Leer el body del webhook
    const body = await req.json();
    console.log('📩 Webhook recibido de Telegram:', JSON.stringify(body));

    // 2. Normalizar el mensaje usando el handler
    const mensajeNormalizado: MensajeTelegramNormalizado | null = normalizeTelegramMessage(body);
    if (!mensajeNormalizado) {
      return NextResponse.json({ error: 'No se pudo normalizar el mensaje' }, { status: 400 });
    }

    // 3. Buscar o crear la conversación (sin contenido)
    const conversacion = {
      lead_id: null,
      servicio_origen: 'telegram',
      tipo: 'entrante',
      remitente: mensajeNormalizado.remitente_username || mensajeNormalizado.remitente_id,
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

    // 4. Guardar el mensaje en mensajes_conversacion
    const mensaje = {
      conversacion_id: conversacionInsertada.id,
      tipo: 'texto',
      contenido: mensajeNormalizado.contenido,
      remitente: mensajeNormalizado.remitente_username || mensajeNormalizado.remitente_id,
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