import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createClient } from '@supabase/supabase-js';
import { formatErrorResponse } from '../../../../lib/supabase/utils/error-handler';
import { jwtDecode } from 'jwt-decode';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Helper para crear el cliente de Supabase con el token del usuario
async function getUserSupabaseClient() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const accessToken = session.supabaseToken || session.accessToken;
  if (!accessToken) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
}

// GET /api/supabase/leads - Listar leads (opcional: filtrar por estado_id)
export async function GET(request: NextRequest) {
  try {
    const supabase = await getUserSupabaseClient();
    if (!supabase) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const estado_id = searchParams.get('estado_id');
    
    let query = supabase.from('leads').select('*').eq('asignado_a', user.id);

    if (estado_id) {
      query = query.eq('estado_id', estado_id);
    }

    const { data, error } = await query.order('fecha_creacion', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// POST /api/supabase/leads - Crear lead
export async function POST(request: NextRequest) {
  try {
    const supabase = await getUserSupabaseClient();
    if (!supabase) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });

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
      asignado_a: user.id,
      creado_por: user.id
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
    const supabase = await getUserSupabaseClient();
    if (!supabase) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
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
    const supabase = await getUserSupabaseClient();
    if (!supabase) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
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