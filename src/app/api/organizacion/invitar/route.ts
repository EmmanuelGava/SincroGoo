import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';

/** POST /api/organizacion/invitar — admin genera link de invitación (v1). */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getOrganizacionContext();
    if (!ctx) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    if (ctx.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden invitar' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = body.email ? String(body.email).trim() : null;
    const rol = body.rol === 'admin' ? 'admin' : 'agente';
    const diasValidez = Number(body.dias_validez) || 7;

    const token = randomBytes(24).toString('hex');
    const expiraAt = new Date();
    expiraAt.setDate(expiraAt.getDate() + diasValidez);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('organizacion_invitaciones')
      .insert({
        organizacion_id: ctx.organizacionId,
        token,
        email,
        rol,
        creado_por: ctx.usuarioId,
        expira_at: expiraAt.toISOString(),
      })
      .select('id, token, expira_at, rol, email')
      .single();

    if (error) throw error;

    const origin = req.nextUrl.origin;
    const inviteUrl = `${origin}/invitar?token=${encodeURIComponent(token)}`;

    return NextResponse.json({
      invitacion: data,
      invite_url: inviteUrl,
    });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
