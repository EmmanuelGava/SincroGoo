import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const leadId = params.id;
    if (!leadId) {
      return NextResponse.json({ error: 'ID del lead es requerido' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        id,
        nombre,
        email,
        telefono,
        empresa,
        cargo,
        estado_id,
        notas,
        fecha_creacion,
        fecha_actualizacion,
        estados_lead(nombre, color)
      `)
      .eq('id', leadId)
      .maybeSingle();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    const { data: conversacion } = await supabase
      .from('conversaciones')
      .select('id')
      .eq('lead_id', leadId)
      .order('fecha_mensaje', { ascending: false })
      .limit(1)
      .maybeSingle();

    const estadoRel = Array.isArray(lead.estados_lead) ? lead.estados_lead[0] : lead.estados_lead;

    return NextResponse.json({
      success: true,
      lead: {
        ...lead,
        estado_lead: estadoRel?.nombre || 'Sin estado',
        conversacion_id: conversacion?.id || null,
      },
      conversacionId: conversacion?.id || null,
    }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error en GET /api/leads/[id]:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
