export type IncomingLiteFileFields = {
  file_url?: string;
  file_type?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  duration?: number;
};

export function incomingLiteFileMetadata(body: {
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  mimetype?: string | null;
  mime_type?: string | null;
  duration?: number | null;
  type?: string | null;
  message?: string | null;
}): IncomingLiteFileFields | null {
  const fileType = body.file_type || (body.type === 'file' ? 'file' : '');
  const fileName = body.file_name ? String(body.file_name) : '';
  const fileUrl = body.file_url ? String(body.file_url) : '';
  if (!fileUrl && !fileName && fileType !== 'file' && fileType !== 'document') {
    return null;
  }
  const mime = body.mime_type || body.mimetype || undefined;
  const meta: IncomingLiteFileFields = {
    file_type: fileType || body.type || 'file',
    file_name: fileName || undefined,
    mime_type: mime || undefined,
  };
  if (fileUrl) meta.file_url = fileUrl;
  if (typeof body.file_size === 'number' && Number.isFinite(body.file_size)) {
    meta.file_size = body.file_size;
  }
  if (typeof body.duration === 'number' && Number.isFinite(body.duration) && body.duration > 0) {
    meta.duration = body.duration;
  }
  return meta;
}
