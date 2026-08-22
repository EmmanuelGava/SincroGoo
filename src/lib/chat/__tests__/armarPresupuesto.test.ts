import { describe, expect, it } from 'vitest';
import { armarPresupuesto, primeraImagenCarrito } from '../armarPresupuesto';

describe('armarPresupuesto', () => {
  it('genera líneas y total', () => {
    const result = armarPresupuesto([
      { nombre: 'Remera', precio: 10000, descripcion: 'Algodón' },
      { nombre: 'Pantalón', precio: 15000, descripcion: null },
    ]);
    expect(result.total).toBe(25000);
    expect(result.texto).toContain('Remera');
    expect(result.texto).toContain('Pantalón');
    expect(result.texto).toContain('Total:');
  });

  it('devuelve vacío sin líneas', () => {
    expect(armarPresupuesto([])).toEqual({ texto: '', total: 0 });
  });
});

describe('primeraImagenCarrito', () => {
  it('toma la primera imagen disponible', () => {
    expect(
      primeraImagenCarrito([
        { imagen_url: null },
        { imagen_url: 'https://x/a.jpg' },
        { imagen_url: 'https://x/b.jpg' },
      ])
    ).toBe('https://x/a.jpg');
    expect(primeraImagenCarrito([{ imagen_url: null }])).toBeNull();
  });
});
