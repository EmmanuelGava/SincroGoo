import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/chat/handleIncomingMessage';

/**
 * Endpoint para mensajes entrantes de Email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📧 Mensaje recibido de Email:', {
      from: body.from,
      subject: body.subject?.substring(0, 100) + '...'
    });

    // Procesar mensaje de Email
    if (body.from && body.text) {
      await handleIncomingMessage({
        platform: 'email',
        message: body.text,
        contact: {
          id: body.from,
          email: body.from,
          name: body.from_name || body.from.split('@')[0]
        },
        timestamp: body.date ? new Date(body.date) : new Date(),
        messageType: 'text',
        metadata: {
          subject: body.subject,
          to: body.to,
          cc: body.cc,
          bcc: body.bcc,
          message_id: body.message_id,
          source: 'email-smtp'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Mensaje de Email procesado correctamente'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Email procesado (sin contenido de texto)'
    });

  } catch (error) {
    console.error('❌ Error procesando mensaje de Email:', error);
    return NextResponse.json(
      { error: 'Error procesando mensaje' },
      { status: 500 }
    );
  }
} 