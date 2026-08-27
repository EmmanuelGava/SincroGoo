import { describe, expect, it } from 'vitest';
import {
  countCatalogoIds,
  extractPresupuestoCatalogoIds,
  matchPresupuestoNombresToCatalogo,
  pickPresupuestoCatalogoIdsFromMensajes,
} from '../presupuestoCatalogo';

describe('extractPresupuestoCatalogoIds', () => {
  it('lee ids del metadata', () => {
    expect(
      extractPresupuestoCatalogoIds({ presupuesto_catalogo_ids: ['a', 'b', 'a'] }),
    ).toEqual(['a', 'b', 'a']);
  });
});

describe('countCatalogoIds', () => {
  it('agrupa cantidades', () => {
    const counts = countCatalogoIds(['x', 'y', 'x']);
    expect(counts.get('x')).toBe(2);
    expect(counts.get('y')).toBe(1);
  });
});

describe('matchPresupuestoNombresToCatalogo', () => {
  const catalogo = [
    { id: 'id-mango', nombre: 'Mango' },
    { id: 'id-uva', nombre: 'Uva' },
  ];

  it('matchea líneas de presupuesto por nombre', () => {
    const texto = [
      'Presupuesto:',
      '• Mango — $12.000',
      '• Uva — $12.000',
      '',
      'Total: $24.000',
    ].join('\n');
    expect(matchPresupuestoNombresToCatalogo(texto, catalogo)).toEqual(['id-mango', 'id-uva']);
  });

  it('ignora texto que no es presupuesto', () => {
    expect(matchPresupuestoNombresToCatalogo('Hola', catalogo)).toEqual([]);
  });
});

describe('pickPresupuestoCatalogoIdsFromMensajes', () => {
  it('prioriza el presupuesto saliente más reciente', () => {
    const ids = pickPresupuestoCatalogoIdsFromMensajes(
      [
        {
          contenido: 'Presupuesto:\n• Viejo — $1',
          metadata: { direction: 'outgoing' },
        },
        {
          contenido: 'ok',
          metadata: { direction: 'incoming' },
        },
        {
          contenido: 'Presupuesto:\n• Nuevo — $2',
          metadata: { direction: 'outgoing', presupuesto_catalogo_ids: ['cat-2'] },
        },
      ],
      [{ id: 'cat-1', nombre: 'Viejo' }, { id: 'cat-2', nombre: 'Nuevo' }],
    );
    expect(ids).toEqual(['cat-2']);
  });
});
