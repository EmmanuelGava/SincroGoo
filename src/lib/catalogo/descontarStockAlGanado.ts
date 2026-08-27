import type { SupabaseClient } from '@supabase/supabase-js';
import { isEstadoGanado } from '@/lib/contactos/estadoLead';
import type { CatalogoItem } from '@/lib/chat/catalogoVentas';
import {
  countsToRpcItems,
  countCatalogoIds,
  pickPresupuestoCatalogoIdsFromMensajes,
  type PresupuestoCatalogoCounts,
} from '@/lib/catalogo/presupuestoCatalogo';

export type StockDeductionResult = {
  applied: boolean;
  skippedReason?: 'already_deducted' | 'not_ganado' | 'no_items';
  deductions?: Array<{
    id: string;
    deducted: number;
    stock_after: number | null;
    ok: boolean;
    reason?: string | null;
  }>;
};

type LeadTags = {
  stock_descontado?: boolean;
  stock_descontado_at?: string;
  stock_deductions?: StockDeductionResult['deductions'];
};

export function leadTagsStockAlreadyDeducted(tags: unknown): boolean {
  if (!tags || typeof tags !== 'object') return false;
  return Boolean((tags as LeadTags).stock_descontado);
}

export function mergeLeadTagsWithStockDeduction(
  tags: unknown,
  deductions: StockDeductionResult['deductions'],
): Record<string, unknown> {
  const base = tags && typeof tags === 'object' ? { ...(tags as Record<string, unknown>) } : {};
  return {
    ...base,
    stock_descontado: true,
    stock_descontado_at: new Date().toISOString(),
    stock_deductions: deductions,
  };
}

export async function descontarStockAlGanado(
  supabase: SupabaseClient,
  opts: {
    usuarioId: string;
    leadId: string;
    nuevoEstadoNombre: string;
    leadTags: unknown;
    catalogoCounts?: PresupuestoCatalogoCounts;
  },
): Promise<StockDeductionResult> {
  if (!isEstadoGanado(opts.nuevoEstadoNombre)) {
    return { applied: false, skippedReason: 'not_ganado' };
  }
  if (leadTagsStockAlreadyDeducted(opts.leadTags)) {
    return { applied: false, skippedReason: 'already_deducted' };
  }

  let counts = opts.catalogoCounts;
  if (!counts || counts.size === 0) {
    const resolved = await resolveCatalogoCountsForLead(supabase, opts.leadId, opts.usuarioId);
    counts = resolved;
  }

  if (!counts || counts.size === 0) {
    return { applied: false, skippedReason: 'no_items' };
  }

  const rpcItems = countsToRpcItems(counts);
  const { data, error } = await supabase.rpc('decrement_catalogo_stock', {
    p_usuario_id: opts.usuarioId,
    p_items: rpcItems,
  });

  if (error) {
    throw new Error(error.message || 'No se pudo descontar stock del catálogo');
  }

  const deductions = normalizeRpcDeductions(data);
  return { applied: true, deductions };
}

function normalizeRpcDeductions(data: unknown): StockDeductionResult['deductions'] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const item = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    return {
      id: String(item.id || ''),
      deducted: Number(item.deducted ?? 0),
      stock_after: item.stock_after == null ? null : Number(item.stock_after),
      ok: Boolean(item.ok),
      reason: item.reason != null ? String(item.reason) : null,
    };
  });
}

async function resolveCatalogoCountsForLead(
  supabase: SupabaseClient,
  leadId: string,
  usuarioId: string,
): Promise<PresupuestoCatalogoCounts> {
  const { data: conv } = await supabase
    .from('conversaciones')
    .select('id')
    .eq('lead_id', leadId)
    .order('fecha_mensaje', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: catalogo } = await supabase
    .from('chat_catalogo')
    .select('id, nombre')
    .eq('usuario_id', usuarioId);

  const catalogRows = (catalogo || []) as Pick<CatalogoItem, 'id' | 'nombre'>[];
  if (!conv?.id || catalogRows.length === 0) {
    return new Map();
  }

  const { data: mensajes } = await supabase
    .from('mensajes_conversacion')
    .select('contenido, metadata')
    .eq('conversacion_id', conv.id)
    .order('fecha_mensaje', { ascending: true });

  const ids = pickPresupuestoCatalogoIdsFromMensajes(mensajes || [], catalogRows);
  return countCatalogoIds(ids);
}
