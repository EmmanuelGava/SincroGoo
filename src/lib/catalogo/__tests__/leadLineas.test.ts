import { describe, expect, it } from 'vitest';
import {
  countsFromLeadLineas,
  lineasFromCatalogoIds,
  mergeLeadLineas,
  parseLeadLineasInput,
  preferStockCounts,
} from '../leadLineas';

describe('countsFromLeadLineas', () => {
  it('suma cantidades del mismo producto y ignora líneas sin catálogo', () => {
    const counts = countsFromLeadLineas([
      { catalogo_id: 'a', cantidad: 2 },
      { catalogo_id: 'a', cantidad: 1 },
      { catalogo_id: 'b', cantidad: 4 },
      { catalogo_id: null, cantidad: 9 },
      { catalogo_id: 'c', cantidad: 0 },
    ]);
    expect(counts?.get('a')).toBe(3);
    expect(counts?.get('b')).toBe(4);
    expect(counts?.has('c')).toBe(false);
    expect(counts?.size).toBe(2);
  });

  it('devuelve null si no hay líneas útiles para stock', () => {
    expect(countsFromLeadLineas([])).toBeNull();
    expect(countsFromLeadLineas([{ catalogo_id: null, cantidad: 2 }])).toBeNull();
  });
});

describe('preferStockCounts', () => {
  it('reserva y descuenta desde las líneas, no desde el texto del mensaje', () => {
    const fromLineas = countsFromLeadLineas([{ catalogo_id: 'real', cantidad: 2 }]);
    const fromMensajes = new Map([['texto-viejo', 1]]);
    const chosen = preferStockCounts(fromLineas, fromMensajes);
    expect([...chosen.keys()]).toEqual(['real']);
    expect(chosen.get('real')).toBe(2);
  });

  it('si no hay líneas, usa el conteo inferido de los mensajes', () => {
    const fromMensajes = new Map([['cat-1', 3]]);
    expect(preferStockCounts(null, fromMensajes)).toBe(fromMensajes);
    expect(preferStockCounts(new Map(), fromMensajes)).toBe(fromMensajes);
  });
});

describe('lineasFromCatalogoIds', () => {
  it('arma el snapshot de nombre y precio y junta ids repetidos del carrito', () => {
    const lineas = lineasFromCatalogoIds(
      ['p1', 'p1', 'p2', 'fuera'],
      [
        { id: 'p1', nombre: 'Remera', precio: 15000 },
        { id: 'p2', nombre: 'Gorra', precio: null },
      ],
    );
    expect(lineas).toEqual([
      { catalogo_id: 'p1', cantidad: 2, precio: 15000, nombre: 'Remera' },
      { catalogo_id: 'p2', cantidad: 1, precio: null, nombre: 'Gorra' },
    ]);
  });
});

describe('parseLeadLineasInput', () => {
  it('fusiona el mismo producto y rechaza cantidad inválida', () => {
    const ok = parseLeadLineasInput([
      { catalogo_id: '11111111-1111-4111-8111-111111111111', cantidad: 1, precio: 10, nombre: 'A' },
      { catalogo_id: '11111111-1111-4111-8111-111111111111', cantidad: 2, precio: 10, nombre: 'A' },
    ]);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.lineas[0].cantidad).toBe(3);

    const bad = parseLeadLineasInput([{ nombre: 'A', cantidad: 1.5, precio: 1 }]);
    expect(bad.ok).toBe(false);
  });
});

describe('mergeLeadLineas', () => {
  it('deja separadas las líneas sin producto de catálogo', () => {
    const merged = mergeLeadLineas([
      { catalogo_id: null, cantidad: 1, precio: 5, nombre: 'A mano' },
      { catalogo_id: null, cantidad: 1, precio: 8, nombre: 'Otro' },
    ]);
    expect(merged).toHaveLength(2);
  });
});
