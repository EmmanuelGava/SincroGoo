import { parseStockMinimo } from '@/lib/catalogo/stockAlerts';
import { parseCatalogoImagenUrls, imagenUrlsToJsonb } from '@/lib/catalogo/catalogoImagenes';

export const CATALOGO_TIPOS = ['producto', 'presupuesto', 'propuesta'] as const;
export type CatalogoTipo = (typeof CATALOGO_TIPOS)[number];

export const CATALOGO_TIPO_LABEL: Record<CatalogoTipo, string> = {
  producto: 'Producto',
  presupuesto: 'Presupuesto',
  propuesta: 'Propuesta',
};

export type CatalogoItem = {
  id: string;
  tipo: CatalogoTipo;
  nombre: string;
  precio: number | null;
  descripcion: string | null;
  imagen_url: string | null;
  archivo_url: string | null;
  categoria: string | null;
  categoria_id: string | null;
  stock: number;
  stock_minimo: number | null;
  stock_reservado?: number;
  parent_id: string | null;
  variante_label: string | null;
  plantilla: string | null;
  imagen_urls: string[];
};

export function isCatalogoTipo(value: unknown): value is CatalogoTipo {
  return CATALOGO_TIPOS.includes(String(value) as CatalogoTipo);
}

export function normalizeCatalogoCategoria(value: unknown): string | null {
  const text = String(value ?? '').trim().toLowerCase();
  return text || null;
}

export function parseCatalogoStock(value: unknown): number {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 0;
  }
  const n = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    return Number.NaN;
  }
  return n;
}

export function validateCatalogoItem(body: {
  tipo?: unknown;
  nombre?: unknown;
  precio?: unknown;
  descripcion?: unknown;
  imagen_url?: unknown;
  archivo_url?: unknown;
  categoria?: unknown;
  stock?: unknown;
  stock_minimo?: unknown;
  parent_id?: unknown;
  variante_label?: unknown;
  categoria_id?: unknown;
  plantilla?: unknown;
  imagen_urls?: unknown;
}): { ok: false; error: string } | { ok: true; fields: Omit<CatalogoItem, 'id'> } {
  const tipo = isCatalogoTipo(body.tipo) ? body.tipo : 'producto';
  const nombre = String(body.nombre ?? '').trim();
  if (nombre.length < 2) {
    return { ok: false, error: 'El nombre es requerido' };
  }
  if (nombre.length > 120) {
    return { ok: false, error: 'El nombre no puede superar 120 caracteres' };
  }

  let precio: number | null = null;
  if (body.precio !== undefined && body.precio !== null && String(body.precio).trim() !== '') {
    const n = Number(String(body.precio).replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: 'El precio no es válido' };
    }
    precio = n;
  }

  const stock = parseCatalogoStock(body.stock);
  if (!Number.isFinite(stock)) {
    return { ok: false, error: 'El stock no es válido' };
  }

  const stockMinimo = parseStockMinimo(body.stock_minimo);
  if (!Number.isFinite(stockMinimo) && body.stock_minimo !== undefined) {
    return { ok: false, error: 'El umbral de alerta no es válido' };
  }

  const optionalUrl = (value: unknown) => {
    const text = String(value ?? '').trim();
    return text || null;
  };

  const optionalText = (value: unknown, max = 8000) => {
    const text = String(value ?? '').trim();
    if (!text) return null;
    return text.slice(0, max);
  };

  const parentId = optionalUrl(body.parent_id);
  const categoriaId = optionalUrl(body.categoria_id);
  const imagenUrls = imagenUrlsToJsonb(
    parseCatalogoImagenUrls(body.imagen_urls, optionalUrl(body.imagen_url)),
  );
  const imagenUrl = imagenUrls[0] ?? null;

  return {
    ok: true,
    fields: {
      tipo,
      nombre,
      precio,
      descripcion: optionalText(body.descripcion, 4000),
      imagen_url: imagenUrl,
      archivo_url: optionalUrl(body.archivo_url),
      categoria: normalizeCatalogoCategoria(body.categoria),
      categoria_id: categoriaId,
      stock,
      stock_minimo: stockMinimo,
      stock_reservado: 0,
      parent_id: parentId,
      variante_label: optionalText(body.variante_label, 80),
      plantilla: optionalText(body.plantilla, 8000),
      imagen_urls: imagenUrls,
    },
  };
}

export const CATALOGO_FILE_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
].join(',');

export function catalogAttachment(item: Pick<CatalogoItem, 'imagen_url' | 'archivo_url' | 'nombre'>) {
  if (item.imagen_url) {
    return { url: item.imagen_url, fileName: item.nombre, fileType: 'image' as const };
  }
  if (item.archivo_url) {
    return { url: item.archivo_url, fileName: item.nombre, fileType: 'file' as const };
  }
  return null;
}
