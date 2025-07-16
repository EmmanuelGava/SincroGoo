import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

// GET - Obtener configuración específica
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: configuracion, error } = await supabase
      .from('configuracion_mensajeria_usuario')
      .select('*')
      .eq('id', params.id)
      .eq('usuario_id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching configuracion:', error);
      return NextResponse.json({
        error: 'Configuración no encontrada'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      configuracion
    });

  } catch (error) {
    console.error('Error en GET /api/configuracion/mensajeria/[id]:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// PUT - Actualizar configuración
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { 
      nombre_configuracion, 
      descripcion, 
      activa, 
      configuracion 
    } = await req.json();

    const { data, error } = await supabase
      .from('configuracion_mensajeria_usuario')
      .update({
        nombre_configuracion,
        descripcion,
        activa,
        configuracion,
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('usuario_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating configuracion:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      configuracion: data
    });

  } catch (error) {
    console.error('Error en PUT /api/configuracion/mensajeria/[id]:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// DELETE - Eliminar configuración
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { error } = await supabase
      .from('configuracion_mensajeria_usuario')
      .delete()
      .eq('id', params.id)
      .eq('usuario_id', session.user.id);

    if (error) {
      console.error('Error deleting configuracion:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración eliminada correctamente'
    });

  } catch (error) {
    console.error('Error en DELETE /api/configuracion/mensajeria/[id]:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}