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
  stock: number;
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

  const optionalUrl = (value: unknown) => {
    const text = String(value ?? '').trim();
    return text || null;
  };

  return {
    ok: true,
    fields: {
      tipo,
      nombre,
      precio,
      descripcion: optionalUrl(body.descripcion),
      imagen_url: optionalUrl(body.imagen_url),
      archivo_url: optionalUrl(body.archivo_url),
      categoria: normalizeCatalogoCategoria(body.categoria),
      stock,
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
