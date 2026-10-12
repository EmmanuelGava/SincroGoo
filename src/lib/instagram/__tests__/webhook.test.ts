import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import {
  igsidFromRemitente,
  instagramRemitente,
  parseInstagramWebhook,
  verifyInstagramSignature,
} from '../webhook';
import { isInstagramWindowOpen } from '../window';
import { createInstagramOAuthState, readInstagramOAuthState } from '../oauthState';
import { splitInstagramText } from '../api';
import { looksLikePhoneNumber, preferredConversationRemitente } from '@/lib/chat/conversationIdentity';

const BUSINESS = '17841400000000001';
const CUSTOMER = '987654321012345';

function payload(message: Record<string, unknown>, sender = CUSTOMER, recipient = BUSINESS) {
  return {
    object: 'instagram',
    entry: [
      {
        id: BUSINESS,
        time: 1760000000,
        messaging: [{ sender: { id: sender }, recipient: { id: recipient }, timestamp: 1760000000000, message }],
      },
    ],
  };
}

describe('verifyInstagramSignature', () => {
  const body = JSON.stringify({ hola: 'mundo' });
  const secret = 'app-secret';
  const good = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

  it('acepta la firma correcta', () => {
    expect(verifyInstagramSignature(body, good, secret)).toBe(true);
  });

  it('rechaza firma ajena, cuerpo alterado o header faltante', () => {
    expect(verifyInstagramSignature(body, good, 'otro-secret')).toBe(false);
    expect(verifyInstagramSignature(`${body} `, good, secret)).toBe(false);
    expect(verifyInstagramSignature(body, null, secret)).toBe(false);
    expect(verifyInstagramSignature(body, 'sha1=abc', secret)).toBe(false);
  });
});

describe('parseInstagramWebhook', () => {
  it('extrae un DM de texto entrante', () => {
    const [event] = parseInstagramWebhook(payload({ mid: 'm1', text: 'Hola, precio?' }));
    expect(event).toMatchObject({
      igAccountId: BUSINESS,
      customerId: CUSTOMER,
      mid: 'm1',
      text: 'Hola, precio?',
      isEcho: false,
    });
    expect(event.timestamp.getTime()).toBe(1760000000000);
  });

  it('marca ecos y toma como cliente al destinatario', () => {
    const [event] = parseInstagramWebhook(payload({ mid: 'm2', text: 'Te paso', is_echo: true }, BUSINESS, CUSTOMER));
    expect(event.isEcho).toBe(true);
    expect(event.customerId).toBe(CUSTOMER);
  });

  it('clasifica adjuntos', () => {
    const [event] = parseInstagramWebhook(
      payload({
        mid: 'm3',
        attachments: [
          { type: 'image', payload: { url: 'https://cdn/img.jpg' } },
          { type: 'story_mention', payload: { url: 'https://cdn/story' } },
        ],
      })
    );
    expect(event.attachments[0]).toMatchObject({ kind: 'image', url: 'https://cdn/img.jpg' });
    expect(event.attachments[1]).toMatchObject({ kind: null, placeholder: '[Te mencionó en una historia]' });
  });

  it('ignora borrados, no soportados, reacciones y otros objetos', () => {
    expect(parseInstagramWebhook(payload({ mid: 'm4', is_deleted: true }))).toEqual([]);
    expect(parseInstagramWebhook(payload({ mid: 'm5', is_unsupported: true }))).toEqual([]);
    expect(parseInstagramWebhook({ ...payload({ mid: 'm6' }), object: 'page' })).toEqual([]);
    expect(
      parseInstagramWebhook({
        object: 'instagram',
        entry: [{ id: BUSINESS, messaging: [{ sender: { id: CUSTOMER }, recipient: { id: BUSINESS }, reaction: {} }] }],
      })
    ).toEqual([]);
  });
});

describe('ventana de 24 h', () => {
  const now = new Date('2026-10-12T12:00:00Z');

  it('abierta dentro de 24 h, cerrada después o sin mensajes del cliente', () => {
    expect(isInstagramWindowOpen('2026-10-11T12:30:00Z', now)).toBe(true);
    expect(isInstagramWindowOpen('2026-10-11T11:59:00Z', now)).toBe(false);
    expect(isInstagramWindowOpen(null, now)).toBe(false);
  });
});

describe('remitente', () => {
  it('ida y vuelta del IGSID', () => {
    expect(igsidFromRemitente(instagramRemitente(CUSTOMER))).toBe(CUSTOMER);
    expect(igsidFromRemitente('5491122334455')).toBeNull();
  });
});

describe('splitInstagramText', () => {
  it('no corta textos cortos', () => {
    expect(splitInstagramText('Hola')).toEqual(['Hola']);
  });

  it('corta en saltos de línea sin pasar el máximo', () => {
    const linea = 'x'.repeat(30);
    const texto = Array.from({ length: 10 }, () => linea).join('\n');
    const partes = splitInstagramText(texto, 100);
    expect(partes.length).toBeGreaterThan(1);
    expect(partes.every((p) => p.length <= 100)).toBe(true);
    expect(partes.join('\n')).toBe(texto);
  });
});

describe('identidad de conversación', () => {
  it('un remitente de Instagram no se toma como teléfono', () => {
    expect(looksLikePhoneNumber('ig_123456789012345')).toBe(false);
    expect(preferredConversationRemitente({ remitente: 'ig_123456789012345' })).toBe('ig_123456789012345');
    expect(looksLikePhoneNumber('5491122334455')).toBe(true);
  });
});

describe('state del OAuth', () => {
  const secret = 's3cret';
  const data = { usuarioId: 'u1', organizacionId: 'o1' };

  it('valida su propia firma y respeta el vencimiento', () => {
    const now = 1_000_000_000_000;
    const state = createInstagramOAuthState(data, secret, now);
    expect(readInstagramOAuthState(state, secret, now + 1000)).toMatchObject(data);
    expect(readInstagramOAuthState(state, 'otro', now + 1000)).toBeNull();
    expect(readInstagramOAuthState(state, secret, now + 16 * 60 * 1000)).toBeNull();
  });

  it('rechaza un state manipulado', () => {
    const state = createInstagramOAuthState(data, secret);
    const [, signature] = state.split('.');
    const forged = Buffer.from(JSON.stringify({ ...data, organizacionId: 'o2', issuedAt: Date.now() })).toString('base64url');
    expect(readInstagramOAuthState(`${forged}.${signature}`, secret)).toBeNull();
  });
});
