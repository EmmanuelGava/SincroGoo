import type { SupabaseClient } from '@supabase/supabase-js';
import { handleIncomingMessage } from '@/lib/chat/handleIncomingMessage';
import { getInstagramProfile } from './api';
import {
  ensureFreshInstagramToken,
  getInstagramConnectionByIgUserId,
  type InstagramConnection,
} from './connection';
import { persistInstagramMedia, type PersistedInstagramMedia } from './media';
import {
  instagramMessageId,
  instagramRemitente,
  type InstagramMessagingEvent,
} from './webhook';

const ECHO_MATCH_WINDOW_MS = 2 * 60 * 1000;

async function authIdFor(supabase: SupabaseClient, usuarioId: string): Promise<string | null> {
  const { data } = await supabase.from('usuarios').select('auth_id').eq('id', usuarioId).maybeSingle();
  return data?.auth_id ? String(data.auth_id) : null;
}

async function findConversation(supabase: SupabaseClient, igsid: string) {
  const { data } = await supabase
    .from('conversaciones')
    .select('id, metadata')
    .eq('servicio_origen', 'instagram')
    .eq('remitente', instagramRemitente(igsid))
    .order('fecha_mensaje', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { id: string; metadata: Record<string, unknown> | null } | null;
}

/**
 * Un eco puede ser de un mensaje enviado desde KloSync: ya registrado por id,
 * todavía enviándose (textos largos salen en varias partes), o guardado sin id.
 */
async function isOwnEcho(
  supabase: SupabaseClient,
  conversacionId: string,
  event: InstagramMessagingEvent,
  content: string
): Promise<boolean> {
  const { data: byMid } = await supabase
    .from('mensajes_conversacion')
    .select('id')
    .eq('conversacion_id', conversacionId)
    .contains('metadata', { ig_mids: [event.mid] })
    .limit(1)
    .maybeSingle();
  if (byMid?.id) return true;

  const since = new Date(event.timestamp.getTime() - ECHO_MATCH_WINDOW_MS).toISOString();
  const { data: sending } = await supabase
    .from('mensajes_conversacion')
    .select('id')
    .eq('conversacion_id', conversacionId)
    .eq('estado_envio', 'enviando')
    .not('usuario_id', 'is', null)
    .gte('fecha_mensaje', since)
    .limit(1)
    .maybeSingle();
  if (sending?.id) return true;

  const { data } = await supabase
    .from('mensajes_conversacion')
    .select('id')
    .eq('conversacion_id', conversacionId)
    .eq('contenido', content)
    .is('wa_message_id', null)
    .not('usuario_id', 'is', null)
    .gte('fecha_mensaje', since)
    .order('fecha_mensaje', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.id) return false;
  await supabase
    .from('mensajes_conversacion')
    .update({ wa_message_id: instagramMessageId(event.mid) })
    .eq('id', data.id);
  return true;
}

async function contactNameFor(
  conn: InstagramConnection,
  token: string,
  igsid: string,
  existing: Record<string, unknown> | null | undefined
): Promise<string | undefined> {
  const known = existing?.contact_name;
  if (typeof known === 'string' && known.trim()) return known;
  try {
    const profile = await getInstagramProfile(token, igsid);
    if (profile.name && profile.username) return `${profile.name} (@${profile.username})`;
    if (profile.username) return `@${profile.username}`;
    return profile.name || undefined;
  } catch (error) {
    console.warn(`⚠️ No se pudo leer el perfil de Instagram (${conn.username}):`, error);
    return undefined;
  }
}

export async function processInstagramEvent(
  supabase: SupabaseClient,
  event: InstagramMessagingEvent
): Promise<'saved' | 'duplicate' | 'skipped'> {
  const conn = await getInstagramConnectionByIgUserId(supabase, event.igAccountId);
  if (!conn) {
    console.warn('⚠️ Webhook de Instagram para una cuenta no conectada:', event.igAccountId);
    return 'skipped';
  }

  const authId = await authIdFor(supabase, conn.usuarioId);
  const token = await ensureFreshInstagramToken(supabase, conn);
  const conversation = await findConversation(supabase, event.customerId);

  const placeholders = event.attachments.map((a) => (a.kind ? a.placeholder : [a.placeholder, a.url].filter(Boolean).join(' ')));
  const content = event.text || placeholders.join('\n') || '[Mensaje]';

  if (event.isEcho && conversation && (await isOwnEcho(supabase, conversation.id, event, content))) {
    return 'duplicate';
  }

  let media: PersistedInstagramMedia | null = null;
  const firstMedia = event.attachments.find((a) => a.kind && a.url);
  if (firstMedia?.kind && firstMedia.url) {
    media = await persistInstagramMedia(supabase, {
      url: firstMedia.url,
      kind: firstMedia.kind,
      ownerId: authId || conn.usuarioId,
      mid: event.mid,
    });
  }

  const contactName = await contactNameFor(conn, token, event.customerId, conversation?.metadata);

  const result = await handleIncomingMessage({
    platform: 'instagram',
    message: content,
    contact: { id: event.customerId, name: contactName },
    timestamp: event.timestamp,
    messageType: media ? media.file_type : 'text',
    waMessageId: instagramMessageId(event.mid),
    metadata: {
      userId: authId || conn.usuarioId,
      fromMe: event.isEcho,
      igsid: event.customerId,
      ig_account_id: event.igAccountId,
      ig_mid: event.mid,
      source: 'instagram-graph',
      ...(media || {}),
    },
  });

  return result?.duplicate ? 'duplicate' : 'saved';
}
