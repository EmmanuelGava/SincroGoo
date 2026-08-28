import { formatCatalogPrecio } from '@/lib/chat/respuestasRapidas';

export type ListaCategoriaItem = {
  nombre: string;
  precio: number | null;
  categoria: string | null;
  stock: number;
  imagen_url?: string | null;
  imagen_urls?: string[] | null;
};

export type ArmarListaOptions = {
  incluirSinStock?: boolean;
};

export type ArmarListaResult = {
  texto: string;
  imagenes: string[];
};

function tituloCategoria(categoria: string): string {
  const trimmed = categoria.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Lista de precios por categoría. Por defecto solo stock > 0; opción incluir sin stock. */
export function armarListaCategoria(
  items: ListaCategoriaItem[],
  categoria: string,
  options?: ArmarListaOptions,
): ArmarListaResult {
  const key = categoria.trim().toLowerCase();
  if (!key) return { texto: '', imagenes: [] };

  const incluirSinStock = options?.incluirSinStock ?? false;

  const filtrados = items.filter((item) => {
    const catMatch = (item.categoria || '').trim().toLowerCase() === key;
    if (!catMatch) return false;
    if (incluirSinStock) return true;
    return item.stock > 0;
  });

  if (filtrados.length === 0) return { texto: '', imagenes: [] };

  const lineas = filtrados.map((item) => {
    const precio = formatCatalogPrecio(item.precio);
    if (item.stock <= 0) {
      return `• ${item.nombre.trim()} — ${precio} (sin stock)`;
    }
    return `• ${item.nombre.trim()} — ${precio}`;
  });

  const titulo = incluirSinStock
    ? `${tituloCategoria(key)} (con y sin stock):`
    : `${tituloCategoria(key)} en stock:`;

  const imagenes: string[] = [];
  for (const item of filtrados) {
    if (item.imagen_urls?.length) {
      for (const u of item.imagen_urls) {
        if (u && !imagenes.includes(u)) imagenes.push(u);
      }
    } else if (item.imagen_url?.trim()) {
      const u = item.imagen_url.trim();
      if (!imagenes.includes(u)) imagenes.push(u);
    }
  }

  return {
    texto: [titulo, '', ...lineas].join('\n'),
    imagenes,
  };
}
