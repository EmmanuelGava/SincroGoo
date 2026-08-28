import type { SupabaseClient } from '@supabase/supabase-js';
import { isEstadoGanado, isEstadoPropuesta } from '@/lib/contactos/estadoLead';
import {
  countsToRpcItems,
  countCatalogoIds,
  pickPresupuestoCatalogoIdsFromMensajes,
} from '@/lib/catalogo/presupuestoCatalogo';
import type { CatalogoItem } from '@/lib/chat/catalogoVentas';

export type StockReservaResult = {
  applied: boolean;
  skippedReason?: string;
  reservations?: unknown;
};

export async function syncStockReservaOnEtapaChange(
  supabase: SupabaseClient,
  opts: {
    leadId: string;
    organizacionId: string;
    usuarioId: string;
    prevEstadoNombre: string;
    nuevoEstadoNombre: string;
  },
): Promise<StockReservaResult> {
  const wasPropuesta = isEstadoPropuesta(opts.prevEstadoNombre);
  const isPropuesta = isEstadoPropuesta(opts.nuevoEstadoNombre);
  const isGanado = isEstadoGanado(opts.nuevoEstadoNombre);

  if (isPropuesta && !wasPropuesta) {
    const counts = await resolveCatalogoCountsForLead(
      supabase,
      opts.leadId,
      opts.usuarioId,
      opts.organizacionId,
    );
    if (counts.size === 0) {
      return { applied: false, skippedReason: 'no_items' };
    }
    const rpcItems = countsToRpcItems(counts);
    const { data, error } = await supabase.rpc('reserve_catalogo_stock_for_lead', {
      p_lead_id: opts.leadId,
      p_organizacion_id: opts.organizacionId,
      p_items: rpcItems,
    });
    if (error) throw new Error(error.message || 'No se pudo reservar stock');
    return { applied: true, reservations: data };
  }

  if (wasPropuesta && !isPropuesta && !isGanado) {
    const { error } = await supabase.rpc('release_catalogo_stock_for_lead', {
      p_lead_id: opts.leadId,
    });
    if (error) throw new Error(error.message || 'No se pudo liberar reserva');
    return { applied: true };
  }

  return { applied: false };
}

async function resolveCatalogoCountsForLead(
  supabase: SupabaseClient,
  leadId: string,
  usuarioId: string,
  organizacionId: string,
) {
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
    .eq('organizacion_id', organizacionId);

  const catalogRows = (catalogo || []) as Pick<CatalogoItem, 'id' | 'nombre'>[];
  if (!conv?.id || catalogRows.length === 0) {
    return new Map<string, number>();
  }

  const { data: mensajes } = await supabase
    .from('mensajes_conversacion')
    .select('contenido, metadata')
    .eq('conversacion_id', conv.id)
    .order('fecha_mensaje', { ascending: true });

  const ids = pickPresupuestoCatalogoIdsFromMensajes(mensajes || [], catalogRows);
  return countCatalogoIds(ids);
}
