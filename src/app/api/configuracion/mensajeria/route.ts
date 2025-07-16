import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

// GET - Obtener configuraciones del usuario
export async function GET(req: NextRequest) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const plataforma = searchParams.get('plataforma');
    const activa = searchParams.get('activa');

    let query = supabase
      .from('configuracion_mensajeria_usuario')
      .select('*')
      .eq('usuario_id', session.user.id);

    // Filtrar por plataforma si se especifica
    if (plataforma) {
      query = query.eq('plataforma', plataforma);
    }

    // Filtrar por estado activo si se especifica
    if (activa === 'true') {
      query = query.eq('activa', true);
    }

    const { data: configuraciones, error } = await query
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Error fetching configuraciones:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      configuraciones: configuraciones || []
    });

  } catch (error) {
    console.error('Error en GET /api/configuracion/mensajeria:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// POST - Crear nueva configuración
export async function POST(req: NextRequest) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { 
      plataforma, 
      nombre_configuracion, 
      descripcion, 
      activa, 
      configuracion 
    } = await req.json();

    if (!plataforma || !nombre_configuracion || !configuracion) {
      return NextResponse.json({
        error: 'plataforma, nombre_configuracion y configuracion son requeridos'
      }, { status: 400 });
    }

    // Validar plataforma
    const plataformasValidas = ['telegram', 'whatsapp', 'email'];
    if (!plataformasValidas.includes(plataforma)) {
      return NextResponse.json({
        error: 'Plataforma no válida'
      }, { status: 400 });
    }

    // Verificar que no exista una configuración con el mismo nombre
    const { data: existente } = await supabase
      .from('configuracion_mensajeria_usuario')
      .select('id')
      .eq('usuario_id', session.user.id)
      .eq('plataforma', plataforma)
      .eq('nombre_configuracion', nombre_configuracion)
      .single();

    if (existente) {
      return NextResponse.json({
        error: 'Ya existe una configuración con ese nombre para esta plataforma'
      }, { status: 409 });
    }

    const nuevaConfiguracion = {
      usuario_id: session.user.id,
      plataforma,
      nombre_configuracion,
      descripcion: descripcion || null,
      activa: activa !== false, // Default true
      configuracion,
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('configuracion_mensajeria_usuario')
      .insert(nuevaConfiguracion)
      .select()
      .single();

    if (error) {
      console.error('Error creating configuracion:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      configuracion: data
    }, { status: 201 });

  } catch (error) {
    console.error('Error en POST /api/configuracion/mensajeria:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}