import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Iniciando limpieza de configuraciones duplicadas...');
    
    const supabase = getSupabaseAdmin();
    
    // 1. Obtener todas las configuraciones activas
    const { data: configuraciones, error: fetchError } = await supabase
      .from('configuracion_mensajeria_usuario')
      .select('*')
      .eq('activa', true)
      .order('fecha_creacion', { ascending: false });
      
    if (fetchError) {
      console.error('❌ Error obteniendo configuraciones:', fetchError);
      return NextResponse.json({ error: 'Error obteniendo configuraciones' }, { status: 500 });
    }
    
    console.log(`📊 Configuraciones activas encontradas: ${configuraciones?.length || 0}`);
    
    // 2. Agrupar por usuario y plataforma
    const grupos = new Map<string, any[]>();
    
    configuraciones?.forEach(config => {
      const key = `${config.usuario_id}-${config.plataforma}`;
      if (!grupos.has(key)) {
        grupos.set(key, []);
      }
      grupos.get(key)!.push(config);
    });
    
    // 3. Identificar duplicados y mantener solo la más reciente
    const configuracionesAEliminar: string[] = [];
    const configuracionesAMantener: any[] = [];
    
    grupos.forEach((configs, key) => {
      if (configs.length > 1) {
        console.log(`🔍 Grupo ${key}: ${configs.length} configuraciones`);
        
        // Ordenar por fecha de creación (más reciente primero)
        const ordenadas = configs.sort((a, b) => 
          new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
        );
        
        // Mantener la más reciente
        const mantener = ordenadas[0];
        configuracionesAMantener.push(mantener);
        
        // Marcar las demás para eliminar
        const eliminar = ordenadas.slice(1);
        eliminar.forEach(config => {
          configuracionesAEliminar.push(config.id);
          console.log(`🗑️ Marcando para eliminar: ${config.nombre_configuracion} (${config.id})`);
        });
      } else {
        // Solo una configuración, mantenerla
        configuracionesAMantener.push(configs[0]);
      }
    });
    
    console.log(`📊 Configuraciones a mantener: ${configuracionesAMantener.length}`);
    console.log(`🗑️ Configuraciones a eliminar: ${configuracionesAEliminar.length}`);
    
    // 4. Eliminar duplicados
    if (configuracionesAEliminar.length > 0) {
      const { error: deleteError } = await supabase
        .from('configuracion_mensajeria_usuario')
        .delete()
        .in('id', configuracionesAEliminar);
        
      if (deleteError) {
        console.error('❌ Error eliminando duplicados:', deleteError);
        return NextResponse.json({ error: 'Error eliminando duplicados' }, { status: 500 });
      }
      
      console.log(`✅ ${configuracionesAEliminar.length} configuraciones duplicadas eliminadas`);
    }
    
    // 5. Desactivar configuraciones auto-creadas antiguas (más de 1 día)
    const unDiaAtras = new Date();
    unDiaAtras.setDate(unDiaAtras.getDate() - 1);
    
    const { data: autoCreatedOld, error: autoError } = await supabase
      .from('configuracion_mensajeria_usuario')
      .update({ activa: false })
      .eq('activa', true)
      .eq('configuracion->>auto_created', 'true')
      .lt('fecha_creacion', unDiaAtras.toISOString())
      .select('id');
      
    if (autoError) {
      console.error('❌ Error desactivando configuraciones auto-creadas:', autoError);
    } else {
      console.log(`🔄 ${autoCreatedOld?.length || 0} configuraciones auto-creadas antiguas desactivadas`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Limpieza completada exitosamente',
      eliminadas: configuracionesAEliminar.length,
      desactivadas: autoCreatedOld?.length || 0,
      mantenidas: configuracionesAMantener.length
    });
    
  } catch (error) {
    console.error('❌ Error en limpieza de configuraciones:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
} 