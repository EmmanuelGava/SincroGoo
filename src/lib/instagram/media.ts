import type { SupabaseClient } from '@supabase/supabase-js';
import type { InstagramAttachmentKind } from './webhook';

const MAX_BYTES = 16 * 1024 * 1024;

const BUCKETS: Record<InstagramAttachmentKind, { bucket: string; maxBytes: number }> = {
  image: { bucket: 'chat-images', maxBytes: 10 * 1024 * 1024 },
  audio: { bucket: 'chat-audio', maxBytes: MAX_BYTES },
  video: { bucket: 'chat-files', maxBytes: MAX_BYTES },
  file: { bucket: 'chat-files', maxBytes: MAX_BYTES },
};

const DEFAULT_MIME: Record<InstagramAttachmentKind, string> = {
  image: 'image/jpeg',
  audio: 'audio/mp4',
  video: 'video/mp4',
  file: 'application/octet-stream',
};

function extensionFor(kind: InstagramAttachmentKind, mime: string): string {
  const sub = mime.split('/')[1] || '';
  if (sub === 'jpeg') return 'jpg';
  if (kind === 'audio' && sub === 'mp4') return 'm4a';
  if (/^[a-z0-9]{2,5}$/.test(sub)) return sub;
  return kind === 'image' ? 'jpg' : kind === 'audio' ? 'm4a' : kind === 'video' ? 'mp4' : 'bin';
}

export type PersistedInstagramMedia = {
  file_url: string;
  file_type: InstagramAttachmentKind;
  file_name: string;
  file_size: number;
  mime_type: string;
};

/** Las URLs de adjuntos de Meta vencen: se copian a Storage. */
export async function persistInstagramMedia(
  supabase: SupabaseClient,
  opts: { url: string; kind: InstagramAttachmentKind; ownerId: string; mid: string }
): Promise<PersistedInstagramMedia | null> {
  const { bucket, maxBytes } = BUCKETS[opts.kind];
  try {
    const res = await fetch(opts.url);
    if (!res.ok) {
      console.warn('⚠️ No se pudo bajar adjunto de Instagram:', res.status);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length || buffer.length > maxBytes) {
      console.warn('⚠️ Adjunto de Instagram omitido por tamaño:', buffer.length);
      return null;
    }

    let mime = String(res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!mime || mime === 'application/octet-stream' || !mime.startsWith(opts.kind === 'file' ? '' : opts.kind)) {
      mime = DEFAULT_MIME[opts.kind];
    }
    const ext = extensionFor(opts.kind, mime);
    const safeMid = opts.mid.replace(/[^a-zA-Z0-9_-]/g, '').slice(-80);
    const path = `${opts.ownerId}/in/ig_${safeMid}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      cacheControl: '3600',
      upsert: true,
      contentType: mime,
    });
    if (error) {
      console.warn('⚠️ No se pudo subir adjunto de Instagram:', error.message);
      return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (!data?.publicUrl) return null;

    return {
      file_url: data.publicUrl,
      file_type: opts.kind,
      file_name: `${opts.kind}.${ext}`,
      file_size: buffer.length,
      mime_type: mime,
    };
  } catch (error) {
    console.warn('⚠️ Error copiando adjunto de Instagram:', error);
    return null;
  }
}
