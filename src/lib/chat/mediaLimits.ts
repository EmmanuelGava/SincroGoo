export const MEDIA_LIMITS = {
  image: {
    maxBytes: 5 * 1024 * 1024,
    types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  audio: {
    maxBytes: 16 * 1024 * 1024,
    types: ['audio/ogg', 'audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/aac'],
  },
  video: {
    maxBytes: 16 * 1024 * 1024,
    types: ['video/mp4'],
  },
  file: {
    maxBytes: 100 * 1024 * 1024,
    types: ['application/pdf'],
  },
} as const;

export type OutgoingMediaKind = 'image' | 'audio';

export type MediaInput = {
  type?: string;
  size: number;
  name?: string;
};

export type ValidateOutgoingMediaResult =
  | { ok: true; kind: OutgoingMediaKind }
  | { ok: false; error: string };

const IMAGE_TYPES = new Set<string>(MEDIA_LIMITS.image.types);
const AUDIO_TYPES = new Set<string>([
  ...MEDIA_LIMITS.audio.types,
  'audio/opus',
  'audio/wav',
  'audio/x-wav',
]);

export function normalizeOutgoingMime(type: string): string {
  const base = (type || '').split(';')[0].trim().toLowerCase();
  if (base === 'image/jpg') return 'image/jpeg';
  if (base === 'audio/mp3') return 'audio/mpeg';
  if (base === 'audio/opus') return 'audio/ogg';
  return base;
}

export function classifyOutgoingMedia(type: string): 'image' | 'audio' | 'video' | 'file' | null {
  const mime = normalizeOutgoingMime(type);
  if (IMAGE_TYPES.has(mime)) return 'image';
  if (AUDIO_TYPES.has(mime) || mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if ((MEDIA_LIMITS.file.types as readonly string[]).includes(mime)) return 'file';
  return null;
}

export function validateOutgoingMedia(input: MediaInput): ValidateOutgoingMediaResult {
  const mime = normalizeOutgoingMime(input.type || '');
  const kind = classifyOutgoingMedia(mime);

  if (kind === 'video') {
    return { ok: false, error: 'El video aún no se puede enviar por este chat' };
  }

  if (kind === 'file') {
    return { ok: false, error: 'Los documentos aún no se pueden enviar por este chat' };
  }

  if (kind === 'image' && !IMAGE_TYPES.has(mime)) {
    return { ok: false, error: 'Solo se permiten imágenes JPG, PNG, WEBP o GIF' };
  }

  if (kind === 'audio' && !AUDIO_TYPES.has(mime) && !mime.startsWith('audio/')) {
    return { ok: false, error: 'Solo se permiten imágenes o audio' };
  }

  if (kind !== 'image' && kind !== 'audio') {
    return { ok: false, error: 'Solo se permiten imágenes o audio' };
  }

  if (kind === 'image' && input.size > MEDIA_LIMITS.image.maxBytes) {
    return { ok: false, error: 'La imagen no puede superar 5 MB' };
  }

  if (kind === 'audio' && input.size > MEDIA_LIMITS.audio.maxBytes) {
    return { ok: false, error: 'Audio máximo 16 MB' };
  }

  return { ok: true, kind };
}

export function dropzoneRejectMessage(errors: Array<{ code: string }>, fileType?: string): string {
  const mime = normalizeOutgoingMime(fileType || '');
  if (mime.startsWith('video/')) {
    return 'El video aún no se puede enviar por este chat';
  }
  if (errors.some((e) => e.code === 'file-too-large')) {
    return 'La imagen no puede superar 5 MB';
  }
  if (errors.some((e) => e.code === 'file-invalid-type')) {
    return 'Solo se permiten imágenes JPG, PNG, WEBP o GIF';
  }
  return 'Archivo no válido';
}
