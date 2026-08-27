import type { CatalogoItem } from '@/lib/chat/catalogoVentas';

export type PresupuestoCatalogoCounts = Map<string, number>;

export function countCatalogoIds(ids: string[]): PresupuestoCatalogoCounts {
  const counts = new Map<string, number>();
  for (const raw of ids) {
    const id = String(raw || '').trim();
    if (!id) continue;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return counts;
}

export function extractPresupuestoCatalogoIds(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== 'object') return [];
  const meta = metadata as Record<string, unknown>;
  const raw = meta.presupuesto_catalogo_ids;
  if (!Array.isArray(raw)) return [];
  return raw.map((id) => String(id || '').trim()).filter(Boolean);
}

const PRESUPUESTO_LINE_RE = /^•\s*(.+?)\s*—/;

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

/** Fallback: matchea nombres de líneas «• Nombre — $precio» contra el catálogo. */
export function matchPresupuestoNombresToCatalogo(
  contenido: string,
  catalogo: Pick<CatalogoItem, 'id' | 'nombre'>[],
): string[] {
  if (!contenido.trim().toLowerCase().startsWith('presupuesto:')) return [];

  const byName = new Map<string, string>();
  for (const item of catalogo) {
    byName.set(normalizeName(item.nombre), item.id);
  }

  const ids: string[] = [];
  for (const line of contenido.split('\n')) {
    const match = PRESUPUESTO_LINE_RE.exec(line.trim());
    if (!match) continue;
    const id = byName.get(normalizeName(match[1]));
    if (id) ids.push(id);
  }
  return ids;
}

export function pickPresupuestoCatalogoIdsFromMensajes(
  mensajes: Array<{ contenido?: string | null; metadata?: Record<string, unknown> | null }>,
  catalogo: Pick<CatalogoItem, 'id' | 'nombre'>[],
): string[] {
  for (let i = mensajes.length - 1; i >= 0; i -= 1) {
    const msg = mensajes[i];
    const meta = msg.metadata && typeof msg.metadata === 'object' ? msg.metadata : {};
    if (meta.internal_note === true) continue;
    if (meta.direction !== 'outgoing') continue;

    const fromMeta = extractPresupuestoCatalogoIds(meta);
    if (fromMeta.length > 0) return fromMeta;

    const fromText = matchPresupuestoNombresToCatalogo(String(msg.contenido || ''), catalogo);
    if (fromText.length > 0) return fromText;
  }
  return [];
}

export function countsToRpcItems(counts: PresupuestoCatalogoCounts): Array<{ id: string; qty: number }> {
  return [...counts.entries()].map(([id, qty]) => ({ id, qty }));
}
