import { telefonoDigits } from '@/lib/contactos/normalizarTelefono';

export type ContactoBody = {
  nombre?: unknown;
  telefono?: unknown;
  email?: unknown;
  empresa?: unknown;
  notas?: unknown;
  wa_jid?: unknown;
  etiquetas?: unknown;
};

export type ContactoWriteFields = {
  nombre?: string;
  telefono?: string | null;
  telefono_digits?: string | null;
  email?: string | null;
  empresa?: string | null;
  notas?: string | null;
  wa_jid?: string | null;
  etiquetas?: string[];
};

export function normalizeEtiquetas(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    const tag = String(item).trim().toLowerCase();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      result.push(tag);
    }
  }
  return result;
}

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

export function isUniquePhoneViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === '23505';
}

/** Campos a insertar/actualizar. Si requireNombre, nombre vacío → error. */
export function contactoWriteFields(
  body: ContactoBody,
  opts: { requireNombre: boolean; partial: boolean }
): { error: string } | { fields: ContactoWriteFields } {
  const hasNombre = Object.prototype.hasOwnProperty.call(body, 'nombre');
  if (opts.requireNombre || hasNombre) {
    const nombre = optionalString(body.nombre);
    if (!nombre) {
      return { error: 'El nombre es requerido' };
    }
  }

  const fields: ContactoWriteFields = {};

  if (!opts.partial || hasNombre) {
    const nombre = optionalString(body.nombre);
    if (nombre) fields.nombre = nombre;
  }

  const assignIfPresent = (key: 'email' | 'empresa' | 'notas' | 'wa_jid') => {
    if (opts.partial && !Object.prototype.hasOwnProperty.call(body, key)) return;
    fields[key] = optionalString(body[key]);
  };

  assignIfPresent('email');
  assignIfPresent('empresa');
  assignIfPresent('notas');
  assignIfPresent('wa_jid');

  if (!opts.partial || Object.prototype.hasOwnProperty.call(body, 'telefono')) {
    const telefono = optionalString(body.telefono);
    fields.telefono = telefono;
    fields.telefono_digits = telefonoDigits(telefono);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'etiquetas')) {
    fields.etiquetas = normalizeEtiquetas(body.etiquetas);
  }

  return { fields };
}
