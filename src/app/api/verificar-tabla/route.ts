import { NextResponse } from 'next/server';
import { supabase } from '@/servicios/supabase/globales';

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tabla = searchParams.get('tabla') || 'asociaciones';
    
    console.log(`🔍 [API] Verificando existencia de tabla: ${tabla}`);
    
    // Primero verificar si la tabla existe a través de una consulta directa
    const { data: tablaData, error: tablaError } = await supabase
      .from(tabla)
      .select('id')
      .limit(1);
    
    // Si hay un error, verificar si es porque la tabla no existe
    if (tablaError) {
      console.error(`❌ [API] Error al consultar tabla ${tabla}:`, tablaError);
      
      // Verificar si podemos obtener información de las tablas utilizando información del esquema
      const { data: schemasData, error: schemasError } = await supabase
        .rpc('get_schema_info');
      
      if (schemasError) {
        console.error('❌ [API] Error al obtener información del esquema:', schemasError);
        return NextResponse.json({
          existe: false,
          error: tablaError.message,
          codigo: tablaError.code,
          detalle: `No se pudo verificar la estructura del esquema: ${schemasError.message}`
        });
      }
      
      // Buscar la tabla en la información del esquema
      const tablaEnEsquema = Array.isArray(schemasData) && 
        schemasData.find(t => t.table_name === tabla);
      
      return NextResponse.json({
        existe: Boolean(tablaEnEsquema),
        error: tablaError.message,
        codigo: tablaError.code,
        mensaje: tablaEnEsquema 
          ? `La tabla ${tabla} existe en el esquema pero no se puede acceder: ${tablaError.message}`
          : `La tabla ${tabla} no existe en la base de datos`
      });
    }
    
    // Si no hay error, la tabla existe
    console.log(`✅ [API] La tabla ${tabla} existe y es accesible`);
    
    // Obtener recuento de registros
    const { count, error: countError } = await supabase
      .from(tabla)
      .select('*', { count: 'exact', head: true });
    
    // Obtener estructura de la tabla (nombres de columnas)
    const { data: estructuraData, error: estructuraError } = await supabase
      .rpc('get_table_columns', { tabla_nombre: tabla });
    
    return NextResponse.json({
      existe: true,
      registros: count,
      columnas: estructuraData || [],
      error_recuento: countError ? countError.message : null,
      error_estructura: estructuraError ? estructuraError.message : null,
      mensaje: `La tabla ${tabla} existe y contiene ${count || '?'} registros`
    });
  } catch (error) {
    console.error('❌ [API] Error general al verificar tabla:', error);
    return NextResponse.json({
      existe: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 