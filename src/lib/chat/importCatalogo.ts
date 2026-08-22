import type { SupabaseClient } from '@supabase/supabase-js';
import { CATALOGO_TIPOS, isCatalogoTipo, type CatalogoTipo, validateCatalogoItem } from './catalogoVentas';

export type CatalogoDraft = {
  tipo: CatalogoTipo;
  nombre: string;
  precio: number | null;
  descripcion: string | null;
  imagen_url: string | null;
  archivo_url: string | null;
  categoria: string | null;
  stock: number;
};

const HEADER_TIPO = /^(tipo|type|kind)$/i;
const HEADER_NOMBRE = /^(nombre|name|titulo|título|producto|item)$/i;
const HEADER_PRECIO = /^(precio|price|importe|monto|valor)$/i;
const HEADER_DESC = /^(descripcion|descripción|incluye|detalle|detail|description)$/i;
const HEADER_IMAGEN = /^(imagen|imagen_url|image|foto|photo|url_imagen)$/i;
const HEADER_ARCHIVO = /^(archivo|archivo_url|file|pdf|documento|url_archivo)$/i;
const HEADER_CATEGORIA = /^(categoria|categoría|category|cat)$/i;
const HEADER_STOCK = /^(stock|cantidad|qty|inventario)$/i;

function cell(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normHeader(value: string): string {
  return value.replace(/^\uFEFF/, '').trim();
}

export function parseCatalogPrecioCell(raw: string): number | null {
  const t = raw.replace(/\$/g, '').replace(/\s/g, '').trim();
  if (!t) return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) {
    const n = Number(t.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function inferCatalogTipo(raw: string, fallback: CatalogoTipo = 'producto'): CatalogoTipo {
  const t = raw.trim().toLowerCase();
  if (isCatalogoTipo(t)) return t;
  if (/presup|quote|budget/.test(t)) return 'presupuesto';
  if (/propues|cotiz|proposal/.test(t)) return 'propuesta';
  if (/prod|sku|item/.test(t)) return 'producto';
  return fallback;
}

export function mapCatalogHeaderIndex(headers: string[]) {
  const mapped = {
    tipo: -1,
    nombre: -1,
    precio: -1,
    descripcion: -1,
    imagen_url: -1,
    archivo_url: -1,
    categoria: -1,
    stock: -1,
  };
  headers.forEach((raw, index) => {
    const h = normHeader(raw);
    if (mapped.tipo < 0 && HEADER_TIPO.test(h)) mapped.tipo = index;
    else if (mapped.nombre < 0 && HEADER_NOMBRE.test(h)) mapped.nombre = index;
    else if (mapped.precio < 0 && HEADER_PRECIO.test(h)) mapped.precio = index;
    else if (mapped.descripcion < 0 && HEADER_DESC.test(h)) mapped.descripcion = index;
    else if (mapped.imagen_url < 0 && HEADER_IMAGEN.test(h)) mapped.imagen_url = index;
    else if (mapped.archivo_url < 0 && HEADER_ARCHIVO.test(h)) mapped.archivo_url = index;
    else if (mapped.categoria < 0 && HEADER_CATEGORIA.test(h)) mapped.categoria = index;
    else if (mapped.stock < 0 && HEADER_STOCK.test(h)) mapped.stock = index;
  });
  return mapped;
}

export function draftsFromCatalogTable(
  values: unknown[][],
  fallbackTipo: CatalogoTipo = 'producto'
): CatalogoDraft[] {
  if (values.length < 2) return [];
  const headers = mapCatalogHeaderIndex((values[0] || []).map((h) => cell(h)));
  if (headers.nombre < 0) return [];
  const drafts: CatalogoDraft[] = [];
  for (const row of values.slice(1)) {
    const nombre = headers.nombre >= 0 ? cell(row[headers.nombre]) : '';
    if (nombre.length < 2) continue;
    const tipoRaw = headers.tipo >= 0 ? cell(row[headers.tipo]) : '';
    const parsed = validateCatalogoItem({
      tipo: inferCatalogTipo(tipoRaw, fallbackTipo),
      nombre,
      precio: headers.precio >= 0 ? parseCatalogPrecioCell(cell(row[headers.precio])) : null,
      descripcion: headers.descripcion >= 0 ? cell(row[headers.descripcion]) : null,
      imagen_url: headers.imagen_url >= 0 ? cell(row[headers.imagen_url]) : null,
      archivo_url: headers.archivo_url >= 0 ? cell(row[headers.archivo_url]) : null,
      categoria: headers.categoria >= 0 ? cell(row[headers.categoria]) : null,
      stock: headers.stock >= 0 ? cell(row[headers.stock]) : 0,
    });
    if (parsed.ok) drafts.push(parsed.fields);
  }
  return drafts;
}

export function draftsFromCatalogCsv(csv: string, fallbackTipo: CatalogoTipo = 'producto'): CatalogoDraft[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const rows = lines.map((line) => splitCsvLine(line, delimiter));
  return draftsFromCatalogTable(rows, fallbackTipo);
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === delimiter) {
      out.push(current);
      current = '';
    } else if (ch === '"') {
      quoted = true;
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

export function draftFromUploadedFile(
  fileName: string,
  url: string,
  mime: string,
  fallbackTipo: CatalogoTipo
): CatalogoDraft {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Ítem';
  const tipo = inferCatalogTipo(base, fallbackTipo);
  const isImage = mime.startsWith('image/');
  return {
    tipo,
    nombre: base,
    precio: null,
    descripcion: null,
    imagen_url: isImage ? url : null,
    archivo_url: isImage ? null : url,
    categoria: null,
    stock: 0,
  };
}

export function catalogItemKey(tipo: string, nombre: string): string {
  return `${tipo.toLowerCase()}::${nombre.trim().toLowerCase()}`;
}

export const CATALOGO_CSV_TEMPLATE =
  'tipo,nombre,precio,descripcion,categoria,stock,imagen_url,archivo_url\n' +
  'producto,Mango,12000,Sabor tropical,vapers,5,,\n' +
  'producto,Colchoneta,26000,Espuma 2 cm y funda lavable,colchonetas,3,,\n' +
  'presupuesto,Obra Norte,180000,Instalación completa,,0,,\n' +
  'propuesta,Plan mensual,45000,Mantenimiento 12 meses,,0,,\n';

export async function applyCatalogDrafts(
  supabase: SupabaseClient,
  usuarioId: string,
  drafts: CatalogoDraft[]
): Promise<{ created: number; updated: number; total: number }> {
  const { data: existing, error: existingError } = await supabase
    .from('chat_catalogo')
    .select('id, tipo, nombre')
    .eq('usuario_id', usuarioId);
  if (existingError) throw existingError;

  const byKey = new Map(
    (existing || []).map((row: { id: string; tipo: string; nombre: string }) => [
      catalogItemKey(row.tipo, row.nombre),
      row.id,
    ])
  );

  let created = 0;
  let updated = 0;
  for (const draft of drafts) {
    const key = catalogItemKey(draft.tipo, draft.nombre);
    const id = byKey.get(key);
    if (id) {
      const { error } = await supabase
        .from('chat_catalogo')
        .update({
          tipo: draft.tipo,
          nombre: draft.nombre,
          precio: draft.precio,
          descripcion: draft.descripcion,
          categoria: draft.categoria,
          stock: draft.stock,
          ...(draft.imagen_url ? { imagen_url: draft.imagen_url } : {}),
          ...(draft.archivo_url ? { archivo_url: draft.archivo_url } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('usuario_id', usuarioId);
      if (error) throw error;
      updated += 1;
    } else {
      const { data, error } = await supabase
        .from('chat_catalogo')
        .insert({ usuario_id: usuarioId, ...draft })
        .select('id, tipo, nombre')
        .single();
      if (error) throw error;
      if (data) byKey.set(catalogItemKey(data.tipo, data.nombre), data.id);
      created += 1;
    }
  }
  return { created, updated, total: drafts.length };
}

export { CATALOGO_TIPOS };
