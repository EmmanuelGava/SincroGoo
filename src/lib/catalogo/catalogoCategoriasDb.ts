import type { SupabaseClient } from '@supabase/supabase-js';
import {
  nombreDesdeSlug,
  normalizeCategoriaSlug,
  type CategoriaCatalogo,
} from '@/lib/catalogo/catalogoCategorias';

export const CATEGORIA_SELECT = 'id, slug, nombre, incluir_sin_stock_en_lista, orden';

export class CategoriaConflictError extends Error {
  constructor(slug: string) {
    super(`Ya existe una categoría con el slug "${slug}"`);
    this.name = 'CategoriaConflictError';
  }
}

async function buscarPorSlug(
  supabase: SupabaseClient,
  organizacionId: string,
  slug: string,
): Promise<CategoriaCatalogo | null> {
  const { data, error } = await supabase
    .from('catalogo_categorias')
    .select(CATEGORIA_SELECT)
    .eq('organizacion_id', organizacionId)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as CategoriaCatalogo | null) ?? null;
}

/** Devuelve el id de la categoría con ese slug; la crea si no existe. */
export async function resolverCategoriaId(
  supabase: SupabaseClient,
  organizacionId: string,
  rawSlug: unknown,
): Promise<string | null> {
  const slug = normalizeCategoriaSlug(rawSlug);
  if (!slug) return null;

  const existente = await buscarPorSlug(supabase, organizacionId, slug);
  if (existente) return existente.id;

  const { data, error } = await supabase
    .from('catalogo_categorias')
    .insert({ organizacion_id: organizacionId, slug, nombre: nombreDesdeSlug(slug) })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      const otra = await buscarPorSlug(supabase, organizacionId, slug);
      if (otra) return otra.id;
    }
    throw error;
  }
  return data.id as string;
}

/** Crea las categorías que falten y vincula `categoria_id` según el texto de cada ítem. */
export async function sincronizarCategoriasCatalogo(
  supabase: SupabaseClient,
  organizacionId: string,
): Promise<void> {
  const { data: items, error } = await supabase
    .from('chat_catalogo')
    .select('id, categoria, categoria_id')
    .eq('organizacion_id', organizacionId)
    .not('categoria', 'is', null);
  if (error) throw error;

  const slugs = new Set<string>();
  for (const item of items || []) {
    const slug = normalizeCategoriaSlug(item.categoria);
    if (slug) slugs.add(slug);
  }

  for (const slug of slugs) {
    const categoriaId = await resolverCategoriaId(supabase, organizacionId, slug);
    if (!categoriaId) continue;
    const { error: updError } = await supabase
      .from('chat_catalogo')
      .update({ categoria_id: categoriaId, categoria: slug })
      .eq('organizacion_id', organizacionId)
      .eq('categoria', slug)
      .or(`categoria_id.is.null,categoria_id.neq.${categoriaId}`);
    if (updError) throw updError;
  }
}

export type CategoriaPatch = {
  nombre?: unknown;
  slug?: unknown;
  incluir_sin_stock_en_lista?: unknown;
  orden?: unknown;
};

/** Edita una categoría. Si cambia el slug, actualiza todos los ítems que la usan. */
export async function actualizarCategoria(
  supabase: SupabaseClient,
  organizacionId: string,
  id: string,
  patch: CategoriaPatch,
): Promise<CategoriaCatalogo | null> {
  const { data: actual, error: actualError } = await supabase
    .from('catalogo_categorias')
    .select(CATEGORIA_SELECT)
    .eq('id', id)
    .eq('organizacion_id', organizacionId)
    .maybeSingle();
  if (actualError) throw actualError;
  if (!actual) return null;

  const fields: Record<string, unknown> = {};

  if (patch.nombre !== undefined) {
    const nombre = String(patch.nombre ?? '').trim();
    if (nombre.length < 2) throw new Error('El nombre debe tener al menos 2 caracteres');
    fields.nombre = nombre.slice(0, 80);
  }

  let nuevoSlug: string | null = null;
  if (patch.slug !== undefined) {
    nuevoSlug = normalizeCategoriaSlug(patch.slug);
    if (!nuevoSlug) throw new Error('El slug no es válido');
    if (nuevoSlug !== actual.slug) {
      const choque = await buscarPorSlug(supabase, organizacionId, nuevoSlug);
      if (choque) throw new CategoriaConflictError(nuevoSlug);
      fields.slug = nuevoSlug;
    } else {
      nuevoSlug = null;
    }
  }

  if (patch.incluir_sin_stock_en_lista !== undefined) {
    fields.incluir_sin_stock_en_lista = Boolean(patch.incluir_sin_stock_en_lista);
  }

  if (patch.orden !== undefined) {
    const orden = Number(patch.orden);
    if (Number.isFinite(orden)) fields.orden = Math.trunc(orden);
  }

  if (Object.keys(fields).length === 0) return actual as CategoriaCatalogo;

  const { data, error } = await supabase
    .from('catalogo_categorias')
    .update(fields)
    .eq('id', id)
    .eq('organizacion_id', organizacionId)
    .select(CATEGORIA_SELECT)
    .single();
  if (error) {
    if (error.code === '23505' && nuevoSlug) throw new CategoriaConflictError(nuevoSlug);
    throw error;
  }

  if (nuevoSlug) {
    const { error: itemsError } = await supabase
      .from('chat_catalogo')
      .update({ categoria: nuevoSlug, categoria_id: id })
      .eq('organizacion_id', organizacionId)
      .or(`categoria_id.eq.${id},categoria.eq.${actual.slug}`);
    if (itemsError) throw itemsError;
  }

  return data as CategoriaCatalogo;
}

/** Borra la categoría y deja sin categoría a sus ítems. */
export async function eliminarCategoria(
  supabase: SupabaseClient,
  organizacionId: string,
  id: string,
): Promise<boolean> {
  const { data: actual, error: actualError } = await supabase
    .from('catalogo_categorias')
    .select('id, slug')
    .eq('id', id)
    .eq('organizacion_id', organizacionId)
    .maybeSingle();
  if (actualError) throw actualError;
  if (!actual) return false;

  const { error: itemsError } = await supabase
    .from('chat_catalogo')
    .update({ categoria: null, categoria_id: null })
    .eq('organizacion_id', organizacionId)
    .or(`categoria_id.eq.${id},categoria.eq.${actual.slug}`);
  if (itemsError) throw itemsError;

  const { error } = await supabase
    .from('catalogo_categorias')
    .delete()
    .eq('id', id)
    .eq('organizacion_id', organizacionId);
  if (error) throw error;
  return true;
}
