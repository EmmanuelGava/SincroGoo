import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { getOrganizacionContext } from '@/lib/auth/getOrganizacionContext';
import { listarEstadosOrganizacion } from '@/lib/crm/estadosLeadDb';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

type RouteContext = { params: { id: string } };

/** Crea lead desde chat reutilizando POST /api/crm/conversaciones/entrantes. */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const ctx = await getOrganizacionContext(session);
    if (!ctx) {
      return NextResponse.json({ error: 'No se pudo identificar al usuario' }, { status: 401 });
    }

    const estados = await listarEstadosOrganizacion(getSupabaseAdmin(), ctx.organizacionId, ctx.usuarioId);
    const estadoId = estados[0]?.id;
    if (!estadoId) {
      return NextResponse.json({ error: 'No hay columnas en el Kanban' }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    const entrantesRes = await fetch(`${origin}/api/crm/conversaciones/entrantes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: req.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        conversationId: params.id,
        estadoId,
        destIndex: 0,
      }),
    });

    const data = await entrantesRes.json();
    if (!entrantesRes.ok) {
      return NextResponse.json({ error: data.error || 'No se pudo crear el lead' }, { status: entrantesRes.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
