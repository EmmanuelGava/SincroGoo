import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Iniciando limpieza de sesiones de WhatsApp...');
    
    const supabase = getSupabaseAdmin();
    
    // 1. Eliminar sesiones expiradas (más de 7 días)
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 7);
    
    const { data: expiredSessions, error: expiredError } = await supabase
      .from('whatsapp_lite_sessions')
      .delete()
      .lt('last_activity', expiredDate.toISOString())
      .select('session_id');
      
    if (expiredError) {
      console.error('❌ Error eliminando sesiones expiradas:', expiredError);
    } else {
      console.log(`🧹 ${expiredSessions?.length || 0} sesiones expiradas eliminadas`);
    }
    
    // 2. Eliminar sesiones duplicadas (mantener la más reciente por usuario)
    const { data: duplicates, error: duplicatesError } = await supabase
      .rpc('clean_duplicate_whatsapp_sessions');
      
    if (duplicatesError) {
      console.error('❌ Error eliminando duplicados:', duplicatesError);
    }
    
    // 3. Eliminar credenciales incompletas (sin 'me')
    const { data: incompleteSessions, error: incompleteError } = await supabase
      .from('whatsapp_lite_sessions')
      .delete()
      .or('baileys_credentials.is.null,baileys_credentials->>me.is.null')
      .select('session_id');
      
    if (incompleteError) {
      console.error('❌ Error eliminando sesiones incompletas:', incompleteError);
    } else {
      console.log(`🧹 ${incompleteSessions?.length || 0} sesiones incompletas eliminadas`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Sesiones limpiadas exitosamente',
      expired: expiredSessions?.length || 0,
      incomplete: incompleteSessions?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Error en limpieza de sesiones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Obteniendo estadísticas de sesiones...');
    
    const supabase = getSupabaseAdmin();
    
    // Contar sesiones por estado
    const { data: stats, error } = await supabase
      .from('whatsapp_lite_sessions')
      .select('status, usuario_id, created_at, last_activity')
      .order('created_at', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const statistics = {
      total: stats?.length || 0,
      connected: stats?.filter(s => s.status === 'connected').length || 0,
      disconnected: stats?.filter(s => s.status === 'disconnected').length || 0,
      expired: stats?.filter(s => 
        new Date(s.last_activity) < sevenDaysAgo
      ).length || 0,
      recent: stats?.filter(s => 
        new Date(s.last_activity) > sevenDaysAgo
      ).length || 0
    };
    
    return NextResponse.json({
      success: true,
      statistics,
      sessions: stats?.slice(0, 10) // Solo las 10 más recientes
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 