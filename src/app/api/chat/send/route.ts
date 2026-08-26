import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendMessage } from '@/lib/chat/sendMessage';

/**
 * Endpoint unificado para enviar mensajes desde el frontend
 * El frontend no necesita saber si es WhatsApp Lite, Business, Telegram, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { platform, to, message, messageType, filePath, metadata, scheduled_for } = body;

    console.log('📥 Datos recibidos en /api/chat/send:', {
      platform,
      to,
      messageLength: message?.length,
      messageType,
      hasMetadata: !!metadata,
      fullBody: body
    });

    // Validaciones básicas
    if (!platform || !to || !message) {
      console.log('❌ Validación fallida:', { platform, to, hasMessage: !!message });
      return NextResponse.json({
        error: 'Faltan campos requeridos: platform, to, message'
      }, { status: 400 });
    }

    // Validar plataforma soportada
    const supportedPlatforms = ['whatsapp', 'telegram', 'email'];
    if (!supportedPlatforms.includes(platform)) {
      console.log('❌ Plataforma no soportada:', platform);
      return NextResponse.json({
        error: `Plataforma no soportada: "${platform}". Plataformas válidas: ${supportedPlatforms.join(', ')}`
      }, { status: 400 });
    }

    console.log(`📤 Frontend solicita envío via ${platform}:`, {
      to,
      messageLength: message.length,
      messageType,
      userId: session.user.id
    });

    // Enviar mensaje usando la función central
    const result = await sendMessage({
      platform,
      to,
      message,
      messageType,
      filePath,
      userId: session.user.id,
      metadata,
      scheduledFor: scheduled_for || null,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.scheduled
          ? `Mensaje programado via ${platform}`
          : `Mensaje enviado exitosamente via ${platform}`,
        platformDetails: result.platformDetails,
        outbox_id: result.outboxId,
        scheduled: Boolean(result.scheduled),
      });
    } else {
      // Usar 400 en lugar de 500 para errores de configuración/estado
      return NextResponse.json({
        success: false,
        error: result.error || `Error enviando mensaje via ${platform}`,
        platformDetails: result.platformDetails
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error en endpoint de envío unificado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 