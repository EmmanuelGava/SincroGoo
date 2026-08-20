import { describe, expect, it } from 'vitest';
import {
  leadFormEmail,
  leadFormPhone,
  isLikelyInternalWhatsAppId,
  conversationNeedsPhoneResolution,
} from '../conversationIdentity';

describe('lead contact fields', () => {
  it('oculta emails placeholder de KloSync', () => {
    expect(leadFormEmail('wa.6e22fdf2baaf48f183b2@klosync.local')).toBe('');
    expect(leadFormEmail('persona@gmail.com')).toBe('persona@gmail.com');
  });

  it('oculta LID de WhatsApp como teléfono', () => {
    expect(isLikelyInternalWhatsAppId('205613590122651')).toBe(true);
    expect(leadFormPhone('205613590122651')).toBe('');
    expect(leadFormPhone('5491127072997')).toBe('5491127072997');
  });

  it('detecta chats LID sin teléfono real', () => {
    expect(
      conversationNeedsPhoneResolution({
        remitente: '205613590122651',
        metadata: { remote_jid: '205613590122651@lid', contact_name: 'Emma' },
      })
    ).toBe(true);
    expect(
      conversationNeedsPhoneResolution({
        remitente: '5491127072997',
        metadata: { remote_jid: '5491127072997@s.whatsapp.net', phone_number: '5491127072997' },
      })
    ).toBe(false);
  });
});
