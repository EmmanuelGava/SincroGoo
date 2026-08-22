import { describe, expect, it } from 'vitest';
import { contactoWriteFields, isUniquePhoneViolation } from '../contactoWrite';

describe('isUniquePhoneViolation', () => {
  it('detecta unique violation de Postgres', () => {
    expect(isUniquePhoneViolation({ code: '23505' })).toBe(true);
    expect(isUniquePhoneViolation({ code: '23503' })).toBe(false);
    expect(isUniquePhoneViolation(null)).toBe(false);
  });
});

describe('contactoWriteFields', () => {
  it('exige nombre en alta', () => {
    expect(contactoWriteFields({}, { requireNombre: true, partial: false }))
      .toEqual({ error: 'El nombre es requerido' });
  });

  it('normaliza telefono_digits en alta', () => {
    const result = contactoWriteFields(
      { nombre: 'María', telefono: '+54 9 11 1234-5678', email: '' },
      { requireNombre: true, partial: false }
    );
    expect(result).toEqual({
      fields: {
        nombre: 'María',
        telefono: '+54 9 11 1234-5678',
        telefono_digits: '5491112345678',
        email: null,
        empresa: null,
        notas: null,
        wa_jid: null,
      },
    });
  });

  it('en PATCH parcial no toca teléfono si no viene', () => {
    const result = contactoWriteFields(
      { notas: 'hola' },
      { requireNombre: false, partial: true }
    );
    expect(result).toEqual({
      fields: { notas: 'hola' },
    });
  });

  it('en PATCH recalcula dígitos si cambia el teléfono', () => {
    const result = contactoWriteFields(
      { telefono: '541112345678' },
      { requireNombre: false, partial: true }
    );
    expect(result).toEqual({
      fields: {
        telefono: '541112345678',
        telefono_digits: '5491112345678',
      },
    });
  });

  it('normaliza etiquetas en PATCH', () => {
    const result = contactoWriteFields(
      { etiquetas: [' Mayorista ', 'MAYORISTA', 'vip', ''] },
      { requireNombre: false, partial: true }
    );
    expect(result).toEqual({
      fields: { etiquetas: ['mayorista', 'vip'] },
    });
  });
});
