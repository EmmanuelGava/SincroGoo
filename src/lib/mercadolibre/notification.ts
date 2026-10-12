export type MlQuestionNotification = {
  questionId: string;
  sellerId: string;
  applicationId: string;
};

/** Devuelve la notificación si es del tópico de preguntas; si no, null. */
export function parseMlQuestionNotification(body: unknown): MlQuestionNotification | null {
  const n = (body && typeof body === 'object' ? body : {}) as {
    topic?: string;
    resource?: string;
    user_id?: number | string;
    application_id?: number | string;
  };
  if (n.topic !== 'questions') return null;
  const match = /^\/questions\/(\d+)$/.exec(String(n.resource || '').trim());
  const sellerId = String(n.user_id ?? '');
  const applicationId = String(n.application_id ?? '');
  if (!match || !/^\d+$/.test(sellerId) || !applicationId) return null;
  return { questionId: match[1], sellerId, applicationId };
}

export function mlRemitente(buyerId: string, itemId: string): string {
  return `ml_${buyerId}_${itemId}`;
}

export function parseMlRemitente(remitente: string | null | undefined): { buyerId: string; itemId: string } | null {
  const match = /^ml_(\d+)_([A-Z]{3}\d+)$/.exec(String(remitente || ''));
  return match ? { buyerId: match[1], itemId: match[2] } : null;
}

export const mlQuestionMessageId = (questionId: string) => `ml_q_${questionId}`;
export const mlAnswerMessageId = (questionId: string) => `ml_a_${questionId}`;

export const ML_ANSWER_MAX = 2000;

export function mlContactName(nickname: string | null, itemTitle: string | null): string | undefined {
  const parts = [nickname, itemTitle].map((p) => String(p || '').trim()).filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

export type MlQuestionMessage = {
  fecha_mensaje: string;
  metadata?: { ml_question_id?: string | number; ml_answered?: boolean } | null;
};

/** La pregunta sin responder más vieja de la conversación (las respuestas van en orden). */
export function pickPendingMlQuestion<T extends MlQuestionMessage>(mensajes: T[]): T | null {
  const pendientes = mensajes
    .filter((m) => m.metadata?.ml_question_id && !m.metadata?.ml_answered)
    .sort((a, b) => new Date(a.fecha_mensaje).getTime() - new Date(b.fecha_mensaje).getTime());
  return pendientes[0] || null;
}

/** Estados de ML en los que la pregunta todavía se puede responder. */
export function isMlQuestionAnswerable(status: string | null | undefined): boolean {
  return status === 'UNANSWERED';
}
