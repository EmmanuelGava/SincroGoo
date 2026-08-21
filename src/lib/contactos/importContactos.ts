import type { SupabaseClient } from '@supabase/supabase-js';
import { isUniquePhoneViolation } from '@/lib/contactos/contactoWrite';
import { telefonoDigits } from '@/lib/contactos/normalizarTelefono';

export type ImportDraft = {
  nombre: string;
  telefono: string | null;
  email: string | null;
  empresa: string | null;
};

export type ImportDecision =
  | { action: 'skip'; reason: string }
  | { action: 'create'; draft: ImportDraft }
  | { action: 'update'; id: string; draft: ImportDraft };

const HEADER_NOMBRE = /^(nombre|name|full.?name|contacto|display.?name)$/i;
const HEADER_TELEFONO = /^(telefono|teléfono|phone|celular|whatsapp|mobile|movil|móvil)$/i;
const HEADER_EMAIL = /^(email|mail|correo|e-mail)$/i;
const HEADER_EMPRESA = /^(empresa|company|organizacion|organización|org|organization)$/i;

function normHeader(value: string): string {
  return value.replace(/^\uFEFF/, '').trim();
}

function cell(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function mapHeaderIndex(headers: string[]): {
  nombre: number;
  telefono: number;
  email: number;
  empresa: number;
} {
  const mapped = { nombre: -1, telefono: -1, email: -1, empresa: -1 };
  headers.forEach((raw, index) => {
    const h = normHeader(raw);
    if (mapped.nombre < 0 && HEADER_NOMBRE.test(h)) mapped.nombre = index;
    else if (mapped.telefono < 0 && HEADER_TELEFONO.test(h)) mapped.telefono = index;
    else if (mapped.email < 0 && HEADER_EMAIL.test(h)) mapped.email = index;
    else if (mapped.empresa < 0 && HEADER_EMPRESA.test(h)) mapped.empresa = index;
  });
  return mapped;
}

export function draftFromCells(
  row: unknown[],
  headers: ReturnType<typeof mapHeaderIndex>
): ImportDraft {
  const nombre = headers.nombre >= 0 ? cell(row[headers.nombre]) : '';
  const telefono = headers.telefono >= 0 ? cell(row[headers.telefono]) || null : null;
  const email = headers.email >= 0 ? cell(row[headers.email]).toLowerCase() || null : null;
  const empresa = headers.empresa >= 0 ? cell(row[headers.empresa]) || null : null;
  const fallback = nombre || email || telefono || '';
  return { nombre: fallback, telefono, email, empresa };
}

export function draftsFromTable(values: unknown[][]): ImportDraft[] {
  if (!values.length) return [];
  const headers = mapHeaderIndex((values[0] || []).map((h) => cell(h)));
  if (headers.nombre < 0 && headers.telefono < 0 && headers.email < 0) {
    return [];
  }
  return values.slice(1).map((row) => draftFromCells(row, headers));
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
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

export function parseCsvTable(text: string): string[][] {
  const raw = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!raw) return [];
  const firstLine = raw.split('\n')[0] || '';
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  return raw.split('\n').filter((line) => line.trim().length > 0).map((line) => splitCsvLine(line, delimiter));
}

export function draftsFromCsv(text: string): ImportDraft[] {
  return draftsFromTable(parseCsvTable(text));
}

export function peopleToDraft(person: {
  names?: Array<{ displayName?: string; givenName?: string; familyName?: string }>;
  phoneNumbers?: Array<{ value?: string }>;
  emailAddresses?: Array<{ value?: string }>;
  organizations?: Array<{ name?: string }>;
}): ImportDraft | null {
  const name = person.names?.[0];
  const nombre = cell(name?.displayName || [name?.givenName, name?.familyName].filter(Boolean).join(' '));
  const telefono = cell(person.phoneNumbers?.[0]?.value) || null;
  const email = cell(person.emailAddresses?.[0]?.value).toLowerCase() || null;
  const empresa = cell(person.organizations?.[0]?.name) || null;
  if (!nombre && !telefono && !email) return null;
  return {
    nombre: nombre || email || telefono || 'Sin nombre',
    telefono,
    email,
    empresa,
  };
}

export function decideImportRow(
  row: ImportDraft,
  byPhone: Map<string, string>,
  byEmail: Map<string, string>
): ImportDecision {
  const telefono = row.telefono ? cell(row.telefono) || null : null;
  const email = row.email ? cell(row.email).toLowerCase() || null : null;
  const nombre = cell(row.nombre) || email || telefono || '';
  if (!nombre && !telefono && !email) {
    return { action: 'skip', reason: 'vacío' };
  }
  if (!nombre) {
    return { action: 'skip', reason: 'sin nombre' };
  }
  const draft: ImportDraft = {
    nombre,
    telefono,
    email,
    empresa: row.empresa ? cell(row.empresa) || null : null,
  };
  const digits = telefonoDigits(telefono);
  if (digits && byPhone.has(digits)) {
    return { action: 'update', id: byPhone.get(digits) as string, draft };
  }
  if (email && byEmail.has(email)) {
    return { action: 'update', id: byEmail.get(email) as string, draft };
  }
  return { action: 'create', draft };
}

export const IMPORT_MAX_ROWS = 2000;

export async function applyImportDrafts(
  supabase: SupabaseClient,
  usuarioId: string,
  drafts: ImportDraft[]
): Promise<{ created: number; updated: number; skipped: number }> {
  const limited = drafts.slice(0, IMPORT_MAX_ROWS);
  const { data: existing } = await supabase
    .from('contactos')
    .select('id, telefono_digits, email')
    .eq('usuario_id', usuarioId);

  const byPhone = new Map<string, string>();
  const byEmail = new Map<string, string>();
  for (const row of existing || []) {
    if (row.telefono_digits) byPhone.set(String(row.telefono_digits), String(row.id));
    if (row.email) byEmail.set(String(row.email).trim().toLowerCase(), String(row.id));
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of limited) {
    const decision = decideImportRow(row, byPhone, byEmail);
    if (decision.action === 'skip') {
      skipped += 1;
      continue;
    }
    const digits = telefonoDigits(decision.draft.telefono);
    const payload = {
      nombre: decision.draft.nombre,
      telefono: decision.draft.telefono,
      telefono_digits: digits,
      email: decision.draft.email,
      empresa: decision.draft.empresa,
      fecha_actualizacion: new Date().toISOString(),
    };
    if (decision.action === 'update') {
      await supabase.from('contactos').update(payload).eq('id', decision.id);
      updated += 1;
      continue;
    }
    const { data, error } = await supabase
      .from('contactos')
      .insert({
        usuario_id: usuarioId,
        nombre: payload.nombre,
        telefono: payload.telefono,
        telefono_digits: payload.telefono_digits,
        email: payload.email,
        empresa: payload.empresa,
      })
      .select('id')
      .single();
    if (error && isUniquePhoneViolation(error) && digits && byPhone.has(digits)) {
      const id = byPhone.get(digits) as string;
      await supabase.from('contactos').update(payload).eq('id', id);
      updated += 1;
      continue;
    }
    if (!data?.id) {
      skipped += 1;
      continue;
    }
    created += 1;
    if (digits) byPhone.set(digits, data.id);
    if (payload.email) byEmail.set(payload.email, data.id);
  }

  skipped += Math.max(0, drafts.length - limited.length);
  return { created, updated, skipped };
}
