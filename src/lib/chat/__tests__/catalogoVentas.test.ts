import { describe, expect, it } from 'vitest';
import { catalogAttachment, validateCatalogoItem } from '../catalogoVentas';

describe('validateCatalogoItem', () => {
  it('pide nombre', () => {
    expect(validateCatalogoItem({ nombre: 'A' }).ok).toBe(false);
    expect(validateCatalogoItem({ nombre: 'Kit X', precio: '12500' })).toMatchObject({
      ok: true,
      fields: { nombre: 'Kit X', precio: 12500, tipo: 'producto' },
    });
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
