import { NextRequest, NextResponse } from 'next/server';
import { whatsappLiteService } from '@/app/servicios/messaging/whatsapp/WhatsAppLiteService';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verificando estado público de WhatsApp Lite...');
    
    const status = whatsappLiteService.getConnectionStatus();
    
    console.log('📊 Estado de WhatsApp Lite:', {
      connected: status.connected,
      phoneNumber: status.phoneNumber,
      lastActivity: status.lastActivity ? new Date(status.lastActivity).toLocaleTimeString() : 'Nunca'
    });
    
    return NextResponse.json({
      success: true,
      status: {
        connected: status.connected,
        phoneNumber: status.phoneNumber,
        lastActivity: status.lastActivity,
        sessionActive: status.connected && status.lastActivity,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error verificando estado de WhatsApp Lite:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error verificando estado de WhatsApp Lite',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 