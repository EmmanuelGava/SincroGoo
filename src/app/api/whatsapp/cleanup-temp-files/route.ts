import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CleanupManager } from '@/app/servicios/messaging/whatsapp/modules/CleanupManager';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 [API] Iniciando limpieza de archivos temporales...');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.log('👤 [API] Usuario autenticado:', session.user.id);

    // Obtener instancia del CleanupManager
    const cleanupManager = CleanupManager.getInstance();
    
    // Ejecutar limpieza
    await cleanupManager.cleanupAllTempFiles();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Limpieza de archivos temporales completada'
    });
    
  } catch (error) {
    console.error('❌ [API] Error en limpieza de archivos temporales:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Error en limpieza de archivos temporales',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [API] Obteniendo información de archivos temporales...');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener instancia del CleanupManager
    const cleanupManager = CleanupManager.getInstance();
    
    // Ejecutar limpieza y obtener estadísticas
    await cleanupManager.cleanupAllTempFiles();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Información de archivos temporales obtenida',
      action: 'cleanup_completed'
    });
    
  } catch (error) {
    console.error('❌ [API] Error obteniendo información de archivos temporales:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Error obteniendo información de archivos temporales',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 