import {
  isOutgoingMessage,
  sortMessagesChronologically,
  type MessageDirectionInput,
} from '@/lib/crm/inboxStats';
import { isEstadoTerminal } from '@/lib/contactos/estadoLead';

export const MS_HOUR = 60 * 60 * 1000;

export const DEFAULT_SEGUIMIENTO_HORAS_TEMPRANO = 12;
export const DEFAULT_SEGUIMIENTO_HORAS_DEFAULT = 24;

export const ETAPAS_SEGUIMIENTO_TEMPRANAS = ['nuevo', 'contactado'] as const;

export type SeguimientoConfig = {
  horasEtapasTempranas: number;
  horasDefault: number;
};

export const DEFAULT_SEGUIMIENTO_CONFIG: SeguimientoConfig = {
  horasEtapasTempranas: DEFAULT_SEGUIMIENTO_HORAS_TEMPRANO,
  horasDefault: DEFAULT_SEGUIMIENTO_HORAS_DEFAULT,
};

export type SeguimientoConversationInput = {
  mensajes?: MessageDirectionInput[] | null;
  leadEtapaNombre?: string | null;
};

export type SeguimientoMeta = {
  esperando_seguimiento: boolean;
  seguimiento_desde: string | null;
  seguimiento_horas: number | null;
};

export function normalizeEtapaNombre(nombre: string | null | undefined): string {
  return String(nombre || '').trim().toLowerCase();
}

export function isEtapaTempranaSeguimiento(nombre: string | null | undefined): boolean {
  const n = normalizeEtapaNombre(nombre);
  return (ETAPAS_SEGUIMIENTO_TEMPRANAS as readonly string[]).includes(n);
}

export function isEtapaExcludedFromSeguimiento(nombre: string | null | undefined): boolean {
  if (!nombre) return false;
  return isEstadoTerminal(nombre);
}

export function resolveUmbralHorasSeguimiento(
  leadEtapaNombre: string | null | undefined,
  config: SeguimientoConfig = DEFAULT_SEGUIMIENTO_CONFIG
): number {
  if (isEtapaTempranaSeguimiento(leadEtapaNombre)) {
    return config.horasEtapasTempranas;
  }
  return config.horasDefault;
}

export function getLastMessage(
  mensajes: MessageDirectionInput[] | null | undefined
): MessageDirectionInput | null {
  const sorted = sortMessagesChronologically(mensajes);
  return sorted.length > 0 ? sorted[sorted.length - 1] : null;
}

/** Último mensaje entrante del hilo (puede no ser el último si el vendedor ya respondió). */
export function getLastIncomingMessage(
  mensajes: MessageDirectionInput[] | null | undefined
): MessageDirectionInput | null {
  const sorted = sortMessagesChronologically(mensajes);
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (!isOutgoingMessage(sorted[i])) return sorted[i];
  }
  return null;
}

/**
 * Esperando seguimiento: último msg entrante + pasaron ≥ X hs + lead no terminal.
 * Si el último msg es saliente → false (aunque antes hubiera entrantes viejos).
 */
export function isEsperandoSeguimiento(
  input: SeguimientoConversationInput & { nowMs?: number },
  config: SeguimientoConfig = DEFAULT_SEGUIMIENTO_CONFIG
): boolean {
  return computeSeguimientoMeta(input, config).esperando_seguimiento;
}

export function computeSeguimientoMeta(
  input: SeguimientoConversationInput & { nowMs?: number },
  config: SeguimientoConfig = DEFAULT_SEGUIMIENTO_CONFIG
): SeguimientoMeta {
  const nowMs = input.nowMs ?? Date.now();
  const empty: SeguimientoMeta = {
    esperando_seguimiento: false,
    seguimiento_desde: null,
    seguimiento_horas: null,
  };

  if (isEtapaExcludedFromSeguimiento(input.leadEtapaNombre)) {
    return empty;
  }

  const last = getLastMessage(input.mensajes);
  if (!last || isOutgoingMessage(last)) {
    return empty;
  }

  const desde = last.fecha_mensaje;
  if (!desde) return empty;

  const desdeMs = new Date(desde).getTime();
  if (!Number.isFinite(desdeMs)) return empty;

  const horasTranscurridas = (nowMs - desdeMs) / MS_HOUR;
  const umbral = resolveUmbralHorasSeguimiento(input.leadEtapaNombre, config);

  if (horasTranscurridas < umbral) {
    return {
      esperando_seguimiento: false,
      seguimiento_desde: desde,
      seguimiento_horas: horasTranscurridas,
    };
  }

  return {
    esperando_seguimiento: true,
    seguimiento_desde: desde,
    seguimiento_horas: horasTranscurridas,
  };
}

export function countEsperandoSeguimiento<T extends SeguimientoConversationInput>(
  conversaciones: T[],
  config: SeguimientoConfig = DEFAULT_SEGUIMIENTO_CONFIG,
  nowMs: number = Date.now()
): number {
  return conversaciones.filter((c) =>
    isEsperandoSeguimiento({ ...c, nowMs }, config)
  ).length;
}

export function humanizeSeguimientoHoras(horas: number | null | undefined): string {
  if (horas == null || !Number.isFinite(horas) || horas < 0) return '';
  if (horas < 1) return `${Math.max(1, Math.round(horas * 60))} min`;
  if (horas < 48) {
    return horas < 10 ? `${horas.toFixed(1)} h` : `${Math.round(horas)} h`;
  }
  return `${Math.round(horas / 24)} d`;
}

export type ConversacionConSeguimiento = {
  fecha_mensaje: string;
  esperando_seguimiento?: boolean;
};

/** Seguimiento primero; luego por fecha_mensaje desc. */
export function sortConversacionesConSeguimiento<T extends ConversacionConSeguimiento>(
  conversaciones: T[]
): T[] {
  return [...conversaciones].sort((a, b) => {
    const aSeg = a.esperando_seguimiento ? 1 : 0;
    const bSeg = b.esperando_seguimiento ? 1 : 0;
    if (aSeg !== bSeg) return bSeg - aSeg;
    return new Date(b.fecha_mensaje).getTime() - new Date(a.fecha_mensaje).getTime();
  });
}

export const SEGUIMIENTO_DEFINITION =
  'Conversaciones cuyo último mensaje es del cliente y pasaron al menos X horas sin respuesta (12 h en Nuevo/Contactado, 24 h en el resto). No aplica a Ganado/Perdido.';
