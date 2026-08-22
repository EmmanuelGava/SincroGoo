import { describe, expect, it } from 'vitest';
import {
  draftFromUploadedFile,
  draftsFromCatalogCsv,
  inferCatalogTipo,
  parseCatalogPrecioCell,
} from '../importCatalogo';

describe('parseCatalogPrecioCell', () => {
  it('entiende miles argentinos y número simple', () => {
    expect(parseCatalogPrecioCell('$26.000')).toBe(26000);
    expect(parseCatalogPrecioCell('26000')).toBe(26000);
    expect(parseCatalogPrecioCell('90,5')).toBe(90.5);
  });
});

describe('inferCatalogTipo', () => {
  it('mapea sinónimos', () => {
    expect(inferCatalogTipo('Presupuesto')).toBe('presupuesto');
    expect(inferCatalogTipo('cotizacion')).toBe('propuesta');
    expect(inferCatalogTipo('SKU')).toBe('producto');
  });
});

describe('draftsFromCatalogCsv', () => {
  it('importa varias filas de una planilla', () => {
    const csv = [
      'tipo,nombre,precio,descripcion',
      'producto,Colchoneta,26000,Espuma 2 cm',
      'presupuesto,Obra Norte,180000,Instalación',
    ].join('\n');
    const drafts = draftsFromCatalogCsv(csv);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({ tipo: 'producto', nombre: 'Colchoneta', precio: 26000, stock: 0, categoria: null });
    expect(drafts[1]).toMatchObject({ tipo: 'presupuesto', nombre: 'Obra Norte', precio: 180000 });
  });

  it('lee columnas opcionales categoria y stock', () => {
    const csv = [
      'tipo,nombre,precio,categoria,stock',
      'producto,Mango,12000,Vapers,5',
      'producto,Uva,12000,vapers,',
    ].join('\n');
    const drafts = draftsFromCatalogCsv(csv);
    expect(drafts[0]).toMatchObject({ nombre: 'Mango', categoria: 'vapers', stock: 5 });
    expect(drafts[1]).toMatchObject({ nombre: 'Uva', categoria: 'vapers', stock: 0 });
  });
});

describe('draftFromUploadedFile', () => {
  it('una foto vira producto con imagen', () => {
    expect(draftFromUploadedFile('colchoneta.jpg', 'https://x/a.jpg', 'image/jpeg', 'producto')).toEqual({
      tipo: 'producto',
      nombre: 'colchoneta',
      precio: null,
      descripcion: null,
      imagen_url: 'https://x/a.jpg',
      archivo_url: null,
      categoria: null,
      stock: 0,
    });
  });

  it('un PDF de presupuesto usa el tipo del nombre', () => {
    const draft = draftFromUploadedFile('presupuesto_obra.pdf', 'https://x/a.pdf', 'application/pdf', 'producto');
    expect(draft.tipo).toBe('presupuesto');
    expect(draft.archivo_url).toBe('https://x/a.pdf');
    expect(draft.imagen_url).toBeNull();
    expect(draft.stock).toBe(0);
  });
});
