import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';

/** POST /api/organizacion/aceptar-invitacion — une al usuario a la org del token. */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getOrganizacionContext();
    if (!ctx) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    if (!token) {
      return NextResponse.json({ error: 'token requerido' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: invitacion, error: invError } = await supabase
      .from('organizacion_invitaciones')
      .select('id, organizacion_id, rol, usado_por, expira_at')
      .eq('token', token)
      .maybeSingle();

    if (invError) throw invError;
    if (!invitacion) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
    }
    if (invitacion.usado_por) {
      return NextResponse.json({ error: 'Esta invitación ya fue usada' }, { status: 410 });
    }
    if (new Date(invitacion.expira_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'La invitación expiró' }, { status: 410 });
    }

    const { data: existente } = await supabase
      .from('organizacion_miembros')
      .select('organizacion_id')
      .eq('usuario_id', ctx.usuarioId)
      .eq('organizacion_id', invitacion.organizacion_id)
      .maybeSingle();

    if (!existente) {
      const { error: miembroError } = await supabase.from('organizacion_miembros').insert({
        organizacion_id: invitacion.organizacion_id,
        usuario_id: ctx.usuarioId,
        rol: invitacion.rol,
      });
      if (miembroError) throw miembroError;
    }

    await supabase
      .from('usuarios')
      .update({ organizacion_id: invitacion.organizacion_id })
      .eq('id', ctx.usuarioId);

    await supabase
      .from('organizacion_invitaciones')
      .update({ usado_por: ctx.usuarioId })
      .eq('id', invitacion.id);

    return NextResponse.json({
      success: true,
      organizacion_id: invitacion.organizacion_id,
      rol: invitacion.rol,
    });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
