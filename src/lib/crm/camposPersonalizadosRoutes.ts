import { NextRequest, NextResponse } from 'next/server';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import type { CampoEntidad } from './camposPersonalizados';
import {
  guardarValoresCampos,
  leerValoresCampos,
  listarCamposPersonalizados,
} from './camposPersonalizadosDb';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET de definiciones + valores de un lead o contacto de la organización. */
export async function getCamposDeEntidad(entidad: CampoEntidad, id: string) {
  try {
    const ctx = await getOrganizacionContext();
    if (!ctx) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Id inválido' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const campos = await leerValoresCampos(supabase, entidad, id, ctx.organizacionId);
    if (campos === null) {
      return NextResponse.json({ error: entidad === 'lead' ? 'Lead no encontrado' : 'Contacto no encontrado' }, { status: 404 });
    }
    const definiciones = await listarCamposPersonalizados(supabase, ctx.organizacionId, entidad);
    return NextResponse.json({ definiciones, campos }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const { error: message, status } = formatErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

/** PUT parcial: solo cambia las claves enviadas; vacío borra. */
export async function putCamposDeEntidad(entidad: CampoEntidad, id: string, req: NextRequest) {
  try {
    const ctx = await getOrganizacionContext();
    if (!ctx) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Id inválido' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const result = await guardarValoresCampos(getSupabaseAdmin(), entidad, id, ctx.organizacionId, body?.campos);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ campos: result.campos });
  } catch (error) {
    const { error: message, status } = formatErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
