import { describe, expect, it } from 'vitest';
import { isEstadoTerminal } from '../estadoLead';
import { decideIncomingContactLink } from '../matchContacto';

describe('isEstadoTerminal', () => {
  it('Ganado y Perdido son terminales', () => {
    expect(isEstadoTerminal('Ganado')).toBe(true);
    expect(isEstadoTerminal('perdido')).toBe(true);
    expect(isEstadoTerminal('Nuevo')).toBe(false);
  });
});

describe('decideIncomingContactLink', () => {
  it('respeta contacto ya vinculado', () => {
    expect(decideIncomingContactLink({
      existingContactoId: 'c1',
      telefonoDigits: '5491112345678',
    })).toEqual({ action: 'keep', contactoId: 'c1' });
  });

  it('busca si hay teléfono y no hay contacto', () => {
    expect(decideIncomingContactLink({
      existingContactoId: null,
      telefonoDigits: '5491112345678',
    })).toEqual({ action: 'lookup', telefonoDigits: '5491112345678' });
  });

  it('no crea si no hay teléfono', () => {
    expect(decideIncomingContactLink({ existingContactoId: null, telefonoDigits: null }))
      .toEqual({ action: 'skip' });
  });
});
