import type { Lead } from '@/app/tipos/lead';

export type KanbanLeadOrderUpdate = {
  id: string;
  estado_id: string;
  orden: number;
};

export function sortLeadsInColumn(leads: Lead[], estadoId: string): Lead[] {
  return leads
    .filter((lead) => lead.estado_id === estadoId)
    .sort((a, b) => {
      const orderDiff = (a.orden ?? 0) - (b.orden ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
    });
}

export function computeKanbanReorderUpdates(
  leads: Lead[],
  leadId: string,
  sourceEstadoId: string,
  destEstadoId: string,
  destIndex: number,
): KanbanLeadOrderUpdate[] {
  const moved = leads.find((lead) => lead.id === leadId);
  if (!moved) return [];

  const updates: KanbanLeadOrderUpdate[] = [];
  const clampIndex = (index: number, length: number) => Math.max(0, Math.min(index, length));

  if (sourceEstadoId === destEstadoId) {
    const column = sortLeadsInColumn(leads, sourceEstadoId);
    const fromIdx = column.findIndex((lead) => lead.id === leadId);
    if (fromIdx === -1) return [];
    const [item] = column.splice(fromIdx, 1);
    column.splice(clampIndex(destIndex, column.length), 0, item);
    column.forEach((lead, index) => {
      updates.push({ id: lead.id, estado_id: destEstadoId, orden: index });
    });
    return updates;
  }

  const sourceColumn = sortLeadsInColumn(leads, sourceEstadoId).filter((lead) => lead.id !== leadId);
  const destColumn = sortLeadsInColumn(leads, destEstadoId);
  destColumn.splice(clampIndex(destIndex, destColumn.length), 0, { ...moved, estado_id: destEstadoId });

  sourceColumn.forEach((lead, index) => {
    updates.push({ id: lead.id, estado_id: sourceEstadoId, orden: index });
  });
  destColumn.forEach((lead, index) => {
    updates.push({ id: lead.id, estado_id: destEstadoId, orden: index });
  });

  return updates;
}

export function applyKanbanReorderUpdates(leads: Lead[], updates: KanbanLeadOrderUpdate[]): Lead[] {
  if (updates.length === 0) return leads;
  const updateMap = new Map(updates.map((update) => [update.id, update]));
  return leads.map((lead) => {
    const update = updateMap.get(lead.id);
    return update ? { ...lead, estado_id: update.estado_id, orden: update.orden } : lead;
  });
}

export function buildLeadsPorEstado(leads: Lead[], estadoIds: string[]): Record<string, Lead[]> {
  const grouped: Record<string, Lead[]> = {};
  estadoIds.forEach((estadoId) => {
    grouped[estadoId] = sortLeadsInColumn(leads, estadoId);
  });
  return grouped;
}
