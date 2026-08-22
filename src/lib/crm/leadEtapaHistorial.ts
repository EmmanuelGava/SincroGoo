export function shouldRecordEtapaChange(
  prevEstadoId: string | null | undefined,
  nextEstadoId: string | null | undefined
): boolean {
  if (!nextEstadoId) return false;
  return String(prevEstadoId || '') !== String(nextEstadoId);
}

export type EtapaHistorialRow = {
  fecha: string;
  estado_anterior_nombre: string | null;
  estado_nuevo_nombre: string;
  lead_nombre?: string | null;
  motivo?: string | null;
};

export function formatEtapaHistorialLine(row: EtapaHistorialRow): string {
  const from = (row.estado_anterior_nombre || 'Sin etapa').trim() || 'Sin etapa';
  const to = row.estado_nuevo_nombre.trim() || 'Sin etapa';
  const lead = row.lead_nombre?.trim();
  const move = `${from} → ${to}`;
  const base = lead ? `${lead}: ${move}` : move;
  const motivo = row.motivo?.trim();
  return motivo ? `${base} (motivo: ${motivo})` : base;
}
