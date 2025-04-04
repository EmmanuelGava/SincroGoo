import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

// Tipos
interface AsociacionData {
  elemento_id: string;
  sheets_id: string;
  columna: string;
  tipo?: string;
}

/**
 * POST /api/supabase/asociaciones
 * Crea o actualiza una asociación entre un elemento y una celda de Google Sheets
 */
export async function POST(request: Request) {
  try {
    // Verificar autenticación del usuario
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('❌ [API Supabase] Sin autenticación');
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    // Obtener datos de la solicitud
    const datos: AsociacionData = await request.json();
    
    console.log('📥 [API Supabase] POST /api/supabase/asociaciones');
    console.log('- Datos recibidos:', JSON.stringify(datos, null, 2));
    
    // Verificar datos obligatorios
    if (!datos.elemento_id || !datos.sheets_id || !datos.columna) {
      console.error('❌ [API Supabase] Faltan datos obligatorios');
      return NextResponse.json(
        { error: 'Faltan datos obligatorios (elemento_id, sheets_id, columna)' },
        { status: 400 }
      );
    }
    
    // Preparar datos para la inserción
    const datosInsercion = {
      elemento_id: datos.elemento_id,
      sheets_id: datos.sheets_id,
      columna: datos.columna,
      tipo: datos.tipo || 'texto',
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString()
    };
    
    console.log('📤 [API Supabase] Insertando asociación:', JSON.stringify(datosInsercion, null, 2));
    
    // Intentar la inserción
    const { data, error } = await supabase
      .from('asociaciones')
      .insert(datosInsercion)
      .select('id')
      .single();
    
    if (error) {
      console.error('❌ [API Supabase] Error al crear asociación:', error);
      
      // Verificar si el error es porque ya existe (violación de restricción única)
      if (error.code === '23505') {
        console.log('⚠️ [API Supabase] La asociación ya existe, intentando actualizar');
        
        // Intentar obtener la asociación existente
        const { data: existente, error: errorConsulta } = await supabase
          .from('asociaciones')
          .select('id')
          .eq('elemento_id', datos.elemento_id)
          .eq('sheets_id', datos.sheets_id)
          .eq('columna', datos.columna)
          .single();
        
        if (errorConsulta) {
          console.error('❌ [API Supabase] Error al buscar asociación existente:', errorConsulta);
          return NextResponse.json(
            { error: `Error al buscar asociación existente: ${errorConsulta.message}` },
            { status: 500 }
          );
        }
        
        // Actualizar la asociación existente
        const { data: actualizado, error: errorActualizar } = await supabase
          .from('asociaciones')
          .update({
            tipo: datos.tipo || 'texto',
            fecha_actualizacion: new Date().toISOString()
          })
          .eq('id', existente.id)
          .select('id')
          .single();
        
        if (errorActualizar) {
          console.error('❌ [API Supabase] Error al actualizar asociación:', errorActualizar);
          return NextResponse.json(
            { error: `Error al actualizar asociación: ${errorActualizar.message}` },
            { status: 500 }
          );
        }
        
        console.log('✅ [API Supabase] Asociación actualizada correctamente:', actualizado.id);
        return NextResponse.json({
          id: actualizado.id,
          mensaje: 'Asociación actualizada correctamente'
        });
      }
      
      // Otros errores
      return NextResponse.json(
        { error: `Error al crear asociación: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log('✅ [API Supabase] Asociación creada correctamente:', data.id);
    return NextResponse.json({
      id: data.id,
      mensaje: 'Asociación creada correctamente'
    });
  } catch (error) {
    console.error('❌ [API Supabase] Error general:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/supabase/asociaciones
 * Obtiene todas las asociaciones o filtra por parámetros
 */
export async function GET(request: Request) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url);
    const elemento_id = searchParams.get('elemento_id');
    const sheets_id = searchParams.get('sheets_id');

    // Construir la consulta base
    let query = supabase.from('asociaciones').select('*');

    // Aplicar filtros si existen
    if (elemento_id) {
      query = query.eq('elemento_id', elemento_id);
    }
    if (sheets_id) {
      query = query.eq('sheets_id', sheets_id);
    }

    // Ejecutar la consulta
    const { data, error } = await query;

    if (error) {
      console.error('❌ [API Supabase] Error al obtener asociaciones:', error);
      return NextResponse.json(
        { error: `Error al obtener asociaciones: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ [API Supabase] Error general:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 