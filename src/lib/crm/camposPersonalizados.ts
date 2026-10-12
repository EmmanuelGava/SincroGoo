export type CampoEntidad = 'lead' | 'contacto';
export type CampoTipo = 'texto' | 'numero' | 'fecha' | 'opcion' | 'si_no';

export const CAMPO_TIPOS: Array<{ id: CampoTipo; label: string }> = [
  { id: 'texto', label: 'Texto' },
  { id: 'numero', label: 'Número' },
  { id: 'fecha', label: 'Fecha' },
  { id: 'opcion', label: 'Lista de opciones' },
  { id: 'si_no', label: 'Sí / No' },
];

export type CampoDefinicion = {
  id: string;
  entidad: CampoEntidad;
  clave: string;
  etiqueta: string;
  tipo: CampoTipo;
  opciones: string[];
  orden: number;
  mostrar_en_tarjeta: boolean;
};

export type CamposValores = Record<string, string | number | boolean>;

const TEXTO_MAX = 500;
const OPCIONES_MAX = 30;
const OPCION_MAX = 60;

export function isCampoEntidad(value: unknown): value is CampoEntidad {
  return value === 'lead' || value === 'contacto';
}

export function isCampoTipo(value: unknown): value is CampoTipo {
  return CAMPO_TIPOS.some((t) => t.id === value);
}

export function claveDesdeEtiqueta(etiqueta: string): string {
  return etiqueta
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
    .replace(/_+$/g, '');
}

function normalizarOpciones(raw: unknown): string[] | null {
  const lista = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',')
      : [];
  const vistas = new Set<string>();
  const opciones: string[] = [];
  for (const item of lista) {
    const op = String(item ?? '').trim().slice(0, OPCION_MAX);
    const key = op.toLowerCase();
    if (!op || vistas.has(key)) continue;
    vistas.add(key);
    opciones.push(op);
  }
  return opciones.length > OPCIONES_MAX ? null : opciones;
}

export type CampoDefinicionInput = {
  entidad: CampoEntidad;
  clave: string;
  etiqueta: string;
  tipo: CampoTipo;
  opciones: string[];
  mostrar_en_tarjeta: boolean;
};

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseCampoDefinicionNueva(body: unknown): Parsed<CampoDefinicionInput> {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (!isCampoEntidad(b.entidad)) return { ok: false, error: 'Entidad inválida (lead o contacto)' };
  if (!isCampoTipo(b.tipo)) return { ok: false, error: 'Tipo de campo inválido' };

  const etiqueta = String(b.etiqueta ?? '').trim();
  if (!etiqueta || etiqueta.length > 60) return { ok: false, error: 'El nombre del campo es obligatorio (hasta 60 caracteres)' };

  const clave = claveDesdeEtiqueta(typeof b.clave === 'string' && b.clave.trim() ? b.clave : etiqueta);
  if (!clave) return { ok: false, error: 'El nombre tiene que incluir letras o números' };

  const opciones = normalizarOpciones(b.opciones);
  if (opciones === null) return { ok: false, error: `Hasta ${OPCIONES_MAX} opciones` };
  if (b.tipo === 'opcion' && opciones.length === 0) return { ok: false, error: 'Agregá al menos una opción' };

  return {
    ok: true,
    value: {
      entidad: b.entidad,
      clave,
      etiqueta,
      tipo: b.tipo,
      opciones: b.tipo === 'opcion' ? opciones : [],
      mostrar_en_tarjeta: b.entidad === 'lead' && b.mostrar_en_tarjeta === true,
    },
  };
}

export type CampoDefinicionPatch = Partial<Pick<CampoDefinicion, 'etiqueta' | 'opciones' | 'orden' | 'mostrar_en_tarjeta'>>;

/** La clave y el tipo no cambian: los valores guardados dependen de ellos. */
export function parseCampoDefinicionPatch(body: unknown, actual: CampoDefinicion): Parsed<CampoDefinicionPatch> {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const patch: CampoDefinicionPatch = {};

  if (b.etiqueta !== undefined) {
    const etiqueta = String(b.etiqueta ?? '').trim();
    if (!etiqueta || etiqueta.length > 60) return { ok: false, error: 'El nombre del campo es obligatorio (hasta 60 caracteres)' };
    patch.etiqueta = etiqueta;
  }
  if (b.opciones !== undefined && actual.tipo === 'opcion') {
    const opciones = normalizarOpciones(b.opciones);
    if (opciones === null) return { ok: false, error: `Hasta ${OPCIONES_MAX} opciones` };
    if (opciones.length === 0) return { ok: false, error: 'Agregá al menos una opción' };
    patch.opciones = opciones;
  }
  if (b.orden !== undefined) {
    const orden = Number(b.orden);
    if (!Number.isInteger(orden)) return { ok: false, error: 'Orden inválido' };
    patch.orden = orden;
  }
  if (b.mostrar_en_tarjeta !== undefined) {
    patch.mostrar_en_tarjeta = actual.entidad === 'lead' && b.mostrar_en_tarjeta === true;
  }
  return { ok: true, value: patch };
}

function parseNumero(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const text = String(raw ?? '').trim().replace(/\s/g, '');
  if (!text) return null;
  const normalized = /,\d{1,2}$/.test(text) ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseFecha(raw: unknown): string | null {
  const text = String(raw ?? '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [y, m, d] = text.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? text : null;
}

function parseSiNo(raw: unknown): boolean | null {
  if (typeof raw === 'boolean') return raw;
  const text = String(raw ?? '').trim().toLowerCase();
  if (['si', 'sí', 'true', '1'].includes(text)) return true;
  if (['no', 'false', '0'].includes(text)) return false;
  return null;
}

function vacio(raw: unknown): boolean {
  return raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '');
}

/**
 * Aplica `input` sobre los valores actuales. Solo se aceptan claves definidas;
 * vacío borra el valor. Valores de campos ya borrados se conservan.
 */
export function aplicarValoresCampos(
  definiciones: CampoDefinicion[],
  actuales: unknown,
  input: unknown
): Parsed<CamposValores> {
  const base: CamposValores = actuales && typeof actuales === 'object' && !Array.isArray(actuales)
    ? { ...(actuales as CamposValores) }
    : {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Formato de campos inválido' };
  }

  const porClave = new Map(definiciones.map((d) => [d.clave, d]));
  for (const [clave, raw] of Object.entries(input as Record<string, unknown>)) {
    const def = porClave.get(clave);
    if (!def) continue;
    if (vacio(raw)) {
      delete base[clave];
      continue;
    }

    switch (def.tipo) {
      case 'texto': {
        const text = String(raw).trim();
        if (text.length > TEXTO_MAX) return { ok: false, error: `${def.etiqueta}: hasta ${TEXTO_MAX} caracteres` };
        base[clave] = text;
        break;
      }
      case 'numero': {
        const n = parseNumero(raw);
        if (n === null) return { ok: false, error: `${def.etiqueta}: tiene que ser un número` };
        base[clave] = n;
        break;
      }
      case 'fecha': {
        const fecha = parseFecha(raw);
        if (!fecha) return { ok: false, error: `${def.etiqueta}: fecha inválida` };
        base[clave] = fecha;
        break;
      }
      case 'opcion': {
        const text = String(raw).trim();
        const opcion = def.opciones.find((o) => o.toLowerCase() === text.toLowerCase());
        if (!opcion) return { ok: false, error: `${def.etiqueta}: opción no válida` };
        base[clave] = opcion;
        break;
      }
      case 'si_no': {
        const b = parseSiNo(raw);
        if (b === null) return { ok: false, error: `${def.etiqueta}: tiene que ser Sí o No` };
        base[clave] = b;
        break;
      }
    }
  }
  return { ok: true, value: base };
}

export function formatearValorCampo(def: Pick<CampoDefinicion, 'tipo'>, valor: unknown): string | null {
  if (vacio(valor)) return null;
  switch (def.tipo) {
    case 'si_no':
      return valor === true ? 'Sí' : valor === false ? 'No' : null;
    case 'numero': {
      const n = typeof valor === 'number' ? valor : parseNumero(valor);
      return n === null ? null : new Intl.NumberFormat('es-AR').format(n);
    }
    case 'fecha': {
      const fecha = parseFecha(valor);
      if (!fecha) return null;
      const [y, m, d] = fecha.split('-');
      return `${d}/${m}/${y}`;
    }
    default:
      return String(valor);
  }
}

/** Valores para mostrar en la tarjeta del Kanban, en el orden de las definiciones. */
export function camposParaTarjeta(
  definiciones: CampoDefinicion[],
  valores: unknown
): Array<{ clave: string; etiqueta: string; texto: string }> {
  const v = (valores && typeof valores === 'object' ? valores : {}) as Record<string, unknown>;
  return definiciones
    .filter((d) => d.mostrar_en_tarjeta)
    .sort((a, b) => a.orden - b.orden)
    .flatMap((d) => {
      const texto = formatearValorCampo(d, v[d.clave]);
      return texto ? [{ clave: d.clave, etiqueta: d.etiqueta, texto }] : [];
    });
}
