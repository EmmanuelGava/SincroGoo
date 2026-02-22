import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [TEST] Iniciando test de conexión WhatsApp...');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('👤 [TEST] Usuario autenticado:', session.user.id);

    // Test 1: Importar el servicio
    console.log('📦 [TEST] Importando WhatsAppLiteService...');
    const { whatsappLiteService } = await import('@/app/servicios/messaging/whatsapp/WhatsAppLiteService');
    console.log('✅ [TEST] WhatsAppLiteService importado exitosamente');

    // Test 2: Verificar estado actual
    console.log('🔍 [TEST] Verificando estado actual...');
    const currentStatus = whatsappLiteService.getConnectionStatus();
    console.log('📊 [TEST] Estado actual:', currentStatus);

    // Test 3: Intentar conexión paso a paso
    console.log('🔗 [TEST] Iniciando conexión paso a paso...');
    
    try {
      const result = await whatsappLiteService.connect(session.user.id);
      console.log('✅ [TEST] Conexión exitosa:', result);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Test de conexión exitoso',
        data: result,
        currentStatus
      });
      
    } catch (connectionError) {
      console.error('❌ [TEST] Error en conexión:', connectionError);
      
      return NextResponse.json({ 
        success: false, 
        error: 'Error en conexión',
        details: connectionError instanceof Error ? connectionError.message : 'Error desconocido',
        stack: connectionError instanceof Error ? connectionError.stack : 'No stack trace',
        currentStatus
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [TEST] Error general:', error);
    return NextResponse.json(
      { 
        error: 'Error en test de conexión', 
        details: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      }, 
      { status: 500 }
    );
  }
}