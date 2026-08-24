/**
 * Stats mínimas del inbox (Fase 3).
 *
 * Definiciones v1:
 * - Nuevas: conversaciones con última actividad (`fecha_mensaje`) en la ventana
 *   (24h y 7d). No usa created_at; es “hubo movimiento reciente”.
 * - No respondidas: el último mensaje del hilo es entrante (no saliente).
 *   No usamos unread_count (eso es “no leídas al abrir el chat”).
 * - Tiempo a primera respuesta: mediana (y promedio) de
 *   (primer saliente − primer entrante) en conversaciones cuyo primer entrante
 *   cae en la ventana (default 7d). Sin saliente posterior → no cuenta.
 * - Conversión por etapa: conteo de leads por `estados_lead` del usuario (orden).
 * - Seguimiento: no respondidas con umbral de tiempo (12h/24h); ver seguimientoInbox.
 */

import {
  countEsperandoSeguimiento,
  DEFAULT_SEGUIMIENTO_CONFIG,
  SEGUIMIENTO_DEFINITION,
} from '@/lib/crm/seguimientoInbox';

export const MS_24H = 24 * 60 * 60 * 1000;
export const MS_7D = 7 * MS_24H;

export type MessageDirectionInput = {
  usuario_id?: string | null;
  fecha_mensaje?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ConversationStatsInput = {
  id: string;
  fecha_mensaje?: string | null;
  unread_count?: number | null;
  mensajes?: MessageDirectionInput[] | null;
  leadEtapaNombre?: string | null;
};

export type EstadoLeadCountInput = {
  id: string;
  nombre: string;
  orden: number;
  color?: string | null;
};

export type LeadEstadoInput = {
  estado_id: string;
};

export function isOutgoingMessage(msg: MessageDirectionInput): boolean {
  if (msg.usuario_id) return true;
  const meta = msg.metadata && typeof msg.metadata === 'object' ? msg.metadata : {};
  if (meta.direction === 'outgoing') return true;
  if (meta.fromMe === true || meta.fromMe === 'true') return true;
  return false;
}

export function sortMessagesChronologically<T extends MessageDirectionInput>(
  mensajes: T[] | null | undefined
): T[] {
  return [...(mensajes || [])].sort(
    (a, b) => new Date(a.fecha_mensaje || 0).getTime() - new Date(b.fecha_mensaje || 0).getTime()
  );
}

/** Conversaciones con actividad (fecha_mensaje) >= sinceMs. */
export function countNuevas(
  conversaciones: ConversationStatsInput[],
  sinceMs: number,
  nowMs: number = Date.now()
): number {
  return conversaciones.filter((c) => {
    const t = new Date(c.fecha_mensaje || 0).getTime();
    return t >= sinceMs && t <= nowMs;
  }).length;
}

/**
 * No respondidas: último mensaje del hilo es entrante.
 * Sin mensajes → no cuenta (no hay nada que responder).
 */
export function isConversationUnanswered(conv: ConversationStatsInput): boolean {
  const sorted = sortMessagesChronologically(conv.mensajes);
  if (sorted.length === 0) return false;
  return !isOutgoingMessage(sorted[sorted.length - 1]);
}

export function countNoRespondidas(conversaciones: ConversationStatsInput[]): number {
  return conversaciones.filter(isConversationUnanswered).length;
}

export type FirstResponseSample = {
  conversacionId: string;
  firstIncomingAt: string;
  firstOutgoingAt: string;
  responseMs: number;
};

/**
 * Primer entrante y primer saliente posterior. Solo incluye conversaciones
 * cuyo primer entrante está en [sinceMs, nowMs].
 */
export function collectFirstResponseSamples(
  conversaciones: ConversationStatsInput[],
  sinceMs: number,
  nowMs: number = Date.now()
): FirstResponseSample[] {
  const samples: FirstResponseSample[] = [];

  for (const conv of conversaciones) {
    const sorted = sortMessagesChronologically(conv.mensajes);
    const firstIncoming = sorted.find((m) => !isOutgoingMessage(m));
    if (!firstIncoming?.fecha_mensaje) continue;

    const incomingAt = new Date(firstIncoming.fecha_mensaje).getTime();
    if (incomingAt < sinceMs || incomingAt > nowMs) continue;

    const firstOutgoing = sorted.find(
      (m) =>
        isOutgoingMessage(m)
        && new Date(m.fecha_mensaje || 0).getTime() >= incomingAt
    );
    if (!firstOutgoing?.fecha_mensaje) continue;

    const outgoingAt = new Date(firstOutgoing.fecha_mensaje).getTime();
    const responseMs = outgoingAt - incomingAt;
    if (responseMs < 0) continue;

    samples.push({
      conversacionId: conv.id,
      firstIncomingAt: firstIncoming.fecha_mensaje,
      firstOutgoingAt: firstOutgoing.fecha_mensaje,
      responseMs,
    });
  }

  return samples;
}

export function median(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function average(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

export type FirstResponseStats = {
  sampleCount: number;
  medianMs: number | null;
  averageMs: number | null;
};

export function computeFirstResponseStats(
  conversaciones: ConversationStatsInput[],
  sinceMs: number,
  nowMs: number = Date.now()
): FirstResponseStats {
  const samples = collectFirstResponseSamples(conversaciones, sinceMs, nowMs);
  const values = samples.map((s) => s.responseMs);
  return {
    sampleCount: values.length,
    medianMs: median(values),
    averageMs: average(values),
  };
}

export type ConversionPorEtapa = {
  estadoId: string;
  nombre: string;
  orden: number;
  color: string | null;
  count: number;
};

export function countConversionPorEtapa(
  estados: EstadoLeadCountInput[],
  leads: LeadEstadoInput[]
): ConversionPorEtapa[] {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    counts.set(lead.estado_id, (counts.get(lead.estado_id) || 0) + 1);
  }

  return [...estados]
    .sort((a, b) => a.orden - b.orden)
    .map((estado) => ({
      estadoId: estado.id,
      nombre: estado.nombre,
      orden: estado.orden,
      color: estado.color ?? null,
      count: counts.get(estado.id) || 0,
    }));
}

export type InboxStatsSnapshot = {
  nuevas24h: number;
  nuevas7d: number;
  noRespondidas: number;
  esperandoSeguimiento: number;
  tiempoPrimeraRespuesta: FirstResponseStats;
  conversionPorEtapa: ConversionPorEtapa[];
  definitions: {
    nuevas: string;
    noRespondidas: string;
    esperandoSeguimiento: string;
    tiempoPrimeraRespuesta: string;
    conversionPorEtapa: string;
  };
};

export const INBOX_STATS_DEFINITIONS = {
  nuevas:
    'Conversaciones con última actividad (fecha_mensaje) en las últimas 24h / 7d.',
  noRespondidas:
    'Conversaciones cuyo último mensaje es entrante (sin respuesta saliente posterior). No usa unread_count.',
  esperandoSeguimiento: SEGUIMIENTO_DEFINITION,
  tiempoPrimeraRespuesta:
    'Mediana y promedio de (primer saliente − primer entrante) en conversaciones cuyo primer entrante fue en los últimos 7 días.',
  conversionPorEtapa:
    'Conteo de leads del usuario agrupados por estados_lead (orden del embudo).',
} as const;

export function buildInboxStatsSnapshot(input: {
  conversaciones: ConversationStatsInput[];
  estados: EstadoLeadCountInput[];
  leads: LeadEstadoInput[];
  nowMs?: number;
}): InboxStatsSnapshot {
  const nowMs = input.nowMs ?? Date.now();
  return {
    nuevas24h: countNuevas(input.conversaciones, nowMs - MS_24H, nowMs),
    nuevas7d: countNuevas(input.conversaciones, nowMs - MS_7D, nowMs),
    noRespondidas: countNoRespondidas(input.conversaciones),
    esperandoSeguimiento: countEsperandoSeguimiento(
      input.conversaciones,
      DEFAULT_SEGUIMIENTO_CONFIG,
      nowMs
    ),
    tiempoPrimeraRespuesta: computeFirstResponseStats(
      input.conversaciones,
      nowMs - MS_7D,
      nowMs
    ),
    conversionPorEtapa: countConversionPorEtapa(input.estados, input.leads),
    definitions: { ...INBOX_STATS_DEFINITIONS },
  };
}

/** Formato corto para UI (ej. "3m", "1.2h", "2d"). */
export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hours = ms / (60 * 60 * 1000);
  if (hours < 48) return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}
