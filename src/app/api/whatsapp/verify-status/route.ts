import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WhatsAppLiteService } from '@/app/servicios/messaging/whatsapp/WhatsAppLiteService';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] Verificando estado real de WhatsApp...');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('👤 [API] Usuario autenticado:', session.user.id);

    // Obtener instancia del WhatsAppLiteService
    const whatsappService = WhatsAppLiteService.getInstance();
    
    // Verificar estado real
    const realStatus = await whatsappService.verifyRealConnectionStatus();
    
    // Obtener estado reportado
    const reportedStatus = whatsappService.getConnectionStatus();
    
    console.log('📊 [API] Estado real vs reportado:', {
      real: realStatus,
      reported: reportedStatus
    });
    
    return NextResponse.json({ 
      success: true, 
      realStatus,
      reportedStatus,
      isConsistent: realStatus.isReallyConnected === reportedStatus.connected,
      needsReconnection: !realStatus.isReallyConnected && reportedStatus.connected
    });
    
  } catch (error) {
    console.error('❌ [API] Error verificando estado:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Error verificando estado',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 