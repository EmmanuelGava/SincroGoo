import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    console.log('🐛 [Debug] Verificando estado de conexión para usuario:', userId);

    // Importar el servicio dinámicamente
    const { whatsappLiteService } = await import('@/app/servicios/messaging/whatsapp/WhatsAppLiteService');
    
    // Obtener estado actual
    const currentState = whatsappLiteService.getCurrentState(userId);
    
    console.log('🐛 [Debug] Estado actual del servicio:', currentState);

    // Verificar si hay socket activo
    const hasActiveSocket = currentState?.socket && !currentState.socket.end;
    const socketUser = currentState?.socket?.user;
    const connectionStatus = currentState?.socket?.ws?.readyState;

    const debugInfo = {
      userId,
      timestamp: new Date().toISOString(),
      serviceState: {
        isConnected: currentState?.isConnected || false,
        phoneNumber: currentState?.phoneNumber || null,
        hasQR: !!currentState?.currentQR,
        qrLength: currentState?.currentQR?.length || 0,
        sessionId: currentState?.sessionId || null,
        lastActivity: currentState?.lastActivity || null
      },
      socketState: {
        hasSocket: !!currentState?.socket,
        hasActiveSocket,
        socketUser: socketUser ? {
          id: socketUser.id,
          phoneNumber: socketUser.id?.replace('@s.whatsapp.net', '')
        } : null,
        connectionStatus: connectionStatus || 'unknown',
        wsReadyState: connectionStatus === 1 ? 'OPEN' : connectionStatus === 0 ? 'CONNECTING' : connectionStatus === 2 ? 'CLOSING' : connectionStatus === 3 ? 'CLOSED' : 'UNKNOWN'
      },
      globalState: {
        hasGlobalEmit: typeof global !== 'undefined' && !!(global as any).emitToUser,
        socketIOAvailable: typeof global !== 'undefined' && !!(global as any).io
      }
    };

    console.log('🐛 [Debug] Información de debug completa:', debugInfo);

    return NextResponse.json({
      success: true,
      message: `Estado de conexión: ${debugInfo.serviceState.isConnected ? 'Conectado' : 'No conectado'} - ${debugInfo.serviceState.phoneNumber || 'Sin número'}`,
      data: debugInfo
    });

  } catch (error) {
    console.error('🐛 [Debug] Error en debug de conexión:', error);
    return NextResponse.json(
      { 
        error: 'Error en debug de conexión',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 