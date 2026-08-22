import { describe, expect, it } from 'vitest';
import { catalogAttachment, validateCatalogoItem } from '../catalogoVentas';

describe('validateCatalogoItem', () => {
  it('pide nombre', () => {
    expect(validateCatalogoItem({ nombre: 'A' }).ok).toBe(false);
    expect(validateCatalogoItem({ nombre: 'Kit X', precio: '12500' })).toMatchObject({
      ok: true,
      fields: { nombre: 'Kit X', precio: 12500, tipo: 'producto', stock: 0, categoria: null },
    });
  });

  it('normaliza categoría y stock', () => {
    expect(validateCatalogoItem({ nombre: 'Mango', categoria: '  Vapers ', stock: '5' })).toMatchObject({
      ok: true,
      fields: { categoria: 'vapers', stock: 5 },
    });
    expect(validateCatalogoItem({ nombre: 'Mango', stock: '' })).toMatchObject({
      ok: true,
      fields: { stock: 0 },
    });
    expect(validateCatalogoItem({ nombre: 'Mango', stock: -1 }).ok).toBe(false);
  });
});

describe('catalogAttachment', () => {
  it('prioriza imagen sobre PDF', () => {
    expect(
      catalogAttachment({
        nombre: 'Kit',
        imagen_url: 'https://x/a.jpg',
        archivo_url: 'https://x/a.pdf',
      })
    ).toEqual({ url: 'https://x/a.jpg', fileName: 'Kit', fileType: 'image' });
    expect(catalogAttachment({ nombre: 'Kit', imagen_url: null, archivo_url: null })).toBeNull();
  });
});
