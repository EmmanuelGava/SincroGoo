import type { CatalogoItem } from '@/lib/chat/catalogoVentas';

export function parseCatalogoImagenUrls(
  imagen_urls: unknown,
  imagen_url?: string | null,
): string[] {
  const urls: string[] = [];
  if (Array.isArray(imagen_urls)) {
    for (const u of imagen_urls) {
      const t = String(u ?? '').trim();
      if (t) urls.push(t);
    }
  }
  const legacy = String(imagen_url ?? '').trim();
  if (legacy && !urls.includes(legacy)) {
    urls.unshift(legacy);
  }
  return urls;
}

export function imagenUrlsToJsonb(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const t = String(u ?? '').trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function mapCatalogoRow(row: Record<string, unknown>): CatalogoItem {
  const imagen_urls = parseCatalogoImagenUrls(row.imagen_urls, row.imagen_url as string | null);
  return {
    id: String(row.id),
    tipo: row.tipo as CatalogoItem['tipo'],
    nombre: String(row.nombre ?? ''),
    precio: row.precio == null ? null : Number(row.precio),
    descripcion: (row.descripcion as string | null) ?? null,
    imagen_url: imagen_urls[0] ?? null,
    archivo_url: (row.archivo_url as string | null) ?? null,
    categoria: (row.categoria as string | null) ?? null,
    categoria_id: (row.categoria_id as string | null) ?? null,
    stock: Number(row.stock ?? 0),
    stock_minimo: row.stock_minimo == null ? null : Number(row.stock_minimo),
    stock_reservado: Number(row.stock_reservado ?? 0),
    parent_id: (row.parent_id as string | null) ?? null,
    variante_label: (row.variante_label as string | null) ?? null,
    plantilla: (row.plantilla as string | null) ?? null,
    imagen_urls,
  };
}

export const CATALOGO_DB_SELECT =
  'id, tipo, nombre, precio, descripcion, imagen_url, archivo_url, categoria, categoria_id, stock, stock_minimo, stock_reservado, parent_id, variante_label, plantilla, imagen_urls, created_at';
