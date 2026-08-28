import type { CatalogoItem, CatalogoTipo } from '@/lib/chat/catalogoVentas';
import { armarPresupuesto, type PresupuestoLinea } from '@/lib/chat/armarPresupuesto';
import { formatCatalogPrecio } from '@/lib/chat/respuestasRapidas';

export type PlantillaVars = {
  cliente?: string | null;
  nombre?: string | null;
  telefono?: string | null;
  titulo?: string | null;
  detalle?: string | null;
  precio?: string | null;
  items?: string | null;
  total?: string | null;
  fecha?: string | null;
};

export const DEFAULT_PLANTILLA_PRESUPUESTO = `Estimado {{cliente}},

{{items}}

Total: {{total}}

¿Confirmamos el pedido?`;

export const DEFAULT_PLANTILLA_PROPUESTA = `{{cliente}}, te comparto nuestra propuesta:

{{titulo}}

{{detalle}}

Precio: {{precio}}

¿Te parece para avanzar?`;

export function defaultPlantillaParaTipo(tipo: CatalogoTipo): string {
  if (tipo === 'presupuesto') return DEFAULT_PLANTILLA_PRESUPUESTO;
  if (tipo === 'propuesta') return DEFAULT_PLANTILLA_PROPUESTA;
  return '';
}

export function aplicarPlantillaCatalogo(
  plantilla: string,
  vars: PlantillaVars,
): string {
  const map: Record<string, string> = {
    cliente: vars.cliente || vars.nombre || 'cliente',
    nombre: vars.nombre || '',
    telefono: vars.telefono || '',
    titulo: vars.titulo || '',
    detalle: vars.detalle || '',
    precio: vars.precio || '',
    items: vars.items || '',
    total: vars.total || '',
    fecha: vars.fecha || new Date().toLocaleDateString('es-AR'),
  };

  return plantilla.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => map[key] ?? '');
}

export function armarTextoDesdeItemCatalogo(
  item: Pick<
    CatalogoItem,
    'tipo' | 'nombre' | 'precio' | 'descripcion' | 'plantilla'
  >,
  vars: PlantillaVars,
): string {
  const plantilla =
    (item.plantilla && item.plantilla.trim()) || defaultPlantillaParaTipo(item.tipo);

  const precioFmt = formatCatalogPrecio(item.precio);
  const merged: PlantillaVars = {
    ...vars,
    titulo: vars.titulo || item.nombre,
    detalle: vars.detalle || item.descripcion || '',
    precio: vars.precio || precioFmt,
    items: vars.items || `• ${item.nombre} — ${precioFmt}`,
    total: vars.total || precioFmt,
  };

  return aplicarPlantillaCatalogo(plantilla, merged).trim();
}

export function armarTextoPresupuestoCarrito(
  lineas: PresupuestoLinea[],
  vars: PlantillaVars,
  plantilla?: string | null,
): string {
  const { texto, total } = armarPresupuesto(lineas);
  const itemsBlock = texto
    .replace(/^Presupuesto:\n?/, '')
    .replace(/\n\nTotal:[\s\S]*$/, '')
    .trim();
  const totalFmt = formatCatalogPrecio(total);

  if (plantilla?.trim()) {
    return aplicarPlantillaCatalogo(plantilla, {
      ...vars,
      items: itemsBlock,
      total: totalFmt,
    }).trim();
  }

  return texto;
}
