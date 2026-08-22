import { onlyDigits } from '@/lib/chat/conversationIdentity';

export type ConversationSearchMatchKind =
  | 'nombre'
  | 'telefono'
  | 'remitente'
  | 'mensaje';

export type ConversationSearchCandidate = {
  id: string;
  remitente?: string | null;
  display_name?: string | null;
  display_phone?: string | null;
  contacto_nombre?: string | null;
  contact_name?: string | null;
  phone_number?: string | null;
  fecha_mensaje?: string | null;
  ultimo_mensaje?: string | null;
  /** Contenido del mensaje que matcheó (si hubo hit de texto). */
  hit_mensaje?: string | null;
  hit_fecha?: string | null;
};

export type ConversationSearchHit = ConversationSearchCandidate & {
  match_kind: ConversationSearchMatchKind;
  preview: string;
  score: number;
};

const KIND_SCORE: Record<ConversationSearchMatchKind, number> = {
  nombre: 400,
  telefono: 300,
  remitente: 200,
  mensaje: 100,
};

/** Escapa `%` y `_` para patrones ILIKE seguros. */
export function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function normalizeSearchQuery(raw: string | null | undefined): string {
  return String(raw || '').trim().replace(/\s+/g, ' ');
}

export function ilikeContainsPattern(query: string): string | null {
  const q = normalizeSearchQuery(query);
  if (!q) return null;
  return `%${escapeIlikePattern(q)}%`;
}

export function textMatchesQuery(haystack: string | null | undefined, query: string): boolean {
  const q = normalizeSearchQuery(query).toLowerCase();
  if (!q) return false;
  return String(haystack || '').toLowerCase().includes(q);
}

export function phoneMatchesQuery(
  phone: string | null | undefined,
  query: string
): boolean {
  const qDigits = onlyDigits(query);
  if (qDigits.length < 3) {
    return textMatchesQuery(phone, query);
  }
  const phoneDigits = onlyDigits(phone);
  if (!phoneDigits) return false;
  return phoneDigits.includes(qDigits);
}

function bestMatchKind(candidate: ConversationSearchCandidate, query: string): ConversationSearchMatchKind | null {
  const q = normalizeSearchQuery(query);
  if (!q) return null;

  if (
    textMatchesQuery(candidate.contacto_nombre, q)
    || textMatchesQuery(candidate.contact_name, q)
    || textMatchesQuery(candidate.display_name, q)
  ) {
    return 'nombre';
  }

  if (
    phoneMatchesQuery(candidate.display_phone, q)
    || phoneMatchesQuery(candidate.phone_number, q)
    || phoneMatchesQuery(candidate.remitente, q)
  ) {
    return 'telefono';
  }

  if (textMatchesQuery(candidate.remitente, q)) {
    return 'remitente';
  }

  if (textMatchesQuery(candidate.hit_mensaje, q) || textMatchesQuery(candidate.ultimo_mensaje, q)) {
    return 'mensaje';
  }

  return null;
}

/** Recorta el preview alrededor del primer match (para la lista del sidebar). */
export function buildSearchPreview(
  content: string | null | undefined,
  query: string,
  maxLen = 120
): string {
  const text = String(content || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const q = normalizeSearchQuery(query).toLowerCase();
  if (!q || text.length <= maxLen) return text;

  const idx = text.toLowerCase().indexOf(q);
  if (idx < 0) {
    return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
  }

  const pad = Math.max(0, Math.floor((maxLen - q.length) / 2));
  let start = Math.max(0, idx - pad);
  const end = Math.min(text.length, start + maxLen);
  if (end - start < maxLen) start = Math.max(0, end - maxLen);

  const slice = text.slice(start, end);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${slice}${suffix}`;
}

export function scoreConversationSearchHit(
  candidate: ConversationSearchCandidate,
  query: string
): ConversationSearchHit | null {
  const kind = bestMatchKind(candidate, query);
  if (!kind) return null;

  const previewSource =
    kind === 'mensaje'
      ? (candidate.hit_mensaje || candidate.ultimo_mensaje || '')
      : (candidate.ultimo_mensaje || candidate.hit_mensaje || '');

  const preview = buildSearchPreview(previewSource, query) || previewSource || 'Sin mensajes';

  return {
    ...candidate,
    match_kind: kind,
    preview,
    score: KIND_SCORE[kind],
  };
}

/**
 * Une candidatos por id (queda el de mejor score / más reciente) y ordena desc.
 */
export function rankConversationSearchHits(
  candidates: ConversationSearchCandidate[],
  query: string
): ConversationSearchHit[] {
  const q = normalizeSearchQuery(query);
  if (!q) return [];

  const byId = new Map<string, ConversationSearchHit>();
  for (const candidate of candidates) {
    const hit = scoreConversationSearchHit(candidate, q);
    if (!hit) continue;
    const prev = byId.get(hit.id);
    if (!prev || hit.score > prev.score) {
      byId.set(hit.id, hit);
      continue;
    }
    if (hit.score === prev.score) {
      const hitTs = Date.parse(hit.hit_fecha || hit.fecha_mensaje || '') || 0;
      const prevTs = Date.parse(prev.hit_fecha || prev.fecha_mensaje || '') || 0;
      if (hitTs > prevTs) byId.set(hit.id, hit);
    }
  }

  return [...byId.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const bt = Date.parse(b.fecha_mensaje || '') || 0;
    const at = Date.parse(a.fecha_mensaje || '') || 0;
    return bt - at;
  });
}
