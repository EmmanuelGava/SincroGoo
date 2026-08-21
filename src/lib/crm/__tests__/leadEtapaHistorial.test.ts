import { describe, expect, it } from 'vitest';
import { formatEtapaHistorialLine, shouldRecordEtapaChange } from '../leadEtapaHistorial';

describe('shouldRecordEtapaChange', () => {
  it('registra solo si la etapa cambió', () => {
    expect(shouldRecordEtapaChange('a', 'b')).toBe(true);
    expect(shouldRecordEtapaChange('a', 'a')).toBe(false);
    expect(shouldRecordEtapaChange(null, 'b')).toBe(true);
    expect(shouldRecordEtapaChange('a', null)).toBe(false);
  });
});

describe('formatEtapaHistorialLine', () => {
  it('arma de → a con el nombre del lead', () => {
    expect(formatEtapaHistorialLine({
      fecha: '2026-08-21T12:00:00Z',
      estado_anterior_nombre: 'Nuevo',
      estado_nuevo_nombre: 'Contactado',
      lead_nombre: 'Juan',
    })).toBe('Juan: Nuevo → Contactado');
  });
});
