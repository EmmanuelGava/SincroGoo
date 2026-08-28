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
    const { texto } = armarListaCategoria(items, 'vapers');
    expect(texto).toBe(
      ['Vapers en stock:', '', '• Mango — $12.000', '• Uva — $12.000'].join('\n'),
    );
  });

  it('es case-insensitive y no incluye total', () => {
    const { texto } = armarListaCategoria(items, 'VAPERS');
    expect(texto).toContain('Vapers en stock:');
    expect(texto).not.toMatch(/total/i);
    expect(texto).not.toContain('Menta');
  });

  it('devuelve vacío si no hay ítems con stock', () => {
    expect(armarListaCategoria(items, 'inexistente').texto).toBe('');
    expect(armarListaCategoria([{ nombre: 'X', precio: 1, categoria: 'a', stock: 0 }], 'a').texto).toBe(
      '',
    );
  });

  it('incluye sin stock cuando se pide', () => {
    const { texto } = armarListaCategoria(items, 'vapers', { incluirSinStock: true });
    expect(texto).toContain('(sin stock)');
    expect(texto).toContain('Menta');
    expect(texto).toContain('con y sin stock');
  });

  it('recolecta imágenes de los ítems', () => {
    const { imagenes } = armarListaCategoria(
      [
        {
          nombre: 'A',
          precio: 100,
          categoria: 'fotos',
          stock: 1,
          imagen_url: 'https://a.jpg',
          imagen_urls: ['https://a.jpg', 'https://b.jpg'],
        },
      ],
      'fotos',
    );
    expect(imagenes).toEqual(['https://a.jpg', 'https://b.jpg']);
  });
});
