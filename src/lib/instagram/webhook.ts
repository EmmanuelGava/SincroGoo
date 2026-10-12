import { createHmac, timingSafeEqual } from 'crypto';

export type InstagramAttachmentKind = 'image' | 'audio' | 'video' | 'file';

export type InstagramAttachment = {
  kind: InstagramAttachmentKind | null;
  type: string;
  url: string | null;
  placeholder: string;
};

export type InstagramMessagingEvent = {
  igAccountId: string;
  senderId: string;
  recipientId: string;
  /** IGSID del cliente: el que no es la cuenta del negocio. */
  customerId: string;
  timestamp: Date;
  mid: string;
  text: string;
  attachments: InstagramAttachment[];
  isEcho: boolean;
};

export function verifyInstagramSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret) return false;
  const [algo, received] = signatureHeader.split('=');
  if (algo !== 'sha256' || !received) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(received, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

const ATTACHMENT_PLACEHOLDERS: Record<string, string> = {
  image: '[Imagen]',
  animated_image: '[GIF]',
  audio: '[Audio]',
  video: '[Video]',
  file: '[Archivo]',
  share: '[Publicación compartida]',
  ig_post: '[Publicación compartida]',
  reel: '[Reel compartido]',
  ig_reel: '[Reel compartido]',
  story_mention: '[Te mencionó en una historia]',
};

export function classifyInstagramAttachment(raw: unknown): InstagramAttachment {
  const node = (raw && typeof raw === 'object' ? raw : {}) as {
    type?: string;
    payload?: { url?: string };
  };
  const type = String(node.type || 'unknown');
  const url = typeof node.payload?.url === 'string' ? node.payload.url : null;
  const kind: InstagramAttachmentKind | null =
    type === 'image' || type === 'animated_image'
      ? 'image'
      : type === 'audio'
        ? 'audio'
        : type === 'video'
          ? 'video'
          : type === 'file'
            ? 'file'
            : null;
  return { kind, type, url, placeholder: ATTACHMENT_PLACEHOLDERS[type] || '[Adjunto]' };
}

/**
 * Extrae los mensajes de un POST del webhook de Instagram.
 * Ignora borrados, mensajes no soportados, reacciones y "visto".
 */
export function parseInstagramWebhook(body: unknown): InstagramMessagingEvent[] {
  const root = (body && typeof body === 'object' ? body : {}) as {
    object?: string;
    entry?: Array<{ id?: string; messaging?: unknown[] }>;
  };
  if (root.object !== 'instagram' || !Array.isArray(root.entry)) return [];

  const events: InstagramMessagingEvent[] = [];
  for (const entry of root.entry) {
    const igAccountId = String(entry?.id || '');
    if (!igAccountId || !Array.isArray(entry.messaging)) continue;

    for (const item of entry.messaging) {
      const m = (item && typeof item === 'object' ? item : {}) as {
        sender?: { id?: string };
        recipient?: { id?: string };
        timestamp?: number;
        message?: {
          mid?: string;
          text?: string;
          attachments?: unknown[];
          is_echo?: boolean;
          is_deleted?: boolean;
          is_unsupported?: boolean;
        };
      };
      const message = m.message;
      if (!message?.mid || message.is_deleted || message.is_unsupported) continue;

      const senderId = String(m.sender?.id || '');
      const recipientId = String(m.recipient?.id || '');
      if (!senderId || !recipientId) continue;

      const isEcho = Boolean(message.is_echo) || senderId === igAccountId;
      const attachments = Array.isArray(message.attachments)
        ? message.attachments.map(classifyInstagramAttachment)
        : [];

      events.push({
        igAccountId,
        senderId,
        recipientId,
        customerId: isEcho ? recipientId : senderId,
        timestamp: new Date(Number(m.timestamp) || Date.now()),
        mid: String(message.mid),
        text: typeof message.text === 'string' ? message.text : '',
        attachments,
        isEcho,
      });
    }
  }
  return events;
}

export function instagramRemitente(igsid: string): string {
  return `ig_${igsid}`;
}

export function igsidFromRemitente(remitente: string | null | undefined): string | null {
  const raw = String(remitente || '');
  return raw.startsWith('ig_') && raw.length > 3 ? raw.slice(3) : null;
}

export function instagramMessageId(mid: string): string {
  return `ig_${mid}`;
}
