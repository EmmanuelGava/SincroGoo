import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Sincronizar asociaciones entre elementos y hojas de cálculo
 * @route POST /api/supabase/sync/associations
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validar parámetros
    if (!data.sheetId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere sheetId' },
        { status: 400 }
      );
    }
    
    if (!data.elements || !Array.isArray(data.elements)) {
      return NextResponse.json(
        { success: false, error: 'Se requieren elementos para sincronizar' },
        { status: 400 }
      );
    }

    // Preparar datos para la inserción
    const associations = data.elements.map((element: any) => ({
      elemento_id: element.id,
      sheet_id: data.sheetId,
      columna: element.columna,
      tipo: element.tipo || 'texto',
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString()
    }));

    // Si se solicita eliminar las asociaciones existentes
    if (data.deleteExisting) {
      await supabase
        .from('asociaciones')
        .delete()
        .eq('sheet_id', data.sheetId);
    }

    // Insertar nuevas asociaciones
    const { data: result, error } = await supabase
      .from('asociaciones')
      .insert(associations)
      .select();

    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error al sincronizar asociaciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error al sincronizar asociaciones' },
      { status: 500 }
    );
  }
} 