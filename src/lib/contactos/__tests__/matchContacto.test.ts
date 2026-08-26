import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isEstadoTerminal } from '../estadoLead';
import {
  decideIncomingContactLink,
  decideKanbanIncomingAction,
  findOpenLead,
  upsertContactoPorTelefono,
} from '../matchContacto';

type ContactoRow = {
  id: string;
  usuario_id: string;
  nombre: string;
  telefono: string | null;
  telefono_digits?: string | null;
  wa_jid?: string | null;
};

function fakeContactos(rows: ContactoRow[], opts?: { failNextInsert?: boolean }) {
  const db = {
    rows,
    insertCalls: 0,
    failNextInsert: opts?.failNextInsert ?? false,
  };

  const client = {
    from() {
      return {
        select() {
          const filters: Record<string, string> = {};
          const builder = {
            eq(col: string, val: string) {
              filters[col] = val;
              return builder;
            },
            maybeSingle: async () => {
              const found = db.rows.find((r) =>
                Object.entries(filters).every(([k, v]) => (r as Record<string, unknown>)[k] === v)
              );
              return { data: found ? { id: found.id } : null, error: null };
            },
          };
          return builder;
        },
        insert(payload: Partial<ContactoRow>) {
          return {
            select() {
              return {
                single: async () => {
                  db.insertCalls += 1;
                  if (db.failNextInsert) {
                    db.failNextInsert = false;
                    db.rows.push({
                      id: 'raced',
                      usuario_id: payload.usuario_id!,
                      nombre: 'Otra',
                      telefono: payload.telefono ?? null,
                      telefono_digits: payload.telefono_digits ?? null,
                      wa_jid: payload.wa_jid ?? null,
                    });
                    return { data: null, error: { code: '23505' } };
                  }
                  if (payload.telefono_digits) {
                    const dup = db.rows.find(
                      (r) =>
                        r.usuario_id === payload.usuario_id
                        && r.telefono_digits === payload.telefono_digits
                    );
                    if (dup) return { data: null, error: { code: '23505' } };
                  }
                  const id = `c${db.rows.length + 1}`;
                  db.rows.push({
                    id,
                    usuario_id: payload.usuario_id!,
                    nombre: payload.nombre!,
                    telefono: payload.telefono ?? null,
                    telefono_digits: payload.telefono_digits ?? null,
                    wa_jid: payload.wa_jid ?? null,
                  });
                  return { data: { id }, error: null };
                },
              };
            },
          };
        },
        update(payload: Partial<ContactoRow>) {
          return {
            eq(col: string, val: string) {
              const row = db.rows.find((r) => (r as Record<string, unknown>)[col] === val);
              if (row) Object.assign(row, payload);
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };

  return { client: client as unknown as SupabaseClient, db };
}

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

describe('findOpenLead', () => {
  it('elige el lead cuya etapa no es Ganado ni Perdido', () => {
    const open = findOpenLead([
      { id: 'l1', nombre: 'Cerrado', estado_id: 'e1', estados_lead: { nombre: 'Ganado' } },
      { id: 'l2', nombre: 'Activo', estado_id: 'e2', estados_lead: { nombre: 'Nuevo' } },
    ]);
    expect(open?.id).toBe('l2');
  });

  it('acepta estados_lead como array', () => {
    const open = findOpenLead([
      { id: 'l1', nombre: 'Activo', estado_id: 'e2', estados_lead: [{ nombre: 'En proceso' }] },
    ]);
    expect(open?.id).toBe('l1');
  });

  it('no encuentra abierto si todos son terminales', () => {
    expect(findOpenLead([
      { id: 'l1', nombre: 'X', estado_id: 'e1', estados_lead: { nombre: 'perdido' } },
    ])).toBeUndefined();
  });
});

describe('decideKanbanIncomingAction', () => {
  const openLead = { id: 'lead-1', nombre: 'María', estado_id: 'est-nuevo' };

  it('pide elección si hay lead abierto y no hay decisión del usuario', () => {
    expect(decideKanbanIncomingAction({
      contactoId: 'c1',
      openLead,
    })).toEqual({ action: 'needsChoice', openLead, contactoId: 'c1' });
  });

  it('reusa el lead si el usuario envía reuseLeadId', () => {
    expect(decideKanbanIncomingAction({
      contactoId: 'c1',
      openLead,
      reuseLeadId: 'lead-1',
    })).toEqual({ action: 'reuse', reuseLeadId: 'lead-1' });
  });

  it('crea uno nuevo si forceNewLead aunque haya abierto', () => {
    expect(decideKanbanIncomingAction({
      contactoId: 'c1',
      openLead,
      forceNewLead: true,
    })).toEqual({ action: 'create' });
  });

  it('crea si no hay lead abierto', () => {
    expect(decideKanbanIncomingAction({
      contactoId: 'c1',
      openLead: null,
    })).toEqual({ action: 'create' });
  });
});

describe('upsertContactoPorTelefono', () => {
  const input = {
    usuarioId: 'u1',
    nombre: 'María',
    telefonoDisplay: '+54 9 11 1234-5678',
    waJid: '5491112345678@s.whatsapp.net',
  };

  it('inserta si no existe el teléfono', async () => {
    const { client, db } = fakeContactos([]);
    const id = await upsertContactoPorTelefono(client, input);
    expect(id).toBe('c1');
    expect(db.insertCalls).toBe(1);
    expect(db.rows[0]).toMatchObject({
      usuario_id: 'u1',
      nombre: 'María',
      telefono_digits: '5491112345678',
    });
  });

  it('actualiza nombre si ya existe y no inserta de nuevo', async () => {
    const { client, db } = fakeContactos([{
      id: 'existente',
      usuario_id: 'u1',
      nombre: 'Viejo',
      telefono: '5491112345678',
      telefono_digits: '5491112345678',
    }]);
    const id = await upsertContactoPorTelefono(client, input);
    expect(id).toBe('existente');
    expect(db.insertCalls).toBe(0);
    expect(db.rows[0].nombre).toBe('María');
  });

  it('reintenta el select si el insert choca unique', async () => {
    const { client, db } = fakeContactos([], { failNextInsert: true });
    const id = await upsertContactoPorTelefono(client, input);
    expect(id).toBe('raced');
    expect(db.insertCalls).toBe(1);
    expect(db.rows[0].nombre).toBe('María');
  });

  it('reutiliza contacto existente por wa_jid si no hay teléfono', async () => {
    const { client, db } = fakeContactos([{
      id: 'lid-emma',
      usuario_id: 'u1',
      nombre: 'Emma',
      telefono: null,
      wa_jid: '205613590122651@lid',
    }]);
    const id = await upsertContactoPorTelefono(client, {
      usuarioId: 'u1',
      nombre: 'Emma',
      telefonoDisplay: null,
      waJid: '205613590122651@lid',
    });
    expect(id).toBe('lid-emma');
    expect(db.insertCalls).toBe(0);
    expect(db.rows).toHaveLength(1);
  });

  it('inserta sin unique si no hay dígitos de teléfono ni wa_jid', async () => {
    const { client, db } = fakeContactos([]);
    const id = await upsertContactoPorTelefono(client, {
      usuarioId: 'u1',
      nombre: 'Sin tel',
      telefonoDisplay: null,
    });
    expect(id).toBe('c1');
    expect(db.rows[0].telefono_digits == null || db.rows[0].telefono_digits === '').toBe(true);
  });
});
