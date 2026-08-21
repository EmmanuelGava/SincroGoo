import { downloadMediaMessage, type WAMessage, type WASocket } from 'baileys';
import { createClient } from '@supabase/supabase-js';

export const INCOMING_MEDIA_MAX_BYTES = 16 * 1024 * 1024;

export type IncomingMediaKind = 'image' | 'audio' | 'video' | 'file';

export type ClassifiedIncomingMedia = {
  kind: IncomingMediaKind | null;
  caption: string | null;
  mimetype?: string;
  fileName?: string;
  duration?: number;
  placeholder: string;
};

const IMAGE_BUCKET = 'chat-images';
const AUDIO_BUCKET = 'chat-audio';
const FILE_BUCKET = 'chat-files';

export function incomingMediaBucket(kind: IncomingMediaKind): string {
  if (kind === 'audio') return AUDIO_BUCKET;
  if (kind === 'file') return FILE_BUCKET;
  return IMAGE_BUCKET;
}

export function incomingFileFallbackMeta(classified: ClassifiedIncomingMedia): {
  file_type: 'file';
  file_name: string;
  mime_type: string;
} {
  const mime = String(classified.mimetype || '').split(';')[0].trim() || 'application/octet-stream';
  return {
    file_type: 'file',
    file_name: classified.fileName || 'documento',
    mime_type: mime,
  };
}

function unwrapMessage(message: any): any {
  if (!message) return null;
  const nested =
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message ||
    message.documentWithCaptionMessage?.message ||
    message.editedMessage?.message;
  if (nested) return unwrapMessage(nested);
  return message;
}

export function classifyIncomingWaMedia(rawMessage: any): ClassifiedIncomingMedia {
  const inner = unwrapMessage(rawMessage) || {};
  const caption =
    inner.conversation ||
    inner.extendedTextMessage?.text ||
    inner.imageMessage?.caption ||
    inner.videoMessage?.caption ||
    inner.documentMessage?.caption ||
    inner.buttonsResponseMessage?.selectedDisplayText ||
    inner.listResponseMessage?.title ||
    inner.templateButtonReplyMessage?.selectedDisplayText ||
    null;

  if (inner.imageMessage || inner.stickerMessage) {
    const node = inner.imageMessage || inner.stickerMessage;
    return {
      kind: 'image',
      caption,
      mimetype: node?.mimetype,
      fileName: node?.fileName,
      placeholder: '[Imagen]',
    };
  }
  if (inner.audioMessage || inner.pttMessage) {
    const node = inner.audioMessage || inner.pttMessage;
    return {
      kind: 'audio',
      caption,
      mimetype: node?.mimetype,
      duration: Number(node?.seconds || 0) || undefined,
      placeholder: '[Audio]',
    };
  }
  if (inner.videoMessage) {
    return {
      kind: 'video',
      caption,
      mimetype: inner.videoMessage?.mimetype,
      placeholder: '[Video]',
    };
  }
  if (inner.documentMessage) {
    return {
      kind: 'file',
      caption,
      mimetype: inner.documentMessage?.mimetype,
      fileName: inner.documentMessage?.fileName,
      placeholder: '[Archivo]',
    };
  }
  return { kind: null, caption, placeholder: caption || '' };
}

export function extensionForIncomingMedia(kind: IncomingMediaKind, mimetype?: string): string {
  const mime = String(mimetype || '').split(';')[0].trim().toLowerCase();
  const fromMime = mime.split('/')[1]?.replace('+xml', '') || '';
  if (fromMime === 'jpeg') return 'jpg';
  if (fromMime === 'svg') return 'svg';
  if (fromMime === 'mpeg') return 'mp3';
  if (fromMime === 'mp4' && kind === 'audio') return 'm4a';
  if (fromMime && /^[a-z0-9]+$/.test(fromMime) && fromMime.length <= 8) return fromMime;
  if (kind === 'audio') return 'ogg';
  if (kind === 'video') return 'mp4';
  if (kind === 'file') return 'bin';
  return 'jpg';
}

function silentLogger() {
  const self = {
    level: 'silent',
    child: () => self,
    trace() {},
    debug() {},
    info() {},
    warn(...args: unknown[]) { console.warn(...args); },
    error(...args: unknown[]) { console.error(...args); },
    fatal(...args: unknown[]) { console.error(...args); },
  };
  return self;
}

function workerStorage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type PersistedIncomingMedia = {
  file_url?: string;
  file_type: IncomingMediaKind;
  file_name: string;
  file_size?: number;
  duration?: number;
  mime_type?: string;
};

export async function persistIncomingWaMedia(opts: {
  socket: WASocket;
  userId: string;
  waMessage: WAMessage;
  classified: ClassifiedIncomingMedia;
}): Promise<PersistedIncomingMedia | null> {
  const kind = opts.classified.kind;
  if (!kind || kind === 'video') return null;

  const fileFallback = kind === 'file' ? incomingFileFallbackMeta(opts.classified) : null;

  const supabase = workerStorage();
  if (!supabase) {
    console.warn('⚠️ No hay service role para subir media entrante');
    return fileFallback;
  }

  let buffer: Buffer;
  try {
    const downloaded = await downloadMediaMessage(
      opts.waMessage,
      'buffer',
      {},
      {
        logger: silentLogger() as never,
        reuploadRequest: opts.socket.updateMediaMessage,
      }
    );
    buffer = Buffer.isBuffer(downloaded) ? downloaded : Buffer.from(downloaded as ArrayBuffer);
  } catch (error) {
    console.warn('⚠️ No se pudo bajar media de WhatsApp:', error);
    return fileFallback;
  }

  if (!buffer.length) return fileFallback;
  if (buffer.length > INCOMING_MEDIA_MAX_BYTES) {
    console.warn('⚠️ Media entrante omitida por tamaño:', buffer.length);
    return fileFallback;
  }

  const ext = extensionForIncomingMedia(kind, opts.classified.mimetype);
  const bucket = incomingMediaBucket(kind);
  const waId = String(opts.waMessage.key?.id || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  const path = `${opts.userId}/in/${waId}.${ext}`;
  const mime = String(opts.classified.mimetype || '').split(';')[0].trim()
    || (kind === 'audio' ? 'audio/ogg' : kind === 'file' ? 'application/octet-stream' : 'image/jpeg');
  const fileName = opts.classified.fileName || `${kind}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    cacheControl: '3600',
    upsert: true,
    contentType: mime,
  });
  if (error) {
    console.warn('⚠️ No se pudo subir media entrante:', error.message);
    return fileFallback;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) return fileFallback;

  return {
    file_url: data.publicUrl,
    file_type: kind,
    file_name: fileName,
    file_size: buffer.length,
    duration: opts.classified.duration,
    mime_type: mime,
  };
}
