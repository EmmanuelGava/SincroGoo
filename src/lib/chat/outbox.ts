import type { SupabaseClient } from '@supabase/supabase-js';

export type OutboxStatus = 'queued' | 'sending' | 'sent' | 'failed';
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
      metadata: input.metadata || {},
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
  const patch: Record<string, unknown> = { metadata };
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

export type OutboxSendFn = (
  row: WhatsAppOutboxRow
) => Promise<{ success: boolean; waMessageId?: string; error?: string }>;

export async function processOutboxBatch(
  supabase: SupabaseClient,
  send: OutboxSendFn,
  limit = 10
): Promise<{ processed: number; sent: number }> {
  let processed = 0;
  let sent = 0;
  for (let i = 0; i < limit; i++) {
    const row = await claimWhatsAppOutbox(supabase);
    if (!row) break;
    processed += 1;
    const result = await send(row);
    const status = await completeOutboxSend(supabase, row, result);
    if (status === 'sent') sent += 1;
  }
  return { processed, sent };
}
