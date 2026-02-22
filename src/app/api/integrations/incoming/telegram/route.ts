import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/chat/handleIncomingMessage';

/**
 * Endpoint para mensajes entrantes de Telegram
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📨 Mensaje recibido de Telegram:', {
      update_id: body.update_id,
      message: body.message?.text?.substring(0, 100) + '...'
    });

    // Procesar mensaje de Telegram
    if (body.message && body.message.text) {
      await handleIncomingMessage({
        platform: 'telegram',
        message: body.message.text,
        contact: {
          id: body.message.from.id.toString(),
          name: `${body.message.from.first_name} ${body.message.from.last_name || ''}`.trim(),
          phone: body.message.from.username || undefined
        },
        timestamp: new Date(body.message.date * 1000),
        messageType: 'text',
        metadata: {
          update_id: body.update_id,
          message_id: body.message.message_id,
          chat_id: body.message.chat.id,
          chat_type: body.message.chat.type,
          source: 'telegram-bot-api'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Mensaje de Telegram procesado correctamente'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Update de Telegram procesado (no es un mensaje de texto)'
    });

  } catch (error) {
    console.error('❌ Error procesando mensaje de Telegram:', error);
    return NextResponse.json(
      { error: 'Error procesando mensaje' },
      { status: 500 }
    );
  }
} 