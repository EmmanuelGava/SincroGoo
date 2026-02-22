import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WhatsAppLiteService } from '@/app/servicios/messaging/whatsapp/WhatsAppLiteService';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [API] Iniciando reconexión de WhatsApp...');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('👤 [API] Usuario autenticado:', session.user.id);

    // Obtener instancia del WhatsAppLiteService
    const whatsappService = WhatsAppLiteService.getInstance();
    
    // Verificar estado actual
    const currentStatus = whatsappService.getConnectionStatus();
    console.log('📊 [API] Estado actual:', currentStatus);
    
    if (currentStatus.connected) {
      return NextResponse.json({ 
        success: true, 
        message: 'Ya está conectado',
        status: currentStatus
      });
    }
    
    // Intentar reconectar
    console.log('🔄 [API] Intentando reconectar...');
    const qrData = await whatsappService.connect(session.user.id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Reconexión iniciada',
      qrData,
      status: whatsappService.getConnectionStatus()
    });
    
  } catch (error) {
    console.error('❌ [API] Error en reconexión:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Error en reconexión',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [API] Obteniendo estado de conexión...');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener instancia del WhatsAppLiteService
    const whatsappService = WhatsAppLiteService.getInstance();
    
    // Obtener estado actual
    const status = whatsappService.getConnectionStatus();
    
    return NextResponse.json({ 
      success: true, 
      status,
      needsReconnection: !status.connected
    });
    
  } catch (error) {
    console.error('❌ [API] Error obteniendo estado:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Error obteniendo estado',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 