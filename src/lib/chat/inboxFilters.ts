export type InboxCanalFiltro = 'whatsapp' | 'telegram' | 'email';

export type InboxFiltroTipo = 'todos' | 'unread' | 'seguimiento' | 'archivados' | InboxCanalFiltro;

export type InboxFiltros = {
  tipo?: InboxFiltroTipo;
};

export type ConversacionFiltrable = {
  id: string;
  unread_count?: number;
  esperando_seguimiento?: boolean;
  servicio_origen?: string | null;
};

export function normalizeInboxCanal(raw?: string | null): InboxCanalFiltro | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (value.startsWith('whatsapp')) return 'whatsapp';
  if (value.startsWith('telegram')) return 'telegram';
  if (value === 'email' || value === 'mail') return 'email';
  return null;
}

export function conversacionMatchesInboxFiltro(
  conv: ConversacionFiltrable,
  filtros: InboxFiltros
): boolean {
  const tipo = filtros.tipo || 'todos';
  if (tipo === 'archivados') return true;
  if (tipo === 'todos') return true;
  if (tipo === 'unread') return (conv.unread_count || 0) > 0;
  if (tipo === 'seguimiento') return Boolean(conv.esperando_seguimiento);
  const canal = normalizeInboxCanal(conv.servicio_origen);
  return canal === tipo;
}

export function filtrarConversacionesInbox<T extends ConversacionFiltrable>(
  conversaciones: T[],
  filtros: InboxFiltros
): T[] {
  return conversaciones.filter((conv) => conversacionMatchesInboxFiltro(conv, filtros));
}

export function countInboxFiltro<T extends ConversacionFiltrable>(
  conversaciones: T[],
  tipo: InboxFiltroTipo
): number {
  return filtrarConversacionesInbox(conversaciones, { tipo }).length;
}

export const INBOX_FILTRO_CHIPS: Array<{ id: InboxFiltroTipo; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'unread', label: 'No leídas' },
  { id: 'seguimiento', label: 'Seguimiento' },
  { id: 'archivados', label: 'Archivados' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'email', label: 'Email' },
];

export function parseInboxFiltroFromUrl(value: string | null | undefined): InboxFiltroTipo {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'unread' || v === 'no-leidas') return 'unread';
  if (v === 'seguimiento') return 'seguimiento';
  if (v === 'archivados' || v === 'archived') return 'archivados';
  if (v === 'whatsapp' || v === 'telegram' || v === 'email') return v;
  return 'todos';
}

export function inboxFiltroUsesArchivedApi(tipo: InboxFiltroTipo): boolean {
  return tipo === 'archivados';
}
