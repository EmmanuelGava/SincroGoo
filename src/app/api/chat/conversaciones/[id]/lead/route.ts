import { NextRequest, NextResponse } from 'next/server';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getOrganizacionContext();
    if (!ctx) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { id: conversacionId } = await params;

    const { data: conversacion, error: convError } = await supabase
      .from('conversaciones')
      .select('id, lead_id, contacto_id, organizacion_id')
      .eq('id', conversacionId)
      .eq('organizacion_id', ctx.organizacionId)
      .maybeSingle();

    if (convError || !conversacion) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
    }

    if (conversacion.lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id, nombre, estado_id')
        .eq('id', conversacion.lead_id)
        .eq('organizacion_id', ctx.organizacionId)
        .maybeSingle();
      return NextResponse.json({ leadId: lead?.id || null, lead: lead || null });
    }

    if (conversacion.contacto_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id, nombre, estado_id')
        .eq('contacto_id', conversacion.contacto_id)
        .eq('organizacion_id', ctx.organizacionId)
        .order('fecha_creacion', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lead?.id) {
        return NextResponse.json({ leadId: lead.id, lead });
      }
    }

    return NextResponse.json({ leadId: null, lead: null });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
