import { describe, expect, it } from 'vitest';
import { ETAPAS_POR_DEFECTO, elegirEstadoInicial } from '../estadosLeadDb';

describe('elegirEstadoInicial', () => {
  it('prefiere la etapa llamada Nuevo', () => {
    expect(
      elegirEstadoInicial([
        { id: 'a', nombre: 'Contactado', is_default: true },
        { id: 'b', nombre: ' nuevo ', is_default: false },
      ])
    ).toBe('b');
  });

  it('si no hay Nuevo usa la marcada por defecto y si no la primera', () => {
    expect(
      elegirEstadoInicial([
        { id: 'a', nombre: 'Entrada', is_default: false },
        { id: 'b', nombre: 'Prospecto', is_default: true },
      ])
    ).toBe('b');
    expect(elegirEstadoInicial([{ id: 'a', nombre: 'Entrada', is_default: false }])).toBe('a');
    expect(elegirEstadoInicial([])).toBeNull();
  });

  it('las etapas por defecto empiezan en Nuevo y terminan en Ganado/Perdido', () => {
    expect(ETAPAS_POR_DEFECTO.map((e) => e.nombre)).toEqual([
      'Nuevo',
      'Contactado',
      'Calificado',
      'Propuesta',
      'Ganado',
      'Perdido',
    ]);
    expect(elegirEstadoInicial(ETAPAS_POR_DEFECTO.map((e, i) => ({ ...e, id: String(i) })))).toBe('0');
  });
});
