import { NextRequest, NextResponse } from 'next/server';
import { normalizeTelegramMessage, MensajeTelegramNormalizado } from '../handlers/telegram-handler';
import { supabase } from '@/lib/supabase/client';

// Endpoint para recibir webhooks de Telegram
export async function POST(req: NextRequest) {
  try {
    // 1. Leer el body del webhook
    const body = await req.json();

    // 2. Normalizar el mensaje usando el handler
    const mensajeNormalizado: MensajeTelegramNormalizado | null = normalizeTelegramMessage(body);
    if (!mensajeNormalizado) {
      return NextResponse.json({ error: 'No se pudo normalizar el mensaje' }, { status: 400 });
    }

    // 3. Buscar o crear el lead correspondiente por telegram_id
    const telegramId = mensajeNormalizado.remitente_id;
    let leadId: string | null = null;

    // Buscar lead por telegram_id
    const { data: leads, error: errorLead } = await supabase
      .from('leads')
      .select('id')
      .eq('telegram_id', telegramId)
      .limit(1);

    if (errorLead) {
      console.error('Error buscando lead:', errorLead);
      return NextResponse.json({ error: 'Error buscando lead' }, { status: 500 });
    }

    if (leads && leads.length > 0) {
      leadId = leads[0].id;
    } else {
      // Si no existe, crear el lead
      const nuevoLead = {
        nombre: mensajeNormalizado.remitente_nombre || 'Sin nombre',
        telegram_id: telegramId,
        telegram_username: mensajeNormalizado.remitente_username || null,
        estado_id: 'nuevo', // Ajusta según tu lógica de estados
        notas: 'Lead creado automáticamente desde Telegram',
      };
      const { data: leadCreado, error: errorCreando } = await supabase
        .from('leads')
        .insert(nuevoLead)
        .select('id')
        .single();
      if (errorCreando) {
        console.error('Error creando lead:', errorCreando);
        return NextResponse.json({ error: 'Error creando lead' }, { status: 500 });
      }
      leadId = leadCreado.id;
    }

    // 4. Guardar la conversación en la base de datos
    const conversacion = {
      lead_id: leadId,
      servicio_origen: 'telegram',
      contenido: mensajeNormalizado.contenido,
      tipo: 'entrante',
      remitente: mensajeNormalizado.remitente_username || mensajeNormalizado.remitente_id,
      fecha_mensaje: mensajeNormalizado.fecha_mensaje,
      metadata: mensajeNormalizado.metadata || {},
    };
    const { error: errorConversacion } = await supabase
      .from('conversaciones')
      .insert(conversacion);
    if (errorConversacion) {
      console.error('Error guardando conversación:', errorConversacion);
      return NextResponse.json({ error: 'Error guardando conversación' }, { status: 500 });
    }

    // 5. Responder a Telegram
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error en webhook de Telegram:', error);
    return NextResponse.json({ error: 'Error procesando el webhook' }, { status: 500 });
  }
} 