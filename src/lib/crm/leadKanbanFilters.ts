export type LeadScore = 'alta' | 'media' | 'baja';

export const LEAD_SCORES: LeadScore[] = ['alta', 'media', 'baja'];

export const LEAD_SCORE_LABEL: Record<LeadScore, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export type KanbanCanalFiltro = 'whatsapp' | 'telegram' | 'email';

export type LeadKanbanFiltros = {
  canal?: KanbanCanalFiltro | '';
  valorMin?: number | null;
  valorMax?: number | null;
  fechaCierreDesde?: string | null;
  fechaCierreHasta?: string | null;
};

export type LeadFiltrable = {
  valor_potencial?: number | null;
  fecha_cierre?: string | null;
  canal?: string | null;
  servicio_origen?: string | null;
};

/** Normaliza servicio_origen / canal a whatsapp | telegram | email | otro. */
export function normalizeCanalLead(raw?: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (value.startsWith('whatsapp')) return 'whatsapp';
  if (value.startsWith('telegram')) return 'telegram';
  if (value === 'email' || value === 'mail') return 'email';
  return value;
}

export function isLeadScore(value: unknown): value is LeadScore {
  return value === 'alta' || value === 'media' || value === 'baja';
}

function toDayStartMs(isoDate: string): number {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`).getTime();
}

function leadDayMs(fecha?: string | null): number | null {
  if (!fecha) return null;
  const day = String(fecha).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return toDayStartMs(day);
}

export function leadMatchesKanbanFiltros(
  lead: LeadFiltrable,
  filtros: LeadKanbanFiltros
): boolean {
  const canalFiltro = filtros.canal || '';
  if (canalFiltro) {
    const canal = normalizeCanalLead(lead.canal || lead.servicio_origen);
    if (canal !== canalFiltro) return false;
  }

  const valor = lead.valor_potencial;
  if (filtros.valorMin != null) {
    if (valor == null || Number(valor) < Number(filtros.valorMin)) return false;
  }
  if (filtros.valorMax != null) {
    if (valor == null || Number(valor) > Number(filtros.valorMax)) return false;
  }

  const cierreMs = leadDayMs(lead.fecha_cierre);
  if (filtros.fechaCierreDesde) {
    if (cierreMs == null || cierreMs < toDayStartMs(filtros.fechaCierreDesde)) return false;
  }
  if (filtros.fechaCierreHasta) {
    if (cierreMs == null || cierreMs > toDayStartMs(filtros.fechaCierreHasta)) return false;
  }

  return true;
}

export function filtrarLeadsKanban<T extends LeadFiltrable>(
  leads: T[],
  filtros: LeadKanbanFiltros
): T[] {
  return leads.filter((lead) => leadMatchesKanbanFiltros(lead, filtros));
}

export function formatValorLead(valor?: number | null): string | null {
  if (valor == null || Number.isNaN(Number(valor))) return null;
  const n = Number(valor);
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function formatFechaCierreLead(fecha?: string | null): string | null {
  if (!fecha) return null;
  const day = String(fecha).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
