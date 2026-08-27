import type { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import {
  PACING_GAP_MIN_MS,
  PACING_GAP_SPAN_MS,
} from '@/app/servicios/messaging/whatsapp/modules/sendPacing';

export type OutboxStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'scheduled' | 'cancelled';
export type OutboxFailureKind = 'transient' | 'permanent';

export interface EnqueueWhatsAppOutboxInput {
  usuario_id: string;
  conversacion_id?: string | null;
  to_jid: string;
  message_type?: string;
  contenido?: string;
  file_url?: string | null;
  mimetype?: string | null;
  file_name?: string | null;
  metadata?: Record<string, unknown>;
  /** Si es futuro, el worker espera hasta esa fecha. */
  sendAt?: Date | string | null;
}

export interface WhatsAppOutboxRow {
  id: string;
  usuario_id: string;
  conversacion_id: string | null;
  to_jid: string;
  message_type: string;
  contenido: string;
  file_url: string | null;
  mimetype: string | null;
  file_name: string | null;
  status: OutboxStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  wa_message_id: string | null;
  metadata: Record<string, unknown>;
}

const MAX_BACKOFF_MS = 15 * 60_000;

/** `min(30s * 2^attempts, 15min)` + jitter 0–20%. */
export function outboxBackoffMs(attempts: number, random: () => number = Math.random): number {
  const base = Math.min(30_000 * 2 ** Math.max(attempts, 0), MAX_BACKOFF_MS);
  return Math.round(base + base * 0.2 * random());
}

export function classifyOutboxFailure(error: string): OutboxFailureKind {
  const e = error.toLowerCase();
  if (e.includes('jid') && (e.includes('inválid') || e.includes('invalid'))) {
    return 'permanent';
  }
  return 'transient';
}

export function nextOutboxStatus(opts: {
  attempts: number;
  maxAttempts: number;
  kind: OutboxFailureKind;
}): 'queued' | 'failed' {
  if (opts.kind === 'permanent') return 'failed';
  if (opts.attempts >= opts.maxAttempts) return 'failed';
  return 'queued';
}

function outboxTable(supabase: SupabaseClient) {
  return supabase.from('whatsapp_outbox' as never);
}

export async function enqueueWhatsAppOutbox(
  supabase: SupabaseClient,
  input: EnqueueWhatsAppOutboxInput
): Promise<{ id: string }> {
  const sendAtMs = input.sendAt ? new Date(input.sendAt).getTime() : NaN;
  const isScheduled = Number.isFinite(sendAtMs) && sendAtMs > Date.now() + 1000;

  let nextAttemptAt: string;
  if (isScheduled) {
    nextAttemptAt = new Date(sendAtMs).toISOString();
  } else {
    const staggerGapMs = PACING_GAP_MIN_MS + Math.floor(Math.random() * PACING_GAP_SPAN_MS);
    const { data: tailRow } = await outboxTable(supabase)
      .select('next_attempt_at')
      .eq('usuario_id', input.usuario_id)
      .in('status', ['queued', 'sending'])
      .order('next_attempt_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const tailAt = tailRow
      ? new Date(String((tailRow as { next_attempt_at?: string }).next_attempt_at || 0)).getTime()
      : 0;
    nextAttemptAt = new Date(Math.max(Date.now(), tailAt + staggerGapMs)).toISOString();
  }

  const metadata = {
    ...(input.metadata || {}),
    ...(isScheduled ? { scheduled_by_user: true, scheduled_for: nextAttemptAt } : {}),
  };

  const { data, error } = await outboxTable(supabase)
    .insert({
      usuario_id: input.usuario_id,
      conversacion_id: input.conversacion_id || null,
      to_jid: input.to_jid,
      message_type: input.message_type || 'text',
      contenido: input.contenido || '',
      file_url: input.file_url || null,
      mimetype: input.mimetype || null,
      file_name: input.file_name || null,
      status: 'queued',
      next_attempt_at: nextAttemptAt,
      metadata,
    } as never)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo encolar el mensaje WhatsApp');
  }
  return { id: (data as { id: string }).id };
}

export async function claimWhatsAppOutbox(
  supabase: SupabaseClient
): Promise<WhatsAppOutboxRow | null> {
  const { data, error } = await supabase.rpc('claim_whatsapp_outbox' as never);
  if (error) {
    console.error('❌ claim_whatsapp_outbox:', error.message);
    return null;
  }
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return (rows[0] as WhatsAppOutboxRow) || null;
}

/** Mensajes programados no crean fila en inbox al encolar; se persiste al enviarse. */
export async function persistScheduledOutboxToInbox(
  supabase: SupabaseClient,
  row: WhatsAppOutboxRow,
  waMessageId?: string
): Promise<void> {
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  if (meta.scheduled_by_user !== true) return;
  if (typeof meta.inbox_message_id === 'string') return;
  if (!row.conversacion_id) return;

  const messageId = uuidv4();
  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from('mensajes_conversacion').insert({
    id: messageId,
    conversacion_id: row.conversacion_id,
    tipo: row.message_type || 'texto',
    contenido: row.contenido,
    remitente: row.to_jid,
    fecha_mensaje: now,
    canal: 'whatsapp',
    metadata: {
      ...meta,
      direction: 'outgoing',
      estado_envio: 'enviado',
      outbox_id: row.id,
    },
    usuario_id: row.usuario_id || null,
    estado_envio: 'enviado',
    ...(waMessageId ? { wa_message_id: waMessageId } : {}),
  });
  if (insertError) {
    console.warn('⚠️ No se pudo guardar mensaje programado en inbox:', insertError.message);
    return;
  }

  await supabase
    .from('conversaciones')
    .update({ fecha_mensaje: now })
    .eq('id', row.conversacion_id);

  if (row.usuario_id) {
    const { notifyInboxRealtime } = await import('@/lib/chat/notifyInbox');
    await notifyInboxRealtime(row.usuario_id, {
      conversacionId: row.conversacion_id,
      platform: 'whatsapp',
      preview: String(row.contenido || '').slice(0, 120),
      direction: 'outgoing',
    });
  }
}

async function patchInboxFromOutbox(
  supabase: SupabaseClient,
  row: WhatsAppOutboxRow,
  estado: 'enviado' | 'error',
  extras: { waMessageId?: string; errorText?: string } = {}
) {
  const inboxId = typeof row.metadata?.inbox_message_id === 'string'
    ? row.metadata.inbox_message_id
    : null;
  if (!inboxId) return;

  const { data: current } = await supabase
    .from('mensajes_conversacion')
    .select('metadata')
    .eq('id', inboxId)
    .maybeSingle();

  const metadata = {
    ...(current?.metadata && typeof current.metadata === 'object' ? current.metadata : {}),
    outbox_id: row.id,
    estado_envio: estado,
    ...(extras.errorText ? { error_envio: extras.errorText } : {}),
  };
  const patch: Record<string, unknown> = { metadata, estado_envio: estado };
  if (extras.waMessageId) patch.wa_message_id = extras.waMessageId;

  const { error } = await supabase
    .from('mensajes_conversacion')
    .update(patch)
    .eq('id', inboxId);
  if (error) {
    console.warn('⚠️ No se pudo actualizar el inbox desde outbox:', error.message);
  }
}

export async function completeOutboxSend(
  supabase: SupabaseClient,
  row: WhatsAppOutboxRow,
  result: { success: boolean; waMessageId?: string; error?: string }
): Promise<OutboxStatus> {
  if (result.success) {
    await outboxTable(supabase)
      .update({
        status: 'sent',
        wa_message_id: result.waMessageId || null,
        last_error: null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', row.id);
    await patchInboxFromOutbox(supabase, row, 'enviado', { waMessageId: result.waMessageId });
    await persistScheduledOutboxToInbox(supabase, row, result.waMessageId);
    return 'sent';
  }

  const kind = classifyOutboxFailure(result.error || 'error');
  const status = nextOutboxStatus({
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    kind,
  });
  const nextAttempt = status === 'queued'
    ? new Date(Date.now() + outboxBackoffMs(row.attempts)).toISOString()
    : new Date().toISOString();

  await outboxTable(supabase)
    .update({
      status,
      last_error: result.error || 'No se pudo enviar',
      next_attempt_at: nextAttempt,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', row.id);

  if (status === 'failed') {
    await patchInboxFromOutbox(supabase, row, 'error', { errorText: result.error });
  }
  return status;
}

/** Devuelve el claim a queued sin marcar failed (rate limit / pacing). */
export async function deferOutboxSend(
  supabase: SupabaseClient,
  row: WhatsAppOutboxRow,
  delayMs: number
): Promise<void> {
  const attempts = Math.max((row.attempts || 1) - 1, 0);
  await outboxTable(supabase)
    .update({
      status: 'queued',
      attempts,
      next_attempt_at: new Date(Date.now() + delayMs).toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', row.id);
}

export type OutboxSendFn = (
  row: WhatsAppOutboxRow
) => Promise<{ success: boolean; waMessageId?: string; error?: string }>;

export type OutboxPacer = {
  decide: (userId: string) => { action: 'send' | 'defer'; delayMs: number };
  recordSent: (userId: string) => void;
  sleep?: (ms: number) => Promise<void>;
};

export async function processOutboxBatch(
  supabase: SupabaseClient,
  send: OutboxSendFn,
  limit = 10,
  pacer?: OutboxPacer
): Promise<{ processed: number; sent: number }> {
  let processed = 0;
  let sent = 0;
  const sleep = pacer?.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  for (let i = 0; i < limit; i++) {
    const row = await claimWhatsAppOutbox(supabase);
    if (!row) break;
    processed += 1;

    if (pacer) {
      const decision = pacer.decide(row.usuario_id);
      if (decision.action === 'defer') {
        console.log(`⏳ pacing defer ${(decision.delayMs / 1000).toFixed(1)}s user=${row.usuario_id}`);
        await deferOutboxSend(supabase, row, decision.delayMs);
        continue;
      }
      if (decision.delayMs > 0) {
        console.log(`⏳ pacing ${(decision.delayMs / 1000).toFixed(1)}s`);
        await sleep(decision.delayMs);
      }
    }

    const result = await send(row);
    const status = await completeOutboxSend(supabase, row, result);
    if (status === 'sent') {
      sent += 1;
      pacer?.recordSent(row.usuario_id);
    }
  }
  return { processed, sent };
}
