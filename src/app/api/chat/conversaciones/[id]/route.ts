import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import { getOrganizacionContext, isMiembroOrganizacion } from '@/lib/auth/getOrganizacionContext';
import { syncLeadAsignadoFromConversacion } from '@/lib/auth/syncAsignacionLeadConversacion';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const ctx = await getOrganizacionContext(session);
    if (!ctx) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const conversacionId = params.id;
    if (!conversacionId) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    const body = await req.json();
    const patch: Record<string, unknown> = {};

    if (typeof body.archived === 'boolean') {
      patch.archived_at = body.archived ? new Date().toISOString() : null;
    }

    if ('asignado_a' in body) {
      if (body.asignado_a) {
        const valido = await isMiembroOrganizacion(ctx.organizacionId, body.asignado_a);
        if (!valido) {
          return NextResponse.json(
            { error: 'El asignado debe ser miembro de tu organización' },
            { status: 400 }
          );
        }
        patch.asignado_a = body.asignado_a;
      } else {
        patch.asignado_a = null;
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('conversaciones')
      .update(patch)
      .eq('id', conversacionId)
      .eq('organizacion_id', ctx.organizacionId)
      .select('id, archived_at, asignado_a, lead_id')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
    }

    if ('asignado_a' in patch) {
      await syncLeadAsignadoFromConversacion(
        supabase,
        conversacionId,
        (patch.asignado_a as string | null) ?? null,
        ctx.organizacionId
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      archived_at: data.archived_at,
      asignado_a: data.asignado_a,
    });
  } catch (error) {
    console.error('Error actualizando conversación:', error);
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
