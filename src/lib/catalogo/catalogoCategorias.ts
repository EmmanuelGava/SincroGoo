import type { CatalogoItem } from '@/lib/chat/catalogoVentas';

export function stockDisponible(item: Pick<CatalogoItem, 'stock' | 'stock_reservado'>): number {
  const stock = Number(item.stock ?? 0);
  const reservado = Number(item.stock_reservado ?? 0);
  return Math.max(stock - reservado, 0);
}

export function nombreDisplayCatalogo(
  item: Pick<CatalogoItem, 'nombre' | 'variante_label' | 'parent_id'>,
  parentNombre?: string | null,
): string {
  if (item.variante_label?.trim()) {
    const base = parentNombre?.trim() || item.nombre.trim();
    return `${base} (${item.variante_label.trim()})`;
  }
  return item.nombre.trim();
}

export function normalizeCategoriaSlug(value: unknown): string | null {
  const text = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
  return text || null;
}

export type CategoriaCatalogo = {
  id: string;
  slug: string;
  nombre: string;
  incluir_sin_stock_en_lista: boolean;
  orden: number;
};

export function filterCategoriasSlash(
  categorias: CategoriaCatalogo[],
  query: string,
): CategoriaCatalogo[] {
  const q = query.trim().toLowerCase();
  if (!q) return categorias.slice(0, 8);
  return categorias
    .filter((c) => c.slug.startsWith(q) || c.nombre.toLowerCase().includes(q))
    .slice(0, 8);
}
