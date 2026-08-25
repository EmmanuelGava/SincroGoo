export type MessageDirectionInput = {
  usuario_id?: string | null;
  fecha_mensaje?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function isOutgoingMessage(msg: MessageDirectionInput): boolean {
  if (msg.usuario_id) return true;
  const meta = msg.metadata && typeof msg.metadata === 'object' ? msg.metadata : {};
  if (meta.direction === 'outgoing') return true;
  if (meta.fromMe === true || meta.fromMe === 'true') return true;
  return false;
}

export function sortMessagesChronologically<T extends MessageDirectionInput>(
  mensajes: T[] | null | undefined
): T[] {
  return [...(mensajes || [])].sort(
    (a, b) => new Date(a.fecha_mensaje || 0).getTime() - new Date(b.fecha_mensaje || 0).getTime()
  );
}
