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
    maxBytes: 16 * 1024 * 1024,
    types: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
} as const;

export type OutgoingMediaKind = 'image' | 'audio' | 'file';

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
const FILE_TYPES = new Set<string>(MEDIA_LIMITS.file.types);

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
  if (FILE_TYPES.has(mime)) return 'file';
  return null;
}

export function validateOutgoingMedia(input: MediaInput): ValidateOutgoingMediaResult {
  const mime = normalizeOutgoingMime(input.type || '');
  const kind = classifyOutgoingMedia(mime);

  if (kind === 'video') {
    return { ok: false, error: 'El video aún no se puede enviar por este chat' };
  }

  if (kind === 'image' && !IMAGE_TYPES.has(mime)) {
    return { ok: false, error: 'Solo se permiten imágenes JPG, PNG, WEBP o GIF' };
  }

  if (kind === 'audio' && !AUDIO_TYPES.has(mime) && !mime.startsWith('audio/')) {
    return { ok: false, error: 'Solo se permiten imágenes, audio o documentos PDF, Word, Excel o PowerPoint' };
  }

  if (kind !== 'image' && kind !== 'audio' && kind !== 'file') {
    return { ok: false, error: 'Solo se permiten imágenes, audio o documentos PDF, Word, Excel o PowerPoint' };
  }

  if (kind === 'image' && input.size > MEDIA_LIMITS.image.maxBytes) {
    return { ok: false, error: 'La imagen no puede superar 5 MB' };
  }

  if (kind === 'audio' && input.size > MEDIA_LIMITS.audio.maxBytes) {
    return { ok: false, error: 'Audio máximo 16 MB' };
  }

  if (kind === 'file' && input.size > MEDIA_LIMITS.file.maxBytes) {
    return { ok: false, error: 'El documento no puede superar 16 MB' };
  }

  return { ok: true, kind };
}

export function dropzoneRejectMessage(errors: ReadonlyArray<{ code: string }>, fileType?: string): string {
  const mime = normalizeOutgoingMime(fileType || '');
  const kind = classifyOutgoingMedia(mime);
  if (mime.startsWith('video/')) {
    return 'El video aún no se puede enviar por este chat';
  }
  if (errors.some((e) => e.code === 'file-too-large')) {
    if (kind === 'file' || kind === 'audio') return 'El archivo no puede superar 16 MB';
    return 'La imagen no puede superar 5 MB';
  }
  if (errors.some((e) => e.code === 'file-invalid-type')) {
    return 'Solo se permiten imágenes JPG, PNG, WEBP o GIF, o documentos PDF, Word, Excel o PowerPoint';
  }
  return 'Archivo no válido';
}

export function outgoingMediaHint(): string {
  return 'Imagen hasta 5 MB · audio 16 MB · PDF/Word/Excel/PowerPoint 16 MB · sin video';
}
