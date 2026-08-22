import { describe, expect, it } from 'vitest';
import { armarListaCategoria } from '../armarListaCategoria';

describe('armarListaCategoria', () => {
  const items = [
    { nombre: 'Mango', precio: 12000, categoria: 'vapers', stock: 5 },
    { nombre: 'Uva', precio: 12000, categoria: 'vapers', stock: 2 },
    { nombre: 'Menta', precio: 11500, categoria: 'vapers', stock: 0 },
    { nombre: 'Colchoneta', precio: 26000, categoria: 'colchonetas', stock: 3 },
  ];

  it('arma lista solo con stock > 0 de la categoría', () => {
    expect(armarListaCategoria(items, 'vapers')).toBe(
      ['Vapers en stock:', '', '• Mango — $12.000', '• Uva — $12.000'].join('\n')
    );
  });

  it('es case-insensitive y no incluye total', () => {
    const texto = armarListaCategoria(items, 'VAPERS');
    expect(texto).toContain('Vapers en stock:');
    expect(texto).not.toMatch(/total/i);
    expect(texto).not.toContain('Menta');
  });

  it('devuelve vacío si no hay ítems con stock', () => {
    expect(armarListaCategoria(items, 'inexistente')).toBe('');
    expect(armarListaCategoria([{ nombre: 'X', precio: 1, categoria: 'a', stock: 0 }], 'a')).toBe('');
  });
});
