import { getSupabaseAdmin } from '@/lib/supabase/client';
import { inboxChannelName } from '@/lib/chat/inboxChannel';

export { inboxChannelName };

export type InboxBroadcastPayload = {
  conversacionId?: string;
  platform?: string;
  preview?: string;
  contactName?: string;
  direction?: 'incoming' | 'outgoing';
};

/**
 * Realtime de Supabase (Broadcast).
 * postgres_changes no sirve acá: el login es NextAuth, no hay JWT de Supabase,
 * y esas tablas tienen RLS sin policies → CHANNEL_ERROR.
 */
export async function notifyInboxRealtime(
  userId: string | undefined,
  payload: InboxBroadcastPayload
) {
  if (!userId) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.warn('⚠️ Realtime inbox: faltan SUPABASE_URL o SERVICE_ROLE_KEY');
    return;
  }

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            topic: inboxChannelName(userId),
            event: 'new_message',
            payload,
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('❌ Realtime broadcast falló:', response.status, body);
      await notifyInboxViaChannel(userId, payload);
    }
  } catch (error) {
    console.error('❌ Error emitiendo Realtime inbox:', error);
  }
}

async function notifyInboxViaChannel(
  userId: string,
  payload: InboxBroadcastPayload
) {
  const supabase = getSupabaseAdmin();
  await supabase.channel(inboxChannelName(userId)).send({
    type: 'broadcast',
    event: 'new_message',
    payload,
  });
}
