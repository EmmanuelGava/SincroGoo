import { formatCatalogPrecio } from '@/lib/chat/respuestasRapidas';

export type ListaCategoriaItem = {
  nombre: string;
  precio: number | null;
  categoria: string | null;
  stock: number;
};

function tituloCategoria(categoria: string): string {
  const trimmed = categoria.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Lista de precios por categoría: solo stock > 0, sin total ni cantidades. */
export function armarListaCategoria(
  items: ListaCategoriaItem[],
  categoria: string
): string {
  const key = categoria.trim().toLowerCase();
  if (!key) return '';

  const filtrados = items.filter(
    (item) =>
      item.stock > 0 &&
      (item.categoria || '').trim().toLowerCase() === key
  );

  if (filtrados.length === 0) return '';

  const lineas = filtrados.map(
    (item) => `• ${item.nombre.trim()} — ${formatCatalogPrecio(item.precio)}`
  );

  return [`${tituloCategoria(key)} en stock:`, '', ...lineas].join('\n');
}
