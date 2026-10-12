import { describe, expect, it } from 'vitest';
import {
  isMlQuestionAnswerable,
  mlContactName,
  mlRemitente,
  parseMlQuestionNotification,
  parseMlRemitente,
  pickPendingMlQuestion,
} from '../notification';
import { looksLikePhoneNumber } from '@/lib/chat/conversationIdentity';

describe('parseMlQuestionNotification', () => {
  const base = {
    _id: 'abc',
    resource: '/questions/5036111111',
    user_id: 123456789,
    topic: 'questions',
    application_id: 2069392825111111,
    attempts: 1,
  };

  it('extrae pregunta, vendedor y app', () => {
    expect(parseMlQuestionNotification(base)).toEqual({
      questionId: '5036111111',
      sellerId: '123456789',
      applicationId: '2069392825111111',
    });
  });

  it('ignora otros tópicos y recursos raros', () => {
    expect(parseMlQuestionNotification({ ...base, topic: 'orders_v2' })).toBeNull();
    expect(parseMlQuestionNotification({ ...base, resource: '/questions/abc' })).toBeNull();
    expect(parseMlQuestionNotification({ ...base, resource: '/questions/1/../../users/me' })).toBeNull();
    expect(parseMlQuestionNotification(null)).toBeNull();
  });
});

describe('remitente', () => {
  it('ida y vuelta comprador + publicación, y no parece teléfono', () => {
    const r = mlRemitente('98765', 'MLA1234567890');
    expect(parseMlRemitente(r)).toEqual({ buyerId: '98765', itemId: 'MLA1234567890' });
    expect(looksLikePhoneNumber(r)).toBe(false);
    expect(parseMlRemitente('ig_123')).toBeNull();
  });

  it('nombre de contacto con apodo y publicación', () => {
    expect(mlContactName('COMPRADOR22', 'Zapatillas Running')).toBe('COMPRADOR22 · Zapatillas Running');
    expect(mlContactName(null, 'Zapatillas Running')).toBe('Zapatillas Running');
    expect(mlContactName(null, null)).toBeUndefined();
  });
});

describe('pickPendingMlQuestion', () => {
  it('elige la pregunta sin responder más vieja', () => {
    const mensajes = [
      { fecha_mensaje: '2026-10-12T10:05:00Z', metadata: { ml_question_id: '3' } },
      { fecha_mensaje: '2026-10-12T10:00:00Z', metadata: { ml_question_id: '1', ml_answered: true } },
      { fecha_mensaje: '2026-10-12T10:02:00Z', metadata: { ml_question_id: '2' } },
      { fecha_mensaje: '2026-10-12T09:00:00Z', metadata: null },
    ];
    expect(pickPendingMlQuestion(mensajes)?.metadata?.ml_question_id).toBe('2');
  });

  it('null si todas están respondidas', () => {
    expect(
      pickPendingMlQuestion([{ fecha_mensaje: '2026-10-12T10:00:00Z', metadata: { ml_question_id: '1', ml_answered: true } }])
    ).toBeNull();
  });

  it('solo UNANSWERED se puede responder', () => {
    expect(isMlQuestionAnswerable('UNANSWERED')).toBe(true);
    expect(isMlQuestionAnswerable('ANSWERED')).toBe(false);
    expect(isMlQuestionAnswerable('CLOSED_UNANSWERED')).toBe(false);
  });
});
