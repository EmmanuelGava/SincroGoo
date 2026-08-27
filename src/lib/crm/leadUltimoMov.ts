export type UltimoMovEtapa = {
  texto: string;
  fecha: string;
};

export type HistorialEtapaRow = {
  lead_id: string;
  fecha: string;
  estado_anterior_nombre: string | null;
  estado_nuevo_nombre: string;
  motivo?: string | null;
};

export function formatUltimoMovLine(row: HistorialEtapaRow): string {
  const from = (row.estado_anterior_nombre || 'Sin etapa').trim();
  const to = (row.estado_nuevo_nombre || 'Sin etapa').trim();
  return `${from} → ${to}`;
}

export function attachUltimoMovEtapa<T extends { id: string }>(
  leads: T[],
  historial: HistorialEtapaRow[]
): Array<T & { ultimo_mov_etapa?: UltimoMovEtapa | null }> {
  const byLead = new Map<string, HistorialEtapaRow>();
  for (const row of historial) {
    const existing = byLead.get(row.lead_id);
    if (!existing || new Date(row.fecha).getTime() > new Date(existing.fecha).getTime()) {
      byLead.set(row.lead_id, row);
    }
  }

  return leads.map((lead) => {
    const row = byLead.get(lead.id);
    if (!row) return { ...lead, ultimo_mov_etapa: null };
    return {
      ...lead,
      ultimo_mov_etapa: {
        texto: formatUltimoMovLine(row),
        fecha: row.fecha,
      },
    };
  });
}
