import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, session } = await getSupabaseClient(true);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const leadId = params.id;

    if (!leadId) {
      return NextResponse.json({
        error: 'ID del lead es requerido'
      }, { status: 400 });
    }

    // Obtener información del lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        id,
        nombre,
        email,
        telefono,
        empresa,
        cargo,
        ciudad,
        pais,
        estado_lead,
        fecha_creacion,
        ultima_interaccion,
        valor_estimado,
        origen,
        notas,
        created_at,
        updated_at
      `)
      .eq('id', leadId)
      .single();

    if (leadError) {
      console.error('Error fetching lead:', leadError);
      return NextResponse.json({
        error: 'Lead no encontrado'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      lead
    }, { status: 200 });

  } catch (error) {
    console.error('Error en GET /api/leads/[id]:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({
      error: errorMessage
    }, { status });
  }
}