import { describe, expect, it } from 'vitest';
import { attachLeadConversationMeta, pickUltimoMensaje } from '../leadConversationUnread';

describe('pickUltimoMensaje', () => {
  it('elige el más reciente y recorta textos largos', () => {
    const preview = pickUltimoMensaje([
      { contenido: 'viejo', fecha_mensaje: '2026-08-21T08:00:00Z' },
      { contenido: 'a'.repeat(150), fecha_mensaje: '2026-08-21T12:00:00Z' },
    ]);
    expect(preview.contenido).toHaveLength(121);
    expect(preview.contenido?.endsWith('…')).toBe(true);
    expect(preview.fecha_mensaje).toBe('2026-08-21T12:00:00Z');
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
