import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] Verificando estado de Socket.IO...');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar si el servidor Socket.IO está disponible
    const socketUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    try {
      const response = await fetch(`${socketUrl}/api/socketio`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const socketStatus = response.ok;
      
      return NextResponse.json({ 
        success: true, 
        socketServer: {
          url: socketUrl,
          status: socketStatus ? 'online' : 'offline',
          timestamp: new Date().toISOString()
        },
        client: {
          userId: session.user.id,
          email: session.user.email
        },
        recommendations: socketStatus ? [] : [
          'Verificar que el servidor Socket.IO esté ejecutándose',
          'Verificar la configuración de NEXT_PUBLIC_SITE_URL',
          'Revisar logs del servidor para errores de Socket.IO'
        ]
      });
      
    } catch (socketError) {
      console.error('❌ Error verificando Socket.IO:', socketError);
      
      return NextResponse.json({ 
        success: false, 
        socketServer: {
          url: socketUrl,
          status: 'error',
          error: socketError instanceof Error ? socketError.message : 'Error desconocido'
        },
        client: {
          userId: session.user.id,
          email: session.user.email
        },
        recommendations: [
          'El servidor Socket.IO no responde',
          'Verificar que el servidor esté ejecutándose',
          'Verificar la configuración de red'
        ]
      });
    }
    
  } catch (error) {
    console.error('❌ [API] Error verificando estado de Socket.IO:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Error verificando estado de Socket.IO',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 