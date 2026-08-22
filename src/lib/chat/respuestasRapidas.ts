import { cleanupEmptyNombreInText } from '@/lib/chat/conversationIdentity';

export type RespuestaRapida = {
  id: string;
  atajo: string;
  texto: string;
};

export type RespuestaVars = {
  nombre?: string | null;
  telefono?: string | null;
  producto?: string | null;
  precio?: string | null;
  incluye?: string | null;
};

export type RespuestaCategoria = 'general' | 'venta' | 'producto';

export const DEFAULT_RESPUESTAS_RAPIDAS: Array<{
  atajo: string;
  texto: string;
  categoria: RespuestaCategoria;
}> = [
  { atajo: 'hola', categoria: 'general', texto: 'Hola {{nombre}}, ¿cómo estás?' },
  { atajo: 'info', categoria: 'general', texto: 'Te escribo para darte más info. ¿Tenés un minuto?' },
  { atajo: 'gracias', categoria: 'general', texto: 'Gracias {{nombre}}. Cualquier cosa me avisás.' },
  {
    atajo: 'precio',
    categoria: 'venta',
    texto: 'Hola {{nombre}}, el precio de {{producto}} es {{precio}}. ¿Te lo reservo?',
  },
  {
    atajo: 'propuesta',
    categoria: 'venta',
    texto: '{{nombre}}, te armo una propuesta de {{producto}} para revisarla. ¿La mandamos hoy?',
  },
  {
    atajo: 'seguimiento',
    categoria: 'venta',
    texto: 'Hola {{nombre}}, te escribo para ver si pudiste revisar lo de {{producto}}. ¿Seguimos?',
  },
  {
    atajo: 'cierre',
    categoria: 'venta',
    texto: '{{nombre}}, ¿cerramos {{producto}}? Te confirmo forma de pago y entrega.',
  },
  {
    atajo: 'producto',
    categoria: 'producto',
    texto: '{{producto}}: incluye {{incluye}}. Precio {{precio}}. ¿Querés que te lo aparte?',
  },
];

export const CATEGORIA_LABEL: Record<RespuestaCategoria | 'custom', string> = {
  general: 'Saludo',
  venta: 'Venta',
  producto: 'Producto',
  custom: 'Tus respuestas',
};

export function categoriaDeAtajo(atajo: string): RespuestaCategoria | 'custom' {
  const found = DEFAULT_RESPUESTAS_RAPIDAS.find((item) => item.atajo === atajo.toLowerCase());
  return found?.categoria || 'custom';
}

export function missingDefaultRespuestas(existingAtajos: string[]) {
  const have = new Set(existingAtajos.map((a) => a.toLowerCase()));
  return DEFAULT_RESPUESTAS_RAPIDAS.filter((item) => !have.has(item.atajo));
}

export function parseSlashDraft(text: string): { active: boolean; query: string } {
  if (!text.startsWith('/')) return { active: false, query: '' };
  const rest = text.slice(1);
  if (/\s/.test(rest)) return { active: false, query: '' };
  return { active: true, query: rest.toLowerCase() };
}

export function filterRespuestasRapidas<T extends { atajo: string }>(
  items: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((item) => item.atajo.toLowerCase().startsWith(q))
    : [...items];
  return filtered.sort((a, b) => a.atajo.localeCompare(b.atajo, 'es'));
}

export function applyRespuestaTexto(template: string, vars: RespuestaVars): string {
  const nombre = (vars.nombre || '').trim();
  const telefono = (vars.telefono || '').trim();
  const producto = (vars.producto || '').trim() || '[producto]';
  const precio = (vars.precio || '').trim() || '$____';
  const incluye = (vars.incluye || '').trim() || '[incluye]';
  const hadNombrePlaceholder = /\{\{\s*nombre\s*\}\}/i.test(template);
  const raw = template
    .replace(/\{\{\s*nombre\s*\}\}/gi, nombre)
    .replace(/\{\{\s*telefono\s*\}\}/gi, telefono)
    .replace(/\{\{\s*producto\s*\}\}/gi, producto)
    .replace(/\{\{\s*precio\s*\}\}/gi, precio)
    .replace(/\{\{\s*incluye\s*\}\}/gi, incluye);
  if (hadNombrePlaceholder && !nombre) return cleanupEmptyNombreInText(raw);
  return raw;
}

export function fillCatalogPlaceholders(
  draft: string,
  opts: {
    nombre?: string | null;
    telefono?: string | null;
    item: { nombre: string; precio?: number | string | null; descripcion?: string | null };
  }
): string {
  const precio = formatCatalogPrecio(opts.item.precio);
  const incluye = (opts.item.descripcion || '').trim() || '[incluye]';
  return applyRespuestaTexto(draft, {
    nombre: opts.nombre,
    telefono: opts.telefono,
    producto: opts.item.nombre,
    precio,
    incluye,
  })
    .replace(/\[producto\]/gi, opts.item.nombre)
    .replace(/\$_{2,}/g, precio)
    .replace(/incluye\s*_{2,}/gi, `incluye ${incluye}`)
    .replace(/\[incluye\]/gi, incluye);
}

export function draftNeedsCatalog(text: string): boolean {
  return /\{\{\s*producto\s*\}\}/i.test(text) || /\[producto\]/i.test(text);
}

export function formatCatalogPrecio(precio: number | string | null | undefined): string {
  if (precio === null || precio === undefined || precio === '') return '$____';
  const n = typeof precio === 'number' ? precio : Number(String(precio).replace(',', '.'));
  if (!Number.isFinite(n)) return `$${precio}`;
  const negative = n < 0;
  const abs = Math.abs(n);
  const [intRaw, decRaw] = abs.toFixed(Number.isInteger(abs) ? 0 : 2).split('.');
  const int = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const body = decRaw ? `$${int},${decRaw}` : `$${int}`;
  return negative ? `-${body}` : body;
}

export function insertRespuestaInDraft(
  draft: string,
  template: string,
  vars: RespuestaVars
): string {
  return applyRespuestaTexto(template, vars);
}

export function normalizeAtajo(raw: string): string {
  return raw.trim().replace(/^\/+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function validateRespuestaRapida(input: {
  atajo: unknown;
  texto: unknown;
}): { ok: false; error: string } | { ok: true; atajo: string; texto: string } {
  const atajo = normalizeAtajo(String(input.atajo ?? ''));
  const texto = String(input.texto ?? '').trim();
  if (atajo.length < 2 || atajo.length > 32) {
    return { ok: false, error: 'El atajo debe tener entre 2 y 32 caracteres (letras, números o _)' };
  }
  if (!texto) {
    return { ok: false, error: 'El texto de la respuesta es requerido' };
  }
  if (texto.length > 2000) {
    return { ok: false, error: 'El texto no puede superar 2000 caracteres' };
  }
  return { ok: true, atajo, texto };
}
