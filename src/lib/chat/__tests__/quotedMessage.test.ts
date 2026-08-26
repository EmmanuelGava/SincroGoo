import { describe, expect, it } from 'vitest';
import {
  buildBaileysQuotedStub,
  buildQuotedMeta,
  quotedPreviewLabel,
  truncateQuotedText,
} from '../quotedMessage';

describe('quotedMessage', () => {
  it('trunca texto largo', () => {
    expect(truncateQuotedText('a'.repeat(150), 120).endsWith('…')).toBe(true);
  });

  it('arma metadata de cita con wa_message_id', () => {
    const meta = buildQuotedMeta({
      id: '1',
      wa_message_id: 'ABC123',
      contenido: 'Hola cliente',
    }, '54911@s.whatsapp.net');
    expect(meta).toEqual({
      wa_message_id: 'ABC123',
      text: 'Hola cliente',
      from_me: false,
      participant: '54911@s.whatsapp.net',
    });
  });

  it('usa etiqueta amigable para placeholders de media', () => {
    expect(quotedPreviewLabel({ id: '1', contenido: '[Imagen]' })).toBe('Imagen');
  });

  it('construye stub Baileys mínimo', () => {
    const stub = buildBaileysQuotedStub('54911@s.whatsapp.net', {
      wa_message_id: 'XYZ',
      text: 'Original',
      from_me: false,
    });
    expect(stub.key.id).toBe('XYZ');
    expect(stub.message.conversation).toBe('Original');
  });
});
