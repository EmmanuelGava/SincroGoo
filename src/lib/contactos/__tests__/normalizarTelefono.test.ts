import { describe, expect, it } from 'vitest';
import { telefonoDigits } from '../normalizarTelefono';

describe('telefonoDigits', () => {
  it('deja 549… intacto y saca no-dígitos', () => {
    expect(telefonoDigits('+54 9 11 1234-5678')).toBe('5491112345678');
    expect(telefonoDigits('5491112345678')).toBe('5491112345678');
  });

  it('inserta el 9 si viene 54 + área sin 9', () => {
    expect(telefonoDigits('541112345678')).toBe('5491112345678');
  });

  it('devuelve null si no hay dígitos de teléfono', () => {
    expect(telefonoDigits('')).toBeNull();
    expect(telefonoDigits('1203634@lid')).toBeNull();
    expect(telefonoDigits(null)).toBeNull();
  });
});
