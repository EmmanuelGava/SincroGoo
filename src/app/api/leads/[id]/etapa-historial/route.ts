import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

type RouteContext = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const usuarioId = await getUsuarioIdFromSession();
    if (!usuarioId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const leadId = params.id;
    if (!leadId) {
      return NextResponse.json({ error: 'Falta el id del lead' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, nombre, asignado_a')
      .eq('id', leadId)
      .maybeSingle();

    if (leadError) throw leadError;
    if (!lead || lead.asignado_a !== usuarioId) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    const { data: historial, error: historialError } = await supabase
      .from('lead_etapa_historial')
      .select('id, lead_id, fecha, estado_anterior_nombre, estado_nuevo_nombre, motivo')
      .eq('lead_id', leadId)
      .order('fecha', { ascending: false });

    if (historialError && historialError.code !== 'PGRST205' && historialError.code !== '42P01') {
      throw historialError;
    }

    return NextResponse.json({
      historial: (historial || []).map((row) => ({
        ...row,
        lead_nombre: lead.nombre || 'Lead',
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
