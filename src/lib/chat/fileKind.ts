export type AttachmentIconKind = 'pdf' | 'word' | 'excel' | 'generic';

const WORD_MIMES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const EXCEL_MIMES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export function extensionFromFileName(fileName?: string): string {
  const ext = String(fileName || '').split('.').pop() || '';
  if (!ext || ext === fileName) return '';
  return ext.toUpperCase();
}

export function attachmentIconKind(mime?: string, fileName?: string): AttachmentIconKind {
  const normalized = String(mime || '').split(';')[0].trim().toLowerCase();
  const ext = extensionFromFileName(fileName).toLowerCase();
  if (normalized === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (WORD_MIMES.has(normalized) || ext === 'doc' || ext === 'docx') return 'word';
  if (EXCEL_MIMES.has(normalized) || ext === 'xls' || ext === 'xlsx') return 'excel';
  return 'generic';
}

export function formatAttachmentSize(bytes?: number): string {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return '';
  const mb = 1024 * 1024;
  if (bytes >= mb) return `${(bytes / mb).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1)} KB`;
  return `${Math.round(bytes)} B`;
}

export function isDocumentImageMime(mime?: string): boolean {
  const normalized = String(mime || '').split(';')[0].trim().toLowerCase();
  return normalized === 'image/jpeg' || normalized === 'image/png' || normalized === 'image/webp' || normalized === 'image/jpg';
}
