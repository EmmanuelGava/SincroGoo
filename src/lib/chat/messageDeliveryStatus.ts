export type DeliveryEstado = 'enviando' | 'enviado' | 'entregado' | 'leido' | 'error';

const DELIVERY_RANK: Record<string, number> = {
  enviando: 0,
  pendiente: 0,
  enviado: 1,
  entregado: 2,
  leido: 3,
  error: 99,
};

export function mapBaileysAckToEstado(
  status: number | undefined | null
): Exclude<DeliveryEstado, 'enviando'> | null {
  switch (status) {
    case 0:
      return 'error';
    case 2:
      return 'enviado';
    case 3:
      return 'entregado';
    case 4:
    case 5:
      return 'leido';
    default:
      return null;
  }
}

export function canAdvanceDeliveryStatus(
  current: string | null | undefined,
  next: string
): boolean {
  const from = DELIVERY_RANK[current || 'enviando'] ?? 0;
  const to = DELIVERY_RANK[next] ?? 0;
  if (from >= 99) return false;
  if (next === 'error') return from < 2;
  return to > from;
}

export function resolveDisplayEstado(
  estado: string | undefined,
  messageId?: string
): string {
  if (String(messageId || '').startsWith('temp-')) {
    return estado && estado !== 'enviado' ? estado : 'enviando';
  }
  return estado || 'enviado';
}

export async function applyWhatsAppDeliveryAck(opts: {
  waMessageId: string;
  status: number;
  userId?: string;
}): Promise<{ updated: boolean; estado?: string }> {
  const next = mapBaileysAckToEstado(opts.status);
  if (!next) return { updated: false };

  const { getSupabaseAdmin } = await import('@/lib/supabase/client');
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
