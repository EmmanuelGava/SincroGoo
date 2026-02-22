import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/chat/sendMessage';

/**
 * Endpoint de prueba para verificar la nueva arquitectura de envío
 */
export async function POST(request: NextRequest) {
  try {
    const { platform, to, message } = await request.json();

    console.log('🧪 Prueba de envío:', { platform, to, message });

    // Probar con datos mínimos
    const result = await sendMessage({
      platform: platform || 'whatsapp',
      to: to || '5491171277796',
      message: message || 'Mensaje de prueba desde nueva arquitectura',
      messageType: 'text',
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    });

    console.log('🧪 Resultado de prueba:', result);

    return NextResponse.json({
      success: true,
      result,
      message: 'Prueba completada'
    });

  } catch (error) {
    console.error('❌ Error en prueba:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 