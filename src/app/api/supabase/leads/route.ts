import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatErrorResponse } from '../../../../lib/supabase/utils/error-handler';

// Helper para crear el cliente de Supabase con el token del usuario
async function getUserSupabaseClient() {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) return null;
    return { supabase, session };
  } catch (error) {
    console.error('Error getting Supabase client:', error);
    return null;
  }
}

// GET /api/supabase/leads - Listar leads (opcional: filtrar por estado_id)
export async function GET(request: NextRequest) {
  try {
    const client = await getUserSupabaseClient();
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    
    const { supabase, session } = client;
    const userId = session.user?.id;
    if (!userId) return NextResponse.json({ error: 'Usuario no identificado' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const estado_id = searchParams.get('estado_id');
    
    // Try vista first, fallback to basic leads table
    let query = supabase.from('leads').select(`
      *,
      estados_lead(nombre, color)
    `).eq('asignado_a', userId);

    if (estado_id) {
      query = query.eq('estado_id', estado_id);
    }

    const { data, error } = await query.order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Error al obtener leads:', error);
      throw error;
    }
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error completo en GET leads:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// POST /api/supabase/leads - Crear lead
export async function POST(request: NextRequest) {
  try {
    const client = await getUserSupabaseClient();
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { supabase, session } = client;
    const userId = session.user?.id;
    if (!userId) return NextResponse.json({ error: 'Usuario no identificado' }, { status: 401 });

    const body = await request.json();
    const { nombre, email, telefono, empresa, cargo, estado_id, probabilidad_cierre, tags, notas } = body;
    
    if (!nombre || !email || !estado_id) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (nombre, email, estado_id)' }, { status: 400 });
    }
    
    const { data, error } = await supabase.from('leads').insert({ 
      nombre, 
      email, 
      telefono, 
      empresa, 
      cargo, 
      estado_id, 
      probabilidad_cierre, 
      tags, 
      notas, 
      asignado_a: userId,
      creado_por: userId
    }).select('*').single();
    
    if (error) {
      console.error('ERROR SUPABASE AL INSERTAR LEAD:', error);
      throw error;
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// PATCH /api/supabase/leads - Actualizar lead (por id)
export async function PATCH(request: NextRequest) {
  try {
    const client = await getUserSupabaseClient();
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    
    const { supabase } = client;
    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: 'Falta el id del lead' }, { status: 400 });
    
    const { data, error } = await supabase.from('leads').update(fields).eq('id', id).select('*').single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// DELETE /api/supabase/leads - Eliminar lead (por id)
export async function DELETE(request: NextRequest) {
  try {
    const client = await getUserSupabaseClient();
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    
    const { supabase } = client;
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta el id del lead' }, { status: 400 });
    
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
} 