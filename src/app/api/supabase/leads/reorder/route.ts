import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';
import type { KanbanLeadOrderUpdate } from '@/lib/crm/kanbanOrder';

type ReorderBody = {
  updates?: KanbanLeadOrderUpdate[];
};

async function getUserSupabaseClient(): Promise<{ supabase: ReturnType<typeof getSupabaseAdmin>; userId: string } | null> {
  const usuarioId = await getUsuarioIdFromSession();
  if (!usuarioId) return null;
  try {
    const { supabase } = await getSupabaseClient(true);
    return { supabase, userId: usuarioId };
  } catch {
    return { supabase: getSupabaseAdmin(), userId: usuarioId };
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await getUserSupabaseClient();
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { supabase, userId } = client;
    const body = (await request.json()) as ReorderBody;
    const updates = Array.isArray(body.updates) ? body.updates : [];

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Faltan updates de orden' }, { status: 400 });
    }

    for (const update of updates) {
      if (!update?.id || !update.estado_id || typeof update.orden !== 'number') {
        return NextResponse.json({ error: 'Update de orden inválido' }, { status: 400 });
      }
    }

    const ids = [...new Set(updates.map((update) => update.id))];
    const { data: ownedLeads, error: ownedError } = await supabase
      .from('leads')
      .select('id')
      .eq('asignado_a', userId)
      .in('id', ids);

    if (ownedError) throw ownedError;
    if ((ownedLeads || []).length !== ids.length) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    const results = await Promise.all(
      updates.map((update) =>
        supabase
          .from('leads')
          .update({ estado_id: update.estado_id, orden: update.orden })
          .eq('id', update.id)
          .eq('asignado_a', userId)
          .select('id, estado_id, orden')
          .single(),
      ),
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;

    return NextResponse.json({
      ok: true,
      updated: results.map((result) => result.data).filter(Boolean),
    });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
