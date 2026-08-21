import { describe, expect, it } from 'vitest';
import { conversationChatDisplayName, conversationDisplayName } from '../conversationIdentity';

describe('conversationChatDisplayName', () => {
  it('usa contactos.nombre por encima de contact_name de metadata', () => {
    expect(
      conversationChatDisplayName({
        remitente: '5491112345678',
        contactos: { nombre: 'Juan Pérez' },
        metadata: { contact_name: 'Juan de WhatsApp' },
      })
    ).toBe('Juan Pérez');
  });

  it('cae a contact_name de metadata si no hay nombre de contacto', () => {
    expect(
      conversationChatDisplayName({
        remitente: '5491112345678',
        contactos: null,
        metadata: { contact_name: 'Juan de WhatsApp' },
      })
    ).toBe('Juan de WhatsApp');
  });
});

describe('conversationDisplayName', () => {
  it('usa display_name si viene seteado (lista/header del chat)', () => {
    expect(
      conversationDisplayName({
        remitente: '5491112345678',
        display_name: 'Juan Pérez',
        metadata: { contact_name: 'Juan de WhatsApp' },
      })
    ).toBe('Juan Pérez');
  });
});
