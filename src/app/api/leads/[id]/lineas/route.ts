import { NextRequest, NextResponse } from 'next/server';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';
import { parseLeadLineasInput, replaceLeadLineas } from '@/lib/catalogo/leadLineas';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

type RouteContext = { params: { id: string } };

async function leadDeLaOrg(leadId: string, organizacionId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .eq('organizacion_id', organizacionId)
    .maybeSingle();
  if (error) throw error;
  return { supabase, lead: data };
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const ctx = await getOrganizacionContext();
    if (!ctx) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const leadId = params.id;
    if (!leadId) return NextResponse.json({ error: 'Falta el id del lead' }, { status: 400 });

    const { supabase, lead } = await leadDeLaOrg(leadId, ctx.organizacionId);
    if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });

    const { data, error } = await supabase
      .from('lead_lineas')
      .select('id, lead_id, catalogo_id, cantidad, precio, nombre')
      .eq('lead_id', leadId)
      .eq('organizacion_id', ctx.organizacionId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    return NextResponse.json(
      { lineas: data || [] },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const ctx = await getOrganizacionContext();
    if (!ctx) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const leadId = params.id;
    if (!leadId) return NextResponse.json({ error: 'Falta el id del lead' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const parsed = parseLeadLineasInput(body.lineas);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { supabase, lead } = await leadDeLaOrg(leadId, ctx.organizacionId);
    if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });

    if (parsed.lineas.some((linea) => linea.catalogo_id)) {
      const ids = [...new Set(parsed.lineas.map((linea) => linea.catalogo_id).filter(Boolean))] as string[];
      const { data: catalogo, error: catError } = await supabase
        .from('chat_catalogo')
        .select('id')
        .eq('organizacion_id', ctx.organizacionId)
        .in('id', ids);
      if (catError) throw catError;
      const encontrados = new Set((catalogo || []).map((row) => row.id));
      const ajeno = ids.find((id) => !encontrados.has(id));
      if (ajeno) {
        return NextResponse.json({ error: 'Hay un producto que no está en el catálogo de tu equipo' }, { status: 400 });
      }
    }

    await replaceLeadLineas(supabase, {
      leadId,
      organizacionId: ctx.organizacionId,
      lineas: parsed.lineas,
    });

    const { data, error } = await supabase
      .from('lead_lineas')
      .select('id, lead_id, catalogo_id, cantidad, precio, nombre')
      .eq('lead_id', leadId)
      .eq('organizacion_id', ctx.organizacionId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    return NextResponse.json({ lineas: data || [] });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
