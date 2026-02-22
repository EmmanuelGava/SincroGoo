import { NextRequest, NextResponse } from 'next/server';
import { whatsappLiteService } from '@/app/servicios/messaging/whatsapp/WhatsAppLiteService';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Iniciando conexión pública de WhatsApp Lite...');
    
    // Verificar si ya está conectado
    const currentStatus = whatsappLiteService.getConnectionStatus();
    if (currentStatus.connected) {
      console.log('✅ WhatsApp Lite ya está conectado');
      return NextResponse.json({
        success: true,
        message: 'WhatsApp Lite ya está conectado',
        connected: true,
        phoneNumber: currentStatus.phoneNumber
      });
    }
    
    // Intentar conectar
    const qrData = await whatsappLiteService.connect('public-user');
    
    console.log('📱 Resultado de conexión:', {
      hasQR: !!qrData.qrCode,
      sessionId: qrData.sessionId,
      connected: !qrData.qrCode
    });
    
    if (qrData.qrCode) {
      // Necesita QR code
      return NextResponse.json({
        success: true,
        message: 'QR Code generado. Escanea con tu WhatsApp.',
        qrCode: qrData.qrCode,
        sessionId: qrData.sessionId,
        expiresAt: qrData.expiresAt,
        connected: false
      });
    } else {
      // Ya conectado
      return NextResponse.json({
        success: true,
        message: 'WhatsApp Lite conectado exitosamente',
        connected: true,
        sessionId: qrData.sessionId
      });
    }
    
  } catch (error) {
    console.error('❌ Error conectando WhatsApp Lite:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error conectando WhatsApp Lite',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 