import type { SupabaseClient } from '@supabase/supabase-js';
import {
  countCatalogoIds,
  type PresupuestoCatalogoCounts,
} from '@/lib/catalogo/presupuestoCatalogo';

export type LeadLineaDraft = {
  catalogo_id: string | null;
  cantidad: number;
  precio: number | null;
  nombre: string;
};

export type LeadLineaRow = LeadLineaDraft & {
  id: string;
  lead_id: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MISSING_TABLE = new Set(['42P01', 'PGRST205']);

/** Cuenta unidades por producto. Sin `catalogo_id` no entra al stock. Devuelve null si no hay líneas útiles. */
export function countsFromLeadLineas(
  lineas: Array<{ catalogo_id?: string | null; cantidad?: number | null }>,
): PresupuestoCatalogoCounts | null {
  const counts: PresupuestoCatalogoCounts = new Map();
  for (const line of lineas) {
    const id = String(line.catalogo_id || '').trim();
    const qty = Number(line.cantidad);
    if (!id || !Number.isFinite(qty) || qty <= 0) continue;
    counts.set(id, (counts.get(id) || 0) + Math.floor(qty));
  }
  return counts.size > 0 ? counts : null;
}

/** Las líneas del lead ganan. Si no hay, se usa el presupuesto inferido de los mensajes. */
export function preferStockCounts(
  fromLineas: PresupuestoCatalogoCounts | null | undefined,
  fromMensajes: PresupuestoCatalogoCounts,
): PresupuestoCatalogoCounts {
  if (fromLineas && fromLineas.size > 0) return fromLineas;
  return fromMensajes;
}

export function lineasFromCatalogoIds(
  ids: string[],
  catalogo: Array<{ id: string; nombre: string; precio?: number | null }>,
): LeadLineaDraft[] {
  const counts = countCatalogoIds(ids);
  const byId = new Map(catalogo.map((item) => [item.id, item]));
  const lineas: LeadLineaDraft[] = [];
  for (const [id, qty] of counts) {
    const item = byId.get(id);
    if (!item) continue;
    const nombre = String(item.nombre || '').trim();
    if (!nombre) continue;
    lineas.push({
      catalogo_id: id,
      cantidad: qty,
      precio: item.precio == null || Number.isNaN(Number(item.precio)) ? null : Number(item.precio),
      nombre,
    });
  }
  return lineas;
}

export function parseLeadLineasInput(raw: unknown): { ok: true; lineas: LeadLineaDraft[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'lineas debe ser una lista' };
  }
  if (raw.length > 50) {
    return { ok: false, error: 'Máximo 50 ítems por lead' };
  }

  const parsed: LeadLineaDraft[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      return { ok: false, error: 'Ítem inválido' };
    }
    const row = entry as Record<string, unknown>;
    const nombre = String(row.nombre ?? '').trim();
    if (nombre.length < 1 || nombre.length > 200) {
      return { ok: false, error: 'Cada ítem necesita un nombre (máx. 200 caracteres)' };
    }
    const cantidad = Number(row.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 9999) {
      return { ok: false, error: 'La cantidad tiene que ser un entero entre 1 y 9999' };
    }
    let precio: number | null = null;
    if (row.precio !== undefined && row.precio !== null && String(row.precio).trim() !== '') {
      precio = Number(row.precio);
      if (!Number.isFinite(precio) || precio < 0) {
        return { ok: false, error: 'El precio no es válido' };
      }
    }
    const catalogoRaw = row.catalogo_id == null ? '' : String(row.catalogo_id).trim();
    if (catalogoRaw && !UUID_RE.test(catalogoRaw)) {
      return { ok: false, error: 'catalogo_id inválido' };
    }
    parsed.push({
      catalogo_id: catalogoRaw || null,
      cantidad,
      precio,
      nombre,
    });
  }

  return { ok: true, lineas: mergeLeadLineas(parsed) };
}

export function mergeLeadLineas(lineas: LeadLineaDraft[]): LeadLineaDraft[] {
  const merged = new Map<string, LeadLineaDraft>();
  const libres: LeadLineaDraft[] = [];
  for (const line of lineas) {
    if (!line.catalogo_id) {
      libres.push(line);
      continue;
    }
    const prev = merged.get(line.catalogo_id);
    if (!prev) {
      merged.set(line.catalogo_id, { ...line });
      continue;
    }
    prev.cantidad += line.cantidad;
    if (prev.precio == null && line.precio != null) prev.precio = line.precio;
  }
  return [...merged.values(), ...libres];
}

export async function loadCatalogoCountsFromLeadLineas(
  supabase: SupabaseClient,
  leadId: string,
): Promise<PresupuestoCatalogoCounts | null> {
  const { data, error } = await supabase
    .from('lead_lineas')
    .select('catalogo_id, cantidad')
    .eq('lead_id', leadId);

  if (error) {
    if (MISSING_TABLE.has(error.code || '')) return null;
    throw new Error(error.message || 'No se pudieron leer los ítems del lead');
  }

  return countsFromLeadLineas((data || []) as Array<{ catalogo_id?: string | null; cantidad?: number | null }>);
}

export async function replaceLeadLineas(
  supabase: SupabaseClient,
  opts: { leadId: string; organizacionId: string; lineas: LeadLineaDraft[] },
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('lead_lineas')
    .delete()
    .eq('lead_id', opts.leadId)
    .eq('organizacion_id', opts.organizacionId);
  if (deleteError) throw deleteError;
  if (opts.lineas.length === 0) return;

  const now = new Date().toISOString();
  const { error } = await supabase.from('lead_lineas').insert(
    opts.lineas.map((linea) => ({
      lead_id: opts.leadId,
      organizacion_id: opts.organizacionId,
      catalogo_id: linea.catalogo_id,
      cantidad: linea.cantidad,
      precio: linea.precio,
      nombre: linea.nombre,
      updated_at: now,
    })),
  );
  if (error) throw error;
}

/** Reemplaza las líneas del lead vinculado a la conversación con el carrito enviado. */
export async function persistPresupuestoEnLead(
  supabase: SupabaseClient,
  opts: { conversacionId: string; catalogoIds: string[] },
): Promise<void> {
  const ids = opts.catalogoIds.map((id) => String(id || '').trim()).filter(Boolean);
  if (!opts.conversacionId || ids.length === 0) return;

  const { data: conv, error: convError } = await supabase
    .from('conversaciones')
    .select('lead_id, organizacion_id')
    .eq('id', opts.conversacionId)
    .maybeSingle();
  if (convError) throw convError;
  if (!conv?.lead_id || !conv.organizacion_id) return;

  const { data: catalogo, error: catError } = await supabase
    .from('chat_catalogo')
    .select('id, nombre, precio')
    .eq('organizacion_id', conv.organizacion_id)
    .in('id', [...new Set(ids)]);
  if (catError) throw catError;

  const lineas = lineasFromCatalogoIds(
    ids,
    (catalogo || []) as Array<{ id: string; nombre: string; precio?: number | null }>,
  );
  if (lineas.length === 0) return;

  await replaceLeadLineas(supabase, {
    leadId: conv.lead_id,
    organizacionId: conv.organizacion_id,
    lineas,
  });
}
