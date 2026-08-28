import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';

type RouteContext = { params: { id: string } };

/** PATCH /api/organizacion/miembros/[id] — cambiar rol (admin). */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const ctx = await getOrganizacionContext();
    if (!ctx) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    if (ctx.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    }

    const targetId = params.id;
    const body = await req.json().catch(() => ({}));
    const rol = body.rol === 'admin' ? 'admin' : 'agente';

    if (targetId === ctx.usuarioId && rol !== 'admin') {
      return NextResponse.json(
        { error: 'No podés quitarte el rol de administrador' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('organizacion_miembros')
      .update({ rol })
      .eq('organizacion_id', ctx.organizacionId)
      .eq('usuario_id', targetId)
      .select('usuario_id, rol')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ miembro: data });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

/** DELETE /api/organizacion/miembros/[id] — quitar miembro (admin). */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const ctx = await getOrganizacionContext();
    if (!ctx) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    if (ctx.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    }

    const targetId = params.id;
    if (targetId === ctx.usuarioId) {
      return NextResponse.json({ error: 'No podés quitarte a vos mismo' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('organizacion_miembros')
      .delete()
      .eq('organizacion_id', ctx.organizacionId)
      .eq('usuario_id', targetId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
