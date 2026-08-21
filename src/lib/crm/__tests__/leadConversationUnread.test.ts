import { describe, expect, it } from 'vitest';
import { attachLeadConversationMeta } from '../leadConversationUnread';

describe('attachLeadConversationMeta', () => {
  it('adjunta unread_count y conversacion_id por lead_id', () => {
    const leads = [{ id: 'lead-1', contacto_id: null, estado_id: 'col-a' }];
    const conversaciones = [
      { id: 'conv-1', lead_id: 'lead-1', contacto_id: null, unread_count: 3, fecha_mensaje: '2026-08-21T10:00:00Z' },
    ];

    const [result] = attachLeadConversationMeta(leads, conversaciones);

    expect(result.conversacion_id).toBe('conv-1');
    expect(result.unread_count).toBe(3);
    expect(result.estado_id).toBe('col-a');
  });

  it('adjunta unread por contacto_id si no hay match por lead_id', () => {
    const leads = [{ id: 'lead-1', contacto_id: 'c-1', estado_id: 'col-a' }];
    const conversaciones = [
      { id: 'conv-2', lead_id: null, contacto_id: 'c-1', unread_count: 2, fecha_mensaje: '2026-08-21T10:00:00Z' },
    ];

    const [result] = attachLeadConversationMeta(leads, conversaciones);

    expect(result.conversacion_id).toBe('conv-2');
    expect(result.unread_count).toBe(2);
  });

  it('prioriza la conversación vinculada por lead_id sobre contacto_id', () => {
    const leads = [{ id: 'lead-1', contacto_id: 'c-1', estado_id: 'col-a' }];
    const conversaciones = [
      { id: 'conv-contacto', lead_id: null, contacto_id: 'c-1', unread_count: 9, fecha_mensaje: '2026-08-21T12:00:00Z' },
      { id: 'conv-lead', lead_id: 'lead-1', contacto_id: 'c-1', unread_count: 1, fecha_mensaje: '2026-08-21T08:00:00Z' },
    ];

    const [result] = attachLeadConversationMeta(leads, conversaciones);

    expect(result.conversacion_id).toBe('conv-lead');
    expect(result.unread_count).toBe(1);
  });

  it('no muta estado_id aunque haya unread', () => {
    const leads = [{ id: 'lead-1', contacto_id: 'c-1', estado_id: 'nuevo' }];
    const conversaciones = [
      { id: 'conv-1', lead_id: 'lead-1', contacto_id: 'c-1', unread_count: 5, fecha_mensaje: '2026-08-21T10:00:00Z' },
    ];

    const [result] = attachLeadConversationMeta(leads, conversaciones);

    expect(result.estado_id).toBe('nuevo');
    expect(result).not.toHaveProperty('estado_id', undefined);
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
