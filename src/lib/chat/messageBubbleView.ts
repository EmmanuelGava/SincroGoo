import { extractFirstHttpUrl, isUrlOnlyMessage } from './extractFirstUrl';

export type FilePresentation = 'card' | 'unavailable' | null;

export type MessageBubbleView = {
  showRawText: boolean;
  previewUrl: string | null;
  filePresentation: FilePresentation;
  showImage: boolean;
  showAudio: boolean;
  redundantCaption: boolean;
  urlOnly: boolean;
};

export function messageBubbleView(mensaje: {
  contenido?: string | null;
  metadata?: Record<string, unknown> | null;
  tipo?: string | null;
}): MessageBubbleView {
  const meta = (mensaje.metadata && typeof mensaje.metadata === 'object') ? mensaje.metadata : {};
  const fileUrl = typeof meta.file_url === 'string' && meta.file_url ? meta.file_url : '';
  const fileType = String(meta.file_type || mensaje.tipo || '');
  const fileName = String(meta.file_name || '');
  const caption = String(mensaje.contenido || '').trim();
  const showImage = fileType === 'image' && Boolean(fileUrl);
  const showAudio = fileType === 'audio' && Boolean(fileUrl);
  const isFile = fileType === 'file' || fileType === 'document';

  const redundantCaption =
    Boolean(fileUrl || isFile) && (
      caption === fileName
      || /^Audio\s*\(/i.test(caption)
      || caption.startsWith('📎 ')
      || caption.startsWith('🎤 ')
    );

  const previewUrl = extractFirstHttpUrl(caption);
  const urlOnly = Boolean(previewUrl && isUrlOnlyMessage(caption, previewUrl));
  const showRawText = Boolean(caption) && !redundantCaption && !urlOnly;

  return {
    showRawText,
    previewUrl: previewUrl || null,
    filePresentation: isFile ? (fileUrl ? 'card' : 'unavailable') : null,
    showImage,
    showAudio,
    redundantCaption,
    urlOnly,
  };
}
