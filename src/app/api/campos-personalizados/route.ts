import { NextRequest, NextResponse } from 'next/server';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { isCampoEntidad, parseCampoDefinicionNueva } from '@/lib/crm/camposPersonalizados';
import { CAMPO_SELECT, listarCamposPersonalizados } from '@/lib/crm/camposPersonalizadosDb';

const MAX_CAMPOS_POR_ENTIDAD = 30;

export async function GET(req: NextRequest) {
  try {
    const ctx = await getOrganizacionContext();
    if (!ctx) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const entidadParam = req.nextUrl.searchParams.get('entidad');
    const entidad = isCampoEntidad(entidadParam) ? entidadParam : undefined;
    const campos = await listarCamposPersonalizados(getSupabaseAdmin(), ctx.organizacionId, entidad);
    return NextResponse.json({ campos, es_admin: ctx.rol === 'admin' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const { error: message, status } = formatErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getOrganizacionContext();
    if (!ctx) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (ctx.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden crear campos' }, { status: 403 });
    }

    const parsed = parseCampoDefinicionNueva(await req.json().catch(() => ({})));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const existentes = await listarCamposPersonalizados(supabase, ctx.organizacionId, parsed.value.entidad);
    if (existentes.length >= MAX_CAMPOS_POR_ENTIDAD) {
      return NextResponse.json({ error: `Hasta ${MAX_CAMPOS_POR_ENTIDAD} campos por tipo` }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('campos_personalizados')
      .insert({
        ...parsed.value,
        organizacion_id: ctx.organizacionId,
        orden: existentes.reduce((max, c) => Math.max(max, c.orden), -1) + 1,
      })
      .select(CAMPO_SELECT)
      .single();
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un campo con ese nombre' }, { status: 409 });
    }
    if (error) throw error;
    return NextResponse.json({ campo: data }, { status: 201 });
  } catch (error) {
    const { error: message, status } = formatErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
