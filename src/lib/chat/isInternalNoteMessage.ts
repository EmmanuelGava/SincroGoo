export type InternalNoteLike = {
  tipo?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function isInternalNoteMessage(mensaje: InternalNoteLike): boolean {
  const meta = mensaje.metadata && typeof mensaje.metadata === 'object' ? mensaje.metadata : {};
  return (
    meta.internal_note === true
    || meta.direction === 'internal'
    || String(mensaje.tipo || '').toLowerCase() === 'nota_interna'
  );
}
