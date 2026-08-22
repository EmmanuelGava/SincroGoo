import type { CatalogoItem } from '@/lib/chat/catalogoVentas';

export type PresupuestoLinea = Pick<CatalogoItem, 'nombre' | 'precio' | 'descripcion'>;

function formatPrecio(precio: number | null): string {
  if (precio === null || !Number.isFinite(precio)) return 'Consultar';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(precio);
}

export function armarPresupuesto(lineas: PresupuestoLinea[]): { texto: string; total: number } {
  if (lineas.length === 0) {
    return { texto: '', total: 0 };
  }

  const rows = lineas.map((linea) => {
    const precio = linea.precio ?? 0;
    const detalle = linea.descripcion?.trim();
    const base = `• ${linea.nombre.trim()} — ${formatPrecio(linea.precio)}`;
    return detalle ? `${base}\n  ${detalle}` : base;
  });

  const total = lineas.reduce((sum, linea) => sum + (linea.precio ?? 0), 0);
  const texto = [
    'Presupuesto:',
    ...rows,
    '',
    `Total: ${formatPrecio(total)}`,
  ].join('\n');

  return { texto, total };
}

export function primeraImagenCarrito(items: Pick<CatalogoItem, 'imagen_url'>[]): string | null {
  for (const item of items) {
    const url = item.imagen_url?.trim();
    if (url) return url;
  }
  return null;
}
