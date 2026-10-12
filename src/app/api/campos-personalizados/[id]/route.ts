import { NextRequest, NextResponse } from 'next/server';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { parseCampoDefinicionPatch, type CampoDefinicion } from '@/lib/crm/camposPersonalizados';
import { CAMPO_SELECT } from '@/lib/crm/camposPersonalizadosDb';

type RouteContext = { params: { id: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function adminYCampo(id: string) {
  const ctx = await getOrganizacionContext();
  if (!ctx) return { response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  if (ctx.rol !== 'admin') {
    return { response: NextResponse.json({ error: 'Solo administradores pueden editar campos' }, { status: 403 }) };
  }
  if (!UUID_RE.test(id)) return { response: NextResponse.json({ error: 'Id inválido' }, { status: 400 }) };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('campos_personalizados')
    .select(CAMPO_SELECT)
    .eq('id', id)
    .eq('organizacion_id', ctx.organizacionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { response: NextResponse.json({ error: 'Campo no encontrado' }, { status: 404 }) };
  return { supabase, ctx, campo: data as CampoDefinicion };
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const found = await adminYCampo(params.id);
    if ('response' in found) return found.response;

    const parsed = parseCampoDefinicionPatch(await req.json().catch(() => ({})), found.campo);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { data, error } = await found.supabase
      .from('campos_personalizados')
      .update({ ...parsed.value, updated_at: new Date().toISOString() })
      .eq('id', found.campo.id)
      .eq('organizacion_id', found.ctx.organizacionId)
      .select(CAMPO_SELECT)
      .single();
    if (error) throw error;
    return NextResponse.json({ campo: data });
  } catch (error) {
    const { error: message, status } = formatErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

/** Borra la definición; los valores ya cargados quedan guardados pero no se muestran. */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const found = await adminYCampo(params.id);
    if ('response' in found) return found.response;

    const { error } = await found.supabase
      .from('campos_personalizados')
      .delete()
      .eq('id', found.campo.id)
      .eq('organizacion_id', found.ctx.organizacionId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: message, status } = formatErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
