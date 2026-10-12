import type { SupabaseClient } from '@supabase/supabase-js';
import { handleIncomingMessage } from '@/lib/chat/handleIncomingMessage';
import { getMlItem, getMlNickname, getMlQuestion, type MlQuestion } from './api';
import { ensureFreshMlToken, getMlConnectionBySeller } from './connection';
import {
  mlAnswerMessageId,
  mlContactName,
  mlQuestionMessageId,
  mlRemitente,
  type MlQuestionNotification,
} from './notification';

const HIDDEN_STATUSES = new Set(['DELETED', 'BANNED', 'UNDER_REVIEW', 'DISABLED']);

async function authIdFor(supabase: SupabaseClient, usuarioId: string): Promise<string | null> {
  const { data } = await supabase.from('usuarios').select('auth_id').eq('id', usuarioId).maybeSingle();
  return data?.auth_id ? String(data.auth_id) : null;
}

export async function markMlQuestionAnswered(supabase: SupabaseClient, questionId: string): Promise<void> {
  const { data } = await supabase
    .from('mensajes_conversacion')
    .select('id, metadata')
    .eq('wa_message_id', mlQuestionMessageId(questionId))
    .maybeSingle();
  if (!data?.id) return;
  const metadata = (data.metadata && typeof data.metadata === 'object' ? data.metadata : {}) as Record<string, unknown>;
  if (metadata.ml_answered === true) return;
  await supabase
    .from('mensajes_conversacion')
    .update({ metadata: { ...metadata, ml_answered: true } })
    .eq('id', data.id);
}

async function contactNameFor(
  supabase: SupabaseClient,
  token: string,
  question: MlQuestion
): Promise<{ name?: string; itemTitle: string | null; permalink: string | null }> {
  const { data: conv } = await supabase
    .from('conversaciones')
    .select('metadata')
    .eq('servicio_origen', 'mercadolibre')
    .eq('remitente', mlRemitente(question.buyerId, question.itemId))
    .limit(1)
    .maybeSingle();
  const meta = (conv?.metadata || {}) as Record<string, unknown>;
  if (typeof meta.contact_name === 'string' && meta.contact_name) {
    return { name: meta.contact_name, itemTitle: null, permalink: null };
  }

  const [item, nickname] = await Promise.all([
    getMlItem(token, question.itemId).catch(() => null),
    getMlNickname(question.buyerId),
  ]);
  return {
    name: mlContactName(nickname, item?.title || null),
    itemTitle: item?.title || null,
    permalink: item?.permalink || null,
  };
}

export async function processMlQuestionNotification(
  supabase: SupabaseClient,
  notification: MlQuestionNotification
): Promise<'saved' | 'duplicate' | 'skipped'> {
  const conn = await getMlConnectionBySeller(supabase, notification.sellerId);
  if (!conn) {
    console.warn('⚠️ Notificación de ML para un vendedor no conectado:', notification.sellerId);
    return 'skipped';
  }

  const token = await ensureFreshMlToken(supabase, conn);
  const question = await getMlQuestion(token, notification.questionId);
  if (question.sellerId !== conn.mlUserId || !question.buyerId || !question.itemId) return 'skipped';
  if (HIDDEN_STATUSES.has(question.status)) return 'skipped';

  const userId = (await authIdFor(supabase, conn.usuarioId)) || conn.usuarioId;
  const contact = await contactNameFor(supabase, token, question);
  const answered = Boolean(question.answer) || question.status !== 'UNANSWERED';
  const contactId = `${question.buyerId}_${question.itemId}`;

  const asked = await handleIncomingMessage({
    platform: 'mercadolibre',
    message: question.text,
    contact: { id: contactId, name: contact.name },
    timestamp: new Date(question.dateCreated),
    messageType: 'text',
    waMessageId: mlQuestionMessageId(question.id),
    metadata: {
      userId,
      source: 'mercadolibre-questions',
      ml_question_id: question.id,
      ml_item_id: question.itemId,
      ml_buyer_id: question.buyerId,
      ml_answered: answered,
      ...(contact.itemTitle ? { ml_item_title: contact.itemTitle } : {}),
      ...(contact.permalink ? { ml_item_permalink: contact.permalink } : {}),
    },
  });

  if (answered && asked?.duplicate) {
    await markMlQuestionAnswered(supabase, question.id);
  }

  if (question.answer) {
    await handleIncomingMessage({
      platform: 'mercadolibre',
      message: question.answer.text,
      contact: { id: contactId, name: contact.name },
      timestamp: new Date(question.answer.dateCreated),
      messageType: 'text',
      waMessageId: mlAnswerMessageId(question.id),
      metadata: {
        userId,
        fromMe: true,
        source: 'mercadolibre-questions',
        ml_question_id_answered: question.id,
      },
    });
  }

  return asked?.duplicate ? 'duplicate' : 'saved';
}
