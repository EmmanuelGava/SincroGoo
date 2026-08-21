import { describe, expect, it } from 'vitest';
import {
  applyRespuestaTexto,
  DEFAULT_RESPUESTAS_RAPIDAS,
  draftNeedsCatalog,
  fillCatalogPlaceholders,
  filterRespuestasRapidas,
  insertRespuestaInDraft,
  missingDefaultRespuestas,
  normalizeAtajo,
  parseSlashDraft,
  validateRespuestaRapida,
} from '../respuestasRapidas';

const items = [
  { id: '1', atajo: 'hola', texto: 'Hola {{nombre}}' },
  { id: '2', atajo: 'gracias', texto: 'Gracias' },
  { id: '3', atajo: 'info', texto: 'Te paso info' },
];

describe('parseSlashDraft', () => {
  it('está activo si el mensaje empieza con /', () => {
    expect(parseSlashDraft('/')).toEqual({ active: true, query: '' });
    expect(parseSlashDraft('/hola')).toEqual({ active: true, query: 'hola' });
    expect(parseSlashDraft('/Hola')).toEqual({ active: true, query: 'hola' });
  });

  it('no está activo si hay texto antes o un espacio', () => {
    expect(parseSlashDraft('hola')).toEqual({ active: false, query: '' });
    expect(parseSlashDraft(' /hola')).toEqual({ active: false, query: '' });
    expect(parseSlashDraft('/hola mundo')).toEqual({ active: false, query: '' });
    expect(parseSlashDraft('')).toEqual({ active: false, query: '' });
  });
});

describe('filterRespuestasRapidas', () => {
  it('con query vacía devuelve todas, ordenadas por atajo', () => {
    expect(filterRespuestasRapidas(items, '').map((x) => x.atajo)).toEqual([
      'gracias',
      'hola',
      'info',
    ]);
  });

  it('filtra por prefijo del atajo', () => {
    expect(filterRespuestasRapidas(items, 'ho').map((x) => x.atajo)).toEqual(['hola']);
    expect(filterRespuestasRapidas(items, 'g')).toEqual([items[1]]);
  });
});

describe('applyRespuestaTexto', () => {
  it('reemplaza nombre y teléfono', () => {
    expect(
      applyRespuestaTexto('Hola {{nombre}}, te escribo al {{telefono}}', {
        nombre: 'Ana',
        telefono: '54911',
      })
    ).toBe('Hola Ana, te escribo al 54911');
  });

  it('si falta el nombre, deja el hueco vacío', () => {
    expect(applyRespuestaTexto('Hola {{nombre}}', { nombre: '', telefono: null })).toBe('Hola ');
  });

  it('si falta el producto, deja [producto] para completar', () => {
    expect(applyRespuestaTexto('Te paso {{producto}}', {})).toBe('Te paso [producto]');
    expect(applyRespuestaTexto('Te paso {{producto}}', { producto: 'Kit X' })).toBe('Te paso Kit X');
  });

  it('rellena {{precio}} o deja $____', () => {
    expect(applyRespuestaTexto('sale {{precio}}', { precio: '$12.500' })).toBe('sale $12.500');
    expect(applyRespuestaTexto('sale {{precio}}', {})).toBe('sale $____');
  });
});

describe('draftNeedsCatalog', () => {
  it('es true si queda {{producto}} o [producto]', () => {
    expect(draftNeedsCatalog('Hola [producto] sale {{precio}}')).toBe(true);
    expect(draftNeedsCatalog('Hola {{producto}}')).toBe(true);
    expect(draftNeedsCatalog('Hola Ana, ¿cómo estás?')).toBe(false);
  });
});

describe('fillCatalogPlaceholders', () => {
  it('pone nombre, precio y deja el resto', () => {
    expect(
      fillCatalogPlaceholders('Hola {{nombre}}, [producto] sale {{precio}}', {
        nombre: 'Ana',
        item: { nombre: 'Kit X', precio: 12500 },
      })
    ).toBe('Hola Ana, Kit X sale $12.500');
  });

  it('también reemplaza $____ de plantillas viejas', () => {
    expect(
      fillCatalogPlaceholders('el precio de [producto] es $____', {
        item: { nombre: 'Silla', precio: 90 },
      })
    ).toBe('el precio de Silla es $90');
  });
});

describe('insertRespuestaInDraft', () => {
  it('reemplaza el /atajo por el texto expandido', () => {
    expect(
      insertRespuestaInDraft('/hola', 'Hola {{nombre}}', { nombre: 'Ana', telefono: null })
    ).toBe('Hola Ana');
  });
});

describe('normalizeAtajo', () => {
  it('saca la barra, minúsculas y caracteres raros', () => {
    expect(normalizeAtajo('/Hola!')).toBe('hola');
    expect(normalizeAtajo('  Precio_1  ')).toBe('precio_1');
  });
});

describe('validateRespuestaRapida', () => {
  it('pide atajo de 2 a 32 y texto', () => {
    expect(validateRespuestaRapida({ atajo: 'h', texto: 'Hola' }).ok).toBe(false);
    expect(validateRespuestaRapida({ atajo: 'hola', texto: '  ' }).ok).toBe(false);
    expect(validateRespuestaRapida({ atajo: 'hola', texto: 'Hola' })).toEqual({
      ok: true,
      atajo: 'hola',
      texto: 'Hola',
    });
  });
});

describe('DEFAULT_RESPUESTAS_RAPIDAS', () => {
  it('trae atajos de saludo y de venta/producto', () => {
    expect(DEFAULT_RESPUESTAS_RAPIDAS.map((x) => x.atajo).sort()).toEqual([
      'cierre',
      'gracias',
      'hola',
      'info',
      'precio',
      'producto',
      'propuesta',
      'seguimiento',
    ]);
  });
});

describe('missingDefaultRespuestas', () => {
  it('solo agrega atajos que el usuario todavía no tiene', () => {
    expect(missingDefaultRespuestas(['hola', 'info', 'gracias']).map((x) => x.atajo).sort()).toEqual([
      'cierre',
      'precio',
      'producto',
      'propuesta',
      'seguimiento',
    ]);
    expect(missingDefaultRespuestas(DEFAULT_RESPUESTAS_RAPIDAS.map((x) => x.atajo))).toEqual([]);
  });
});
