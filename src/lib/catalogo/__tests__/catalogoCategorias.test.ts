import { describe, expect, it } from 'vitest';
import {
  filterCategoriasSlash,
  nombreDesdeSlug,
  normalizeCategoriaSlug,
  type CategoriaCatalogo,
} from '@/lib/catalogo/catalogoCategorias';

describe('normalizeCategoriaSlug', () => {
  it('quita acentos en vez de borrar la letra', () => {
    expect(normalizeCategoriaSlug('Categoría')).toBe('categoria');
    expect(normalizeCategoriaSlug('Ñandú')).toBe('nandu');
  });

  it('convierte espacios en guiones y colapsa repetidos', () => {
    expect(normalizeCategoriaSlug('  Vapers  de   fruta ')).toBe('vapers-de-fruta');
    expect(normalizeCategoriaSlug('a - b')).toBe('a-b');
  });

  it('cumple el check de la tabla (solo a-z, 0-9, guion y guion bajo)', () => {
    const slug = normalizeCategoriaSlug('Ropa & Calzado (2026)!');
    expect(slug).toMatch(/^[a-z0-9_-]+$/);
    expect(slug).toBe('ropa-calzado-2026');
  });

  it('devuelve null si no queda nada', () => {
    expect(normalizeCategoriaSlug('')).toBeNull();
    expect(normalizeCategoriaSlug('!!!')).toBeNull();
    expect(normalizeCategoriaSlug(null)).toBeNull();
  });
});

describe('nombreDesdeSlug', () => {
  it('arma un nombre legible', () => {
    expect(nombreDesdeSlug('vapers-de-fruta')).toBe('Vapers de fruta');
    expect(nombreDesdeSlug('ropa_nina')).toBe('Ropa nina');
  });
});

describe('filterCategoriasSlash', () => {
  const cats: CategoriaCatalogo[] = [
    { id: '1', slug: 'vapers', nombre: 'Vapers', incluir_sin_stock_en_lista: false, orden: 0 },
    { id: '2', slug: 'colchonetas', nombre: 'Colchonetas', incluir_sin_stock_en_lista: true, orden: 1 },
  ];

  it('filtra por prefijo de slug o por nombre', () => {
    expect(filterCategoriasSlash(cats, 'vap').map((c) => c.slug)).toEqual(['vapers']);
    expect(filterCategoriasSlash(cats, 'chon').map((c) => c.slug)).toEqual(['colchonetas']);
    expect(filterCategoriasSlash(cats, '')).toHaveLength(2);
  });
});
