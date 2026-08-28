import { describe, expect, it } from 'vitest';
import {
  aplicarPlantillaCatalogo,
  armarTextoDesdeItemCatalogo,
  armarTextoPresupuestoCarrito,
  DEFAULT_PLANTILLA_PROPUESTA,
} from '@/lib/catalogo/catalogoPlantillas';

describe('catalogoPlantillas', () => {
  it('reemplaza variables en plantilla', () => {
    const out = aplicarPlantillaCatalogo('Hola {{cliente}}, total {{total}}', {
      cliente: 'Ana',
      total: '$100',
    });
    expect(out).toBe('Hola Ana, total $100');
  });

  it('arma propuesta desde ítem con plantilla default', () => {
    const texto = armarTextoDesdeItemCatalogo(
      {
        tipo: 'propuesta',
        nombre: 'Pack verano',
        precio: 50000,
        descripcion: 'Incluye todo',
        plantilla: null,
      },
      { cliente: 'Juan' },
    );
    expect(texto).toContain('Juan');
    expect(texto).toContain('Pack verano');
    expect(texto).toContain('Incluye todo');
  });

  it('arma presupuesto de carrito con plantilla custom', () => {
    const texto = armarTextoPresupuestoCarrito(
      [{ nombre: 'A', precio: 1000, descripcion: null }],
      { cliente: 'María' },
      'Para {{cliente}}:\n{{items}}\n{{total}}',
    );
    expect(texto).toContain('María');
    expect(texto).toContain('A');
    expect(texto).toMatch(/\$1\.000|1\.000/);
  });

  it('usa default propuesta cuando plantilla vacía', () => {
    expect(DEFAULT_PLANTILLA_PROPUESTA).toContain('{{cliente}}');
  });
});
