import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/chat/sendMessage';

/**
 * Endpoint de prueba que simula exactamente lo que envía ChatWindow
 */
export async function POST(request: NextRequest) {
  try {
    // Simular los datos que envía ChatWindow
    const testData = {
      platform: 'telegram' as const, // Simular conversación de Telegram
      to: '7639310894', // Usar el remitente real de la conversación
      message: 'Mensaje de prueba desde ChatWindow',
      messageType: 'text' as const,
      metadata: {
        conversacion_id: '3233d855-4035-4273-8cd7-d79f16d37e38',
        original_canal: 'telegram'
      }
    };

    console.log('🧪 Simulando envío desde ChatWindow:', testData);

    // Usar la función central
    const result = await sendMessage(testData);

    console.log('🧪 Resultado de simulación:', result);

    return NextResponse.json({
      success: true,
      result,
      message: 'Simulación completada'
    });

  } catch (error) {
    console.error('❌ Error en simulación:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 