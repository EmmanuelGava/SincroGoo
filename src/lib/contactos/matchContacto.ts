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
