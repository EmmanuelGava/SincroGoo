import { describe, expect, it } from 'vitest';
import {
  decideImportRow,
  draftsFromCsv,
  peopleToDraft,
} from '../importContactos';

describe('draftsFromCsv', () => {
  it('lee nombre, telefono, email y empresa', () => {
    const drafts = draftsFromCsv('nombre,telefono,email,empresa\nJuan,+54 9 11 1234-5678,juan@a.com,Acme');
    expect(drafts).toEqual([{
      nombre: 'Juan',
      telefono: '+54 9 11 1234-5678',
      email: 'juan@a.com',
      empresa: 'Acme',
    }]);
  });

  it('acepta headers en inglés y delimitador ;', () => {
    const drafts = draftsFromCsv('name;phone;mail\nAna;1144445555;ana@x.com');
    expect(drafts[0]).toMatchObject({
      nombre: 'Ana',
      telefono: '1144445555',
      email: 'ana@x.com',
    });
  });
});

describe('decideImportRow', () => {
  it('crea si no hay match', () => {
    const decision = decideImportRow(
      { nombre: 'Juan', telefono: '5491112345678', email: null, empresa: null },
      new Map(),
      new Map()
    );
    expect(decision.action).toBe('create');
  });

  it('actualiza por teléfono normalizado', () => {
    const decision = decideImportRow(
      { nombre: 'Juan', telefono: '+54 9 11 1234-5678', email: null, empresa: null },
      new Map([['5491112345678', 'c1']]),
      new Map()
    );
    expect(decision).toMatchObject({ action: 'update', id: 'c1' });
  });

  it('actualiza por email si no hay teléfono conocido', () => {
    const decision = decideImportRow(
      { nombre: 'Ana', telefono: null, email: 'ANA@x.com', empresa: null },
      new Map(),
      new Map([['ana@x.com', 'c2']])
    );
    expect(decision).toMatchObject({ action: 'update', id: 'c2' });
  });

  it('salta filas vacías', () => {
    const decision = decideImportRow(
      { nombre: '', telefono: null, email: null, empresa: null },
      new Map(),
      new Map()
    );
    expect(decision.action).toBe('skip');
  });
});

describe('peopleToDraft', () => {
  it('mapea un contacto de Google', () => {
    expect(peopleToDraft({
      names: [{ displayName: 'Luis Pérez' }],
      phoneNumbers: [{ value: '+54 11 5555-0000' }],
      emailAddresses: [{ value: 'luis@x.com' }],
      organizations: [{ name: 'Klo' }],
    })).toEqual({
      nombre: 'Luis Pérez',
      telefono: '+54 11 5555-0000',
      email: 'luis@x.com',
      empresa: 'Klo',
    });
  });
});
