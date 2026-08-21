import type { SupabaseClient } from '@supabase/supabase-js';
import { isUniquePhoneViolation } from '@/lib/contactos/contactoWrite';
import { isEstadoTerminal } from '@/lib/contactos/estadoLead';
import { telefonoDigits } from '@/lib/contactos/normalizarTelefono';
import { usuarioUuidFromGoogleId } from '@/lib/contactos/usuarioGoogle';

export type LeadConEstado = {
  id: string;
  nombre: string;
  estado_id: string;
  estados_lead?: { nombre?: string } | { nombre?: string }[] | null;
};

export type OpenLeadChoice = { id: string; nombre: string; estado_id: string };

export type KanbanIncomingAction =
  | { action: 'reuse'; reuseLeadId: string }
  | { action: 'create' }
  | { action: 'needsChoice'; openLead: OpenLeadChoice; contactoId: string };

export function leadEstadoNombre(
  estadosLead: LeadConEstado['estados_lead']
): string {
  if (!estadosLead) return '';
  const row = Array.isArray(estadosLead) ? estadosLead[0] : estadosLead;
  return row?.nombre || '';
}

export function findOpenLead<T extends LeadConEstado>(leads: T[]): T | undefined {
  return leads.find((lead) => !isEstadoTerminal(leadEstadoNombre(lead.estados_lead)));
}

export function decideKanbanIncomingAction(opts: {
  contactoId: string | null;
  openLead: OpenLeadChoice | null;
  reuseLeadId?: string;
  forceNewLead?: boolean;
}): KanbanIncomingAction {
  if (opts.reuseLeadId) return { action: 'reuse', reuseLeadId: opts.reuseLeadId };
  if (opts.forceNewLead) return { action: 'create' };
  if (opts.contactoId && opts.openLead) {
    return { action: 'needsChoice', openLead: opts.openLead, contactoId: opts.contactoId };
  }
  return { action: 'create' };
}

export async function upsertContactoPorTelefono(
  supabase: SupabaseClient,
  input: {
    usuarioId: string;
    nombre: string;
    telefonoDisplay: string | null;
    waJid?: string | null;
  }
): Promise<string | null> {
  const digits = telefonoDigits(input.telefonoDisplay);
  const payload = {
    usuario_id: input.usuarioId,
    nombre: input.nombre,
    telefono: input.telefonoDisplay,
    wa_jid: input.waJid ?? null,
  };

  if (!digits) {
    const { data } = await supabase
      .from('contactos')
      .insert(payload)
      .select('id')
      .single();
    return data?.id ?? null;
  }

  const selectExisting = async () => {
    const { data } = await supabase
      .from('contactos')
      .select('id')
      .eq('usuario_id', input.usuarioId)
      .eq('telefono_digits', digits)
      .maybeSingle();
    return data?.id ?? null;
  };

  const updateNombre = async (id: string) => {
    const patch: Record<string, unknown> = { nombre: input.nombre };
    if (input.telefonoDisplay) patch.telefono = input.telefonoDisplay;
    if (input.waJid) patch.wa_jid = input.waJid;
    await supabase.from('contactos').update(patch).eq('id', id);
  };

  const existingId = await selectExisting();
  if (existingId) {
    await updateNombre(existingId);
    return existingId;
  }

  const { data, error } = await supabase
    .from('contactos')
    .insert({ ...payload, telefono_digits: digits })
    .select('id')
    .single();

  if (error && isUniquePhoneViolation(error)) {
    const racedId = await selectExisting();
    if (racedId) await updateNombre(racedId);
    return racedId;
  }

  return data?.id ?? null;
}

export type IncomingLinkDecision =
  | { action: 'keep'; contactoId: string }
  | { action: 'lookup'; telefonoDigits: string }
  | { action: 'skip' };

export function decideIncomingContactLink(opts: {
  existingContactoId?: string | null;
  telefonoDigits?: string | null;
}): IncomingLinkDecision {
  if (opts.existingContactoId) return { action: 'keep', contactoId: opts.existingContactoId };
  if (opts.telefonoDigits) return { action: 'lookup', telefonoDigits: opts.telefonoDigits };
  return { action: 'skip' };
}

export async function linkConversacionAContactoSiExiste(
  supabase: SupabaseClient,
  opts: {
    conversacionId: string;
    googleUserId: string | null | undefined;
    existingContactoId?: string | null;
    rawPhone?: string | null;
  }
): Promise<string | null> {
  const decision = decideIncomingContactLink({
    existingContactoId: opts.existingContactoId,
    telefonoDigits: telefonoDigits(opts.rawPhone),
  });
  if (decision.action === 'keep') return decision.contactoId;
  if (decision.action === 'skip') return null;
  const usuarioUuid = await usuarioUuidFromGoogleId(supabase, opts.googleUserId);
  if (!usuarioUuid) return null;
  const { data } = await supabase
    .from('contactos')
    .select('id')
    .eq('usuario_id', usuarioUuid)
    .eq('telefono_digits', decision.telefonoDigits)
    .maybeSingle();
  if (!data?.id) return null;
  await supabase
    .from('conversaciones')
    .update({ contacto_id: data.id })
    .eq('id', opts.conversacionId)
    .is('contacto_id', null);
  return data.id;
}
