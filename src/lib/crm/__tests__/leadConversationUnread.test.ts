import { describe, expect, it } from 'vitest';
import { attachLeadConversationMeta, pickUltimoMensaje } from '../leadConversationUnread';

describe('pickUltimoMensaje', () => {
  it('arma varias líneas del hilo en orden cronológico', () => {
    const preview = pickUltimoMensaje([
      { contenido: 'Hola, quiero precios de vapers', fecha_mensaje: '2026-08-21T08:00:00Z' },
      { contenido: 'Te paso la lista', fecha_mensaje: '2026-08-21T09:00:00Z' },
      { contenido: '3', fecha_mensaje: '2026-08-21T10:00:00Z' },
      { contenido: 'muy viejo', fecha_mensaje: '2026-08-20T08:00:00Z' },
    ]);
    expect(preview.contenido).toBe(
      ['Hola, quiero precios de vapers', 'Te paso la lista', '3'].join('\n')
    );
    expect(preview.fecha_mensaje).toBe('2026-08-21T10:00:00Z');
  });

  it('recorta el bloque si es muy largo', () => {
    const preview = pickUltimoMensaje([
      { contenido: 'a'.repeat(100), fecha_mensaje: '2026-08-21T08:00:00Z' },
      { contenido: 'b'.repeat(100), fecha_mensaje: '2026-08-21T09:00:00Z' },
      { contenido: 'c'.repeat(100), fecha_mensaje: '2026-08-21T10:00:00Z' },
    ]);
    expect(preview.contenido?.length).toBeLessThanOrEqual(241);
    expect(preview.contenido?.endsWith('…')).toBe(true);
  });

  it('devuelve null si no hay mensajes', () => {
    expect(pickUltimoMensaje([])).toEqual({ contenido: null, fecha_mensaje: null });
  });
});

describe('attachLeadConversationMeta', () => {
  it('adjunta unread_count, conversacion_id y ultimo_mensaje por lead_id', () => {
    const leads = [{ id: 'lead-1', contacto_id: null, estado_id: 'col-a' }];
    const conversaciones = [
      {
        id: 'conv-1',
        lead_id: 'lead-1',
        contacto_id: null,
        unread_count: 3,
        fecha_mensaje: '2026-08-21T10:00:00Z',
        ultimo_mensaje: 'Hola, quiero un presupuesto',
      },
    ];

    const [result] = attachLeadConversationMeta(leads, conversaciones);

    expect(result.conversacion_id).toBe('conv-1');
    expect(result.unread_count).toBe(3);
    expect(result.ultimo_mensaje).toBe('Hola, quiero un presupuesto');
    expect(result.fecha_ultimo_mensaje).toBe('2026-08-21T10:00:00Z');
    expect(result.estado_id).toBe('col-a');
  });

  it('adjunta unread por contacto_id si no hay match por lead_id', () => {
    const leads = [{ id: 'lead-1', contacto_id: 'c-1', estado_id: 'col-a' }];
    const conversaciones = [
      { id: 'conv-2', lead_id: null, contacto_id: 'c-1', unread_count: 2, fecha_mensaje: '2026-08-21T10:00:00Z', ultimo_mensaje: 'ok' },
    ];

    const [result] = attachLeadConversationMeta(leads, conversaciones);

    expect(result.conversacion_id).toBe('conv-2');
    expect(result.unread_count).toBe(2);
    expect(result.ultimo_mensaje).toBe('ok');
  });

  it('prioriza la conversación vinculada por lead_id sobre contacto_id', () => {
    const leads = [{ id: 'lead-1', contacto_id: 'c-1', estado_id: 'col-a' }];
    const conversaciones = [
      { id: 'conv-contacto', lead_id: null, contacto_id: 'c-1', unread_count: 9, fecha_mensaje: '2026-08-21T12:00:00Z', ultimo_mensaje: 'contacto' },
      { id: 'conv-lead', lead_id: 'lead-1', contacto_id: 'c-1', unread_count: 1, fecha_mensaje: '2026-08-21T08:00:00Z', ultimo_mensaje: 'lead' },
    ];

    const [result] = attachLeadConversationMeta(leads, conversaciones);

    expect(result.conversacion_id).toBe('conv-lead');
    expect(result.unread_count).toBe(1);
    expect(result.ultimo_mensaje).toBe('lead');
  });

  it('no muta estado_id aunque haya unread', () => {
    const leads = [{ id: 'lead-1', contacto_id: 'c-1', estado_id: 'nuevo' }];
    const conversaciones = [
      { id: 'conv-1', lead_id: 'lead-1', contacto_id: 'c-1', unread_count: 5, fecha_mensaje: '2026-08-21T10:00:00Z' },
    ];

    const [result] = attachLeadConversationMeta(leads, conversaciones);

    expect(result.estado_id).toBe('nuevo');
    expect(result.ultimo_mensaje).toBeNull();
  });

  it('unread_count nulo o ausente queda en 0', () => {
    const leads = [{ id: 'lead-1', contacto_id: null, estado_id: 'col-a' }];
    const conversaciones = [
      { id: 'conv-1', lead_id: 'lead-1', contacto_id: null, unread_count: null, fecha_mensaje: '2026-08-21T10:00:00Z' },
    ];

    const [result] = attachLeadConversationMeta(leads, conversaciones);

    expect(result.unread_count).toBe(0);
  });
});
