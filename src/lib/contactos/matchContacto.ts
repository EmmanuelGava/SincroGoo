import type { SupabaseClient } from '@supabase/supabase-js';
import { telefonoDigits } from '@/lib/contactos/normalizarTelefono';
import { usuarioUuidFromGoogleId } from '@/lib/contactos/usuarioGoogle';

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
