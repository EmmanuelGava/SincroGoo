import { describe, expect, it } from 'vitest';
import {
  conversationChatDisplayName,
  conversationDisplayName,
  conversationGreetingName,
  preferredConversationRemitente,
  isUsablePersonName,
} from '../conversationIdentity';

describe('preferredConversationRemitente', () => {
  it('prioriza LID sobre teléfono', () => {
    expect(
      preferredConversationRemitente({
        remoteJid: '174423034343447@lid',
        phoneNumber: '5491158765720',
        remitente: '5491158765720',
      })
    ).toBe('174423034343447');
  });

  it('usa teléfono si no hay LID', () => {
    expect(
      preferredConversationRemitente({
        remoteJid: '5491158765720@s.whatsapp.net',
        phoneNumber: '5491158765720',
        remitente: 'x',
      })
    ).toBe('5491158765720');
  });
});

describe('conversationGreetingName', () => {
  it('usa el nombre de persona, no el teléfono', () => {
    expect(
      conversationGreetingName({
        remitente: '5491158765720',
        display_name: '+54 9 1158 765720',
        metadata: { contact_name: 'Ilonna Bisonte', phone_number: '5491158765720' },
      })
    ).toBe('Ilonna Bisonte');
  });

  it('si solo hay número, el saludo queda vacío', () => {
    expect(
      conversationGreetingName({
        remitente: '5491158765720',
        display_name: '+54 9 1158 765720',
        metadata: { phone_number: '5491158765720' },
      })
    ).toBe('');
  });
});

describe('isUsablePersonName', () => {
  it('rechaza teléfonos y acepta nombres', () => {
    expect(isUsablePersonName('Ilonna Bisonte')).toBe(true);
    expect(isUsablePersonName('5491158765720')).toBe(false);
    expect(isUsablePersonName('+54 9 1158 765720')).toBe(false);
  });
});

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
