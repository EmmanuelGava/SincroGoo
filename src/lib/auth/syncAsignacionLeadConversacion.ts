import type { SupabaseClient } from '@supabase/supabase-js';

/** Sincroniza conversaciones.asignado_a con el lead vinculado. */
export async function syncConversacionesAsignadoFromLead(
  supabase: SupabaseClient,
  leadId: string,
  asignadoA: string | null,
  organizacionId: string
): Promise<void> {
  await supabase
    .from('conversaciones')
    .update({ asignado_a: asignadoA })
    .eq('lead_id', leadId)
    .eq('organizacion_id', organizacionId);
}

/** Sincroniza lead.asignado_a cuando se asigna una conversación con lead vinculado. */
export async function syncLeadAsignadoFromConversacion(
  supabase: SupabaseClient,
  conversacionId: string,
  asignadoA: string | null,
  organizacionId: string
): Promise<void> {
  const { data: conv } = await supabase
    .from('conversaciones')
    .select('lead_id')
    .eq('id', conversacionId)
    .eq('organizacion_id', organizacionId)
    .maybeSingle();

  if (!conv?.lead_id) return;

  await supabase
    .from('leads')
    .update({ asignado_a: asignadoA })
    .eq('id', conv.lead_id)
    .eq('organizacion_id', organizacionId);
}
