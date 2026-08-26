import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseAdmin, getUsuarioIdFromSession } from '@/lib/supabase/client';
import { formatErrorResponse } from '@/lib/supabase/utils/error-handler';

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const client = await getUserSupabaseClient();
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { supabase, userId } = client;
    const { id: conversacionId } = await params;

    const { data: conversacion, error: convError } = await supabase
      .from('conversaciones')
      .select('id, lead_id, contacto_id')
      .eq('id', conversacionId)
      .maybeSingle();

    if (convError || !conversacion) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
    }

    if (conversacion.lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id, nombre, estado_id')
        .eq('id', conversacion.lead_id)
        .eq('asignado_a', userId)
        .maybeSingle();
      return NextResponse.json({ leadId: conversacion.lead_id, lead: lead || null });
    }

    if (conversacion.contacto_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id, nombre, estado_id')
        .eq('contacto_id', conversacion.contacto_id)
        .eq('asignado_a', userId)
        .order('fecha_creacion', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lead?.id) {
        return NextResponse.json({ leadId: lead.id, lead });
      }
    }

    return NextResponse.json({ leadId: null, lead: null });
  } catch (error) {
    const { error: errorMessage, status } = formatErrorResponse(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
