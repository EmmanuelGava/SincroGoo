export type QuotedMessageMeta = {
  wa_message_id: string;
  text: string;
  from_me?: boolean;
  participant?: string;
};

export type ReplyToMessage = {
  id: string;
  wa_message_id?: string | null;
  contenido: string;
  remitente?: string;
  metadata?: Record<string, unknown> | null;
};

export function truncateQuotedText(text: string, max = 120): string {
  const trimmed = String(text || '').replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function quotedPreviewLabel(mensaje: ReplyToMessage): string {
  const meta = mensaje.metadata && typeof mensaje.metadata === 'object' ? mensaje.metadata : {};
  const fileType = String(meta.file_type || '').toLowerCase();
  if (fileType === 'image') return 'Imagen';
  if (fileType === 'audio') return 'Audio';
  if (fileType === 'video') return 'Video';
  if (fileType === 'file') return String(meta.file_name || 'Archivo');
  const text = String(mensaje.contenido || '').trim();
  if (/^\[(Imagen|Audio|Video|Archivo)\]$/i.test(text)) {
    return text.replace(/[[\]]/g, '');
  }
  return truncateQuotedText(text);
}

export function buildQuotedMeta(
  replyTo: ReplyToMessage,
  remoteJid?: string | null
): QuotedMessageMeta | null {
  const waMessageId = replyTo.wa_message_id
    || (replyTo.metadata?.wa_message_id ? String(replyTo.metadata.wa_message_id) : '');
  if (!waMessageId) return null;
  return {
    wa_message_id: waMessageId,
    text: quotedPreviewLabel(replyTo),
    from_me: Boolean(replyTo.metadata?.direction === 'outgoing' || replyTo.remitente === 'yo'),
    ...(remoteJid ? { participant: remoteJid } : {}),
  };
}

/** Stub mínimo para Baileys sendMessage(..., { quoted }). */
export function buildBaileysQuotedStub(
  remoteJid: string,
  quoted: QuotedMessageMeta
) {
  return {
    key: {
      remoteJid: quoted.participant || remoteJid,
      fromMe: Boolean(quoted.from_me),
      id: quoted.wa_message_id,
    },
    message: {
      conversation: quoted.text || '',
    },
  };
}
