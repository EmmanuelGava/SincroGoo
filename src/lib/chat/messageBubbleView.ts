import { extractFirstHttpUrl, isUrlOnlyMessage } from './extractFirstUrl';

export type FilePresentation = 'card' | 'unavailable' | null;

export type MessageBubbleView = {
  showRawText: boolean;
  previewUrl: string | null;
  filePresentation: FilePresentation;
  showImage: boolean;
  showAudio: boolean;
  showVideo: boolean;
  redundantCaption: boolean;
  urlOnly: boolean;
  /** Etiqueta amigable si el media no está disponible (sin file_url). */
  unavailableLabel: string | null;
};

const MEDIA_PLACEHOLDER_RE = /^\[(Imagen|Audio|Video|Archivo)\]$/i;

export function isMediaPlaceholder(caption: string): boolean {
  return MEDIA_PLACEHOLDER_RE.test(caption.trim());
}

function placeholderLabel(caption: string, fileType: string): string {
  const m = caption.trim().match(MEDIA_PLACEHOLDER_RE);
  if (m) {
    const key = m[1].toLowerCase();
    if (key === 'imagen') return 'Imagen';
    if (key === 'audio') return 'Audio';
    if (key === 'video') return 'Video';
    return 'Archivo';
  }
  if (fileType === 'image') return 'Imagen';
  if (fileType === 'audio') return 'Audio';
  if (fileType === 'video') return 'Video';
  return 'Archivo';
}

export function messageBubbleView(mensaje: {
  contenido?: string | null;
  metadata?: Record<string, unknown> | null;
  tipo?: string | null;
}): MessageBubbleView {
  const meta = (mensaje.metadata && typeof mensaje.metadata === 'object') ? mensaje.metadata : {};
  const fileUrl = typeof meta.file_url === 'string' && meta.file_url ? meta.file_url : '';
  const fileType = String(meta.file_type || mensaje.tipo || '').toLowerCase();
  const fileName = String(meta.file_name || '');
  const caption = String(mensaje.contenido || '').trim();
  const placeholder = isMediaPlaceholder(caption);

  const showImage = fileType === 'image' && Boolean(fileUrl);
  const showAudio = fileType === 'audio' && Boolean(fileUrl);
  const showVideo = fileType === 'video' && Boolean(fileUrl);
  const isFile = fileType === 'file' || fileType === 'document';

  const redundantCaption =
    Boolean(fileUrl || isFile || placeholder) && (
      placeholder
      || caption === fileName
      || /^Audio\s*\(/i.test(caption)
      || caption.startsWith('📎 ')
      || caption.startsWith('🎤 ')
    );

  const previewUrl = extractFirstHttpUrl(caption);
  const urlOnly = Boolean(previewUrl && isUrlOnlyMessage(caption, previewUrl));

  // Nunca mostrar "[Imagen]" / "[Audio]" / etc. como texto de la burbuja.
  const showRawText = Boolean(caption) && !redundantCaption && !urlOnly && !placeholder;

  let filePresentation: FilePresentation = null;
  let unavailableLabel: string | null = null;

  if (isFile) {
    filePresentation = fileUrl ? 'card' : 'unavailable';
    if (!fileUrl) unavailableLabel = fileName || placeholderLabel(caption, fileType);
  } else if ((fileType === 'image' || fileType === 'audio' || fileType === 'video') && !fileUrl) {
    filePresentation = 'unavailable';
    unavailableLabel = fileName || placeholderLabel(caption, fileType);
  } else if (placeholder && !fileUrl && !showImage && !showAudio && !showVideo) {
    filePresentation = 'unavailable';
    unavailableLabel = placeholderLabel(caption, fileType);
  }

  // Si hay media renderizable, no hace falta chip unavailable.
  if (showImage || showAudio || showVideo) {
    filePresentation = null;
    unavailableLabel = null;
  }

  return {
    showRawText,
    previewUrl: previewUrl || null,
    filePresentation,
    showImage,
    showAudio,
    showVideo,
    redundantCaption,
    urlOnly,
    unavailableLabel,
  };
}
