import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

export async function GET(req: NextRequest) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    let supabaseQuery = supabase
      .from('leads')
      .select(`
        id,
        nombre,
        email,
        telefono,
        empresa,
        cargo,
        estado_lead,
        fecha_creacion
      `)
      .order('fecha_creacion', { ascending: false })
      .limit(limit);

    // Si hay término de búsqueda, filtrar
    if (query.trim()) {
      supabaseQuery = supabaseQuery.or(`
        nombre.ilike.%${query}%,
        email.ilike.%${query}%,
        empresa.ilike.%${query}%,
        telefono.ilike.%${query}%
      `);
    }

    const { data: leads, error: leadsError } = await supabaseQuery;

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      throw leadsError;
    }

    return NextResponse.json({
      success: true,
      leads: leads || [],
      total: leads?.length || 0
    }, { status: 200 });

  } catch (error) {
    console.error('Error en GET /api/leads/buscar:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({
      error: errorMessage
    }, { status });
  }
}