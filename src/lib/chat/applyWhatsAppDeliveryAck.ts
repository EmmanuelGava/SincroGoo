import { getSupabaseAdmin } from '@/lib/supabase/client';
import { canAdvanceDeliveryStatus, mapBaileysAckToEstado } from '@/lib/chat/messageDeliveryStatus';

export async function applyWhatsAppDeliveryAck(opts: {
  waMessageId: string;
  status: number;
  userId?: string;
}): Promise<{ updated: boolean; estado?: string }> {
  const next = mapBaileysAckToEstado(opts.status);
  if (!next) return { updated: false };

  const supabase = getSupabaseAdmin();
  const { data: row } = await supabase
    .from('mensajes_conversacion')
    .select('id, conversacion_id, metadata, estado_envio')
    .eq('wa_message_id', opts.waMessageId)
    .maybeSingle();

  if (!row) return { updated: false };

  const metadata = (row.metadata && typeof row.metadata === 'object'
    ? row.metadata
    : {}) as Record<string, unknown>;
  const current = String(row.estado_envio || metadata.estado_envio || 'enviando');
  if (!canAdvanceDeliveryStatus(current, next)) {
    return { updated: false, estado: current };
  }

  const { error } = await supabase
    .from('mensajes_conversacion')
    .update({
      estado_envio: next,
      metadata: { ...metadata, estado_envio: next },
    })
    .eq('id', row.id);

  if (error) {
    console.warn('⚠️ No se pudo actualizar estado_envio:', error.message);
    return { updated: false };
  }

  if (opts.userId) {
    const { notifyInboxRealtime } = await import('@/lib/chat/notifyInbox');
    await notifyInboxRealtime(opts.userId, {
      conversacionId: row.conversacion_id,
      platform: 'whatsapp',
      direction: 'outgoing',
    });
  }

  return { updated: true, estado: next };
}
