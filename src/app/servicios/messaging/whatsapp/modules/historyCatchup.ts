import { createClient } from '@supabase/supabase-js';
import type { WASocket } from 'baileys';

/** No bajar historial completo: solo ventana reciente. */
export const HISTORY_WINDOW_MS = 48 * 60 * 60 * 1000;
export const DISCONNECT_BUFFER_MS = 10 * 60 * 1000;
export const MAX_HISTORY_PER_CHAT = 50;
export const MAX_CATCHUP_CHATS = 40;
export const CATCHUP_CHAT_PACING_MS = 400;
export const CATCHUP_OPEN_DELAY_MS = 2500;

const HistorySyncType = {
  INITIAL_BOOTSTRAP: 0,
  INITIAL_STATUS_V3: 1,
  FULL: 2,
  RECENT: 3,
  PUSH_NAME: 4,
  NON_BLOCKING_DATA: 5,
  ON_DEMAND: 6,
} as const;

let lastDisconnectAt: number | null = null;

export function markDisconnectAt(ts: number = Date.now()): void {
  lastDisconnectAt = ts;
  console.log('🕒 [historyCatchup] lastDisconnectAt =', new Date(ts).toISOString());
}

export function getLastDisconnectAt(): number | null {
  return lastDisconnectAt;
}

export function getHistoryCutoffMs(): number {
  if (lastDisconnectAt) {
    return lastDisconnectAt - DISCONNECT_BUFFER_MS;
  }
  return Date.now() - HISTORY_WINDOW_MS;
}

export type HistorySyncHint = {
  oldestMsgInChunkTimestampSec?: number | string | { toNumber?: () => number } | null;
  syncType?: number | string | null;
};

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  if (typeof value === 'object' && value && 'toNumber' in value && typeof (value as { toNumber: () => number }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value) || 0;
}

/**
 * Acepta solo chunks recientes (48h o desde la última caída).
 * Rechaza FULL / bootstrap para no disparar 515.
 */
export function shouldSyncHistoryChunk(msg: HistorySyncHint): boolean {
  const hasType = msg.syncType !== null && msg.syncType !== undefined && msg.syncType !== '';
  const syncType = hasType ? toNumber(msg.syncType) : Number.NaN;
  if (
    hasType &&
    (syncType === HistorySyncType.INITIAL_BOOTSTRAP ||
      syncType === HistorySyncType.INITIAL_STATUS_V3 ||
      syncType === HistorySyncType.FULL)
  ) {
    return false;
  }

  const oldestSec = toNumber(msg.oldestMsgInChunkTimestampSec);
  const cutoffSec = Math.floor(getHistoryCutoffMs() / 1000);
  if (oldestSec > 0) {
    return oldestSec >= cutoffSec;
  }

  return (
    !hasType ||
    syncType === HistorySyncType.RECENT ||
    syncType === HistorySyncType.ON_DEMAND ||
    syncType === HistorySyncType.PUSH_NAME
  );
}

export function isCatchupJid(jid: string | null | undefined): boolean {
  if (!jid) return false;
  return !jid.endsWith('@g.us') && jid !== 'status@broadcast' && !jid.endsWith('@broadcast');
}

export function isWithinCatchupWindow(timestampMs: number): boolean {
  return timestampMs >= getHistoryCutoffMs();
}

function unwrapMessage(message: any): any {
  if (!message) return null;
  const nested =
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message ||
    message.documentWithCaptionMessage?.message ||
    message.editedMessage?.message;
  if (nested) return unwrapMessage(nested);
  return message;
}

export function extractHistoryBody(message: any): { text: string; type: 'text' | 'image' | 'audio' | 'video' | 'file' } | null {
  const inner = unwrapMessage(message);
  if (!inner) return null;

  const caption =
    inner.conversation ||
    inner.extendedTextMessage?.text ||
    inner.imageMessage?.caption ||
    inner.videoMessage?.caption ||
    inner.documentMessage?.caption ||
    inner.buttonsResponseMessage?.selectedDisplayText ||
    inner.listResponseMessage?.title ||
    inner.templateButtonReplyMessage?.selectedDisplayText ||
    null;

  if (inner.imageMessage || inner.stickerMessage) {
    return { text: caption || '[Imagen]', type: 'image' };
  }
  if (inner.audioMessage || inner.pttMessage) {
    return { text: caption || '[Audio]', type: 'audio' };
  }
  if (inner.videoMessage) {
    return { text: caption || '[Video]', type: 'video' };
  }
  if (inner.documentMessage) {
    return { text: caption || '[Archivo]', type: 'file' };
  }
  if (caption) {
    return { text: caption, type: 'text' };
  }
  return null;
}

function workerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type KnownChat = {
  remoteJid: string;
  lastWaMessageId: string;
  lastTimestampSec: number;
};

async function loadKnownChats(): Promise<KnownChat[]> {
  const supabase = workerSupabase();
  if (!supabase) {
    console.warn('⚠️ [historyCatchup] Sin Supabase: no hay backup de chats conocidos');
    return [];
  }

  const { data, error } = await supabase
    .from('conversaciones')
    .select('id, fecha_mensaje, metadata')
    .eq('servicio_origen', 'whatsapp')
    .order('fecha_mensaje', { ascending: false })
    .limit(200);

  if (error) {
    console.error('❌ [historyCatchup] Error listando conversaciones:', error);
    return [];
  }

  const candidates = (data || [])
    .map((row) => {
      const metadata = row.metadata && typeof row.metadata === 'object'
        ? row.metadata as Record<string, unknown>
        : {};
      const remoteJid = String(metadata.remote_jid || '');
      return { id: row.id as string, fecha_mensaje: row.fecha_mensaje as string, remoteJid };
    })
    .filter((row) => isCatchupJid(row.remoteJid))
    .slice(0, MAX_CATCHUP_CHATS);

  const chats: KnownChat[] = [];
  for (const row of candidates) {
    const { data: lastMsg } = await supabase
      .from('mensajes_conversacion')
      .select('wa_message_id, fecha_mensaje')
      .eq('conversacion_id', row.id)
      .order('fecha_mensaje', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastFecha = lastMsg?.fecha_mensaje || row.fecha_mensaje;
    const lastTs = lastFecha ? Math.floor(new Date(lastFecha).getTime() / 1000) : Math.floor(getHistoryCutoffMs() / 1000);
    chats.push({
      remoteJid: row.remoteJid,
      lastWaMessageId: (lastMsg?.wa_message_id as string | null) || '1',
      lastTimestampSec: Number.isFinite(lastTs) && lastTs > 0 ? lastTs : Math.floor(getHistoryCutoffMs() / 1000),
    });
  }

  return chats;
}

/**
 * Backup: pide a Baileys el historial reciente de chats que ya están en el inbox.
 * Los mensajes llegan por `messaging-history.set`.
 */
export async function catchupKnownChats(socket: WASocket): Promise<void> {
  const fetchHistory = (socket as WASocket & {
    fetchMessageHistory?: (count: number, key: { remoteJid: string; id: string; fromMe: boolean }, ts: number) => Promise<unknown>;
  }).fetchMessageHistory;

  if (typeof fetchHistory !== 'function') {
    console.warn('⚠️ [historyCatchup] fetchMessageHistory no está en este Baileys, se omite backup');
    return;
  }

  const chats = await loadKnownChats();
  console.log(`📥 [historyCatchup] Backup de ${chats.length} chats conocidos (tope ${MAX_HISTORY_PER_CHAT} msgs)`);

  for (const chat of chats) {
    try {
      await fetchHistory.call(
        socket,
        MAX_HISTORY_PER_CHAT,
        {
          remoteJid: chat.remoteJid,
          id: chat.lastWaMessageId,
          fromMe: false,
        },
        chat.lastTimestampSec
      );
    } catch (error) {
      console.warn('⚠️ [historyCatchup] fetchMessageHistory falló para', chat.remoteJid, error);
    }
    await sleep(CATCHUP_CHAT_PACING_MS);
  }
}
