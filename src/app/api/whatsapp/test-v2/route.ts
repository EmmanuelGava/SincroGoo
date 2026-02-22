import { NextRequest, NextResponse } from 'next/server';
import { whatsappLiteServiceV2 } from '@/app/servicios/messaging/whatsapp/WhatsAppLiteServiceV2';

// Endpoint de prueba para WhatsApp Lite V2 (sin autenticación)
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [Test V2] Iniciando prueba de WhatsApp Lite V2...');

    const { action = 'connect', userId = 'test-user-123' } = await request.json();

    if (action === 'connect') {
      const result = await whatsappLiteServiceV2.connect(userId);
      
      console.log('📡 [Test V2] Resultado:', result);
      
      return NextResponse.json({
        success: true,
        message: 'WhatsApp Lite V2 probado exitosamente',
        data: result
      });
    }

    if (action === 'status') {
      const state = whatsappLiteServiceV2.getState();
      
      return NextResponse.json({
        success: true,
        data: {
          ...state,
          isConnected: whatsappLiteServiceV2.isConnected()
        }
      });
    }

    if (action === 'disconnect') {
      await whatsappLiteServiceV2.disconnect();
      
      return NextResponse.json({
        success: true,
        message: 'Desconectado exitosamente'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Acción no válida'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ [Test V2] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const state = whatsappLiteServiceV2.getState();
    
    return NextResponse.json({
      success: true,
      message: 'WhatsApp Lite V2 Test Endpoint',
      data: {
        state,
        isConnected: whatsappLiteServiceV2.isConnected(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}