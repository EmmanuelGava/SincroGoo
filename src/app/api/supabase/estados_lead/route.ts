import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../../lib/supabase/client';
import { formatErrorResponse } from '../../../../lib/supabase/utils/error-handler';

// GET /api/supabase/estados_lead - Listar estados (ordenados)
export async function GET(request: NextRequest) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Usar el user ID de la sesión de NextAuth/Supabase
    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Usuario no identificado' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('estados_lead')
      .select('*')
      .eq('usuario_id', userId)
      .order('orden', { ascending: true });

    if (error) {
      console.error('Error al obtener estados_lead:', error);
      throw error;
    }
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error completo en GET estados_lead:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// POST /api/supabase/estados_lead - Crear estado
export async function POST(request: NextRequest) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, orden, color, is_default, icono } = body;

    if (!nombre || orden === undefined) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (nombre, orden)' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('estados_lead')
      .insert({
        nombre,
        orden,
        color,
        usuario_id: session.user.id, // Usar el ID del usuario autenticado
        is_default,
        icono
      })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// PATCH /api/supabase/estados_lead - Actualizar estado (por id)
export async function PATCH(request: NextRequest) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'Falta el id del estado' }, { status: 400 });

    // Verificar que el estado pertenece al usuario
    const { data: existingState, error: checkError } = await supabase
      .from('estados_lead')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', session.user.id)
      .single();

    if (checkError || !existingState) {
      return NextResponse.json({ error: 'Estado no encontrado o no autorizado' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('estados_lead')
      .update(fields)
      .eq('id', id)
      .eq('usuario_id', session.user.id)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// DELETE /api/supabase/estados_lead - Eliminar estado (por id)
export async function DELETE(request: NextRequest) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta el id del estado' }, { status: 400 });

    // Verificar que el estado pertenece al usuario
    const { data: existingState, error: checkError } = await supabase
      .from('estados_lead')
      .select('id')
      .eq('id', id)
      .eq('usuario_id', session.user.id)
      .single();

    if (checkError || !existingState) {
      return NextResponse.json({ error: 'Estado no encontrado o no autorizado' }, { status: 404 });
    }

    const { error } = await supabase
      .from('estados_lead')
      .delete()
      .eq('id', id)
      .eq('usuario_id', session.user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
} 