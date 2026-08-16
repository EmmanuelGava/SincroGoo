import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/chat/handleIncomingMessage';

/**
 * Endpoint unificado para mensajes entrantes de WhatsApp
 * Maneja tanto WhatsApp Lite como WhatsApp Business
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Determinar el tipo de mensaje basado en la estructura
    const messageType = determineMessageType(body);

    if (messageType === 'lite') {
      const workerSecret = process.env.WORKER_SECRET;
      if (workerSecret && request.headers.get('x-worker-secret') !== workerSecret) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    }
    
    if (messageType === 'business') {
      return await handleBusinessMessage(body);
    } else if (messageType === 'lite') {
      return await handleLiteMessage(body);
    } else {
      return NextResponse.json({ error: 'Formato de mensaje no reconocido' }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error procesando mensaje de WhatsApp:', error);
    return NextResponse.json(
      { error: 'Error procesando mensaje' },
      { status: 500 }
    );
  }
}

// Verificación del webhook para WhatsApp Business (requerido por Meta)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook de WhatsApp Business verificado correctamente');
    return new Response(challenge, { status: 200 });
  } else {
    console.error('❌ Error verificando webhook de WhatsApp Business');
    return new Response('Forbidden', { status: 403 });
  }
}

function parseIncomingTimestamp(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) {
    return new Date(n > 1e12 ? n : n * 1000);
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function determineMessageType(body: any): 'business' | 'lite' | 'unknown' {
  // WhatsApp Business tiene estructura específica de Meta
  if (body.object === 'whatsapp_business_account' && body.entry) {
    return 'business';
  }
  
  // WhatsApp Lite tiene estructura más simple
  if (body.from && body.message && !body.object) {
    return 'lite';
  }
  
  return 'unknown';
}

async function handleBusinessMessage(body: any) {
  console.log('📩 Webhook recibido de WhatsApp Business:', JSON.stringify(body, null, 2));

  // Verificar que es una notificación de WhatsApp Business
  if (body.object !== 'whatsapp_business_account') {
    return NextResponse.json({ status: 'ignored' });
  }

  // Procesar cada entrada
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === 'messages') {
        await procesarMensajesWhatsAppBusiness(change.value);
      }
    }
  }

  return NextResponse.json({ status: 'ok' });
}

async function handleLiteMessage(body: any) {
  console.log('📨 Mensaje recibido de WhatsApp Lite:', {
    from: body.from,
    message: body.message?.substring(0, 100) + '...',
    type: body.type,
    platform: body.platform
  });

  // Usar la función central para procesar el mensaje
  const remoteJid = body.fromJid || (String(body.from || '').includes('@') ? body.from : undefined);
  const phone = body.phone || (remoteJid?.endsWith('@s.whatsapp.net') ? String(body.from).replace(/[^\d]/g, '') : undefined);

  await handleIncomingMessage({
    platform: 'whatsapp',
    message: body.message,
    contact: {
      id: phone || body.from,
      phone: phone || body.from,
      name: body.contact_name
    },
    timestamp: parseIncomingTimestamp(body.timestamp),
    messageType: body.type || 'text',
    metadata: {
      source: 'whatsapp-lite',
      tipo_conexion: 'lite',
      platform: body.platform || 'whatsapp-lite-baileys',
      userId: body.userId,
      remote_jid: remoteJid,
      phone_number: phone,
    }
  });

  return NextResponse.json({
    success: true,
    message: 'Mensaje de WhatsApp Lite procesado correctamente'
  });
}

async function procesarMensajesWhatsAppBusiness(value: any) {
  const { messages, contacts } = value;

  if (!messages || messages.length === 0) {
    return;
  }

  for (const message of messages) {
    try {
      // Solo procesar mensajes entrantes (no los que enviamos nosotros)
      if (message.type === 'text' && message.from) {
        const contact = contacts?.find((c: any) => c.wa_id === message.from);
        
        await handleIncomingMessage({
          platform: 'whatsapp',
          message: message.text?.body || '',
          contact: {
            id: message.from,
            phone: message.from,
            name: contact?.profile?.name
          },
          timestamp: new Date(parseInt(message.timestamp) * 1000),
          messageType: 'text',
          metadata: {
            message_id: message.id,
            source: 'whatsapp-business',
            tipo_conexion: 'business'
          }
        });
      }
    } catch (error) {
      console.error('Error procesando mensaje individual de WhatsApp Business:', error);
    }
  }
} 