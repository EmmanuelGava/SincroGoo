import { describe, expect, it } from 'vitest';
import {
  isEstadoPerdido,
  isMotivoPerdido,
  MOTIVOS_PERDIDO,
} from '../estadoLead';

describe('estadoLead perdido', () => {
  it('detecta columna Perdido sin importar mayúsculas', () => {
    expect(isEstadoPerdido('Perdido')).toBe(true);
    expect(isEstadoPerdido('GANADO')).toBe(false);
  });

  it('valida motivos permitidos', () => {
    for (const motivo of MOTIVOS_PERDIDO) {
      expect(isMotivoPerdido(motivo)).toBe(true);
    }
    expect(isMotivoPerdido('inventado')).toBe(false);
  });
});
