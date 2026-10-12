import { isEstadoGanado, isEstadoPerdido, isEstadoTerminal } from '@/lib/contactos/estadoLead';
import {
  isOutgoingMessage,
  sortMessagesChronologically,
  type MessageDirectionInput,
} from '@/lib/crm/messageDirection';

export const REPORTE_PERIODOS = [7, 30, 90] as const;
export type ReportePeriodo = (typeof REPORTE_PERIODOS)[number];

export function parseReportePeriodo(value: unknown): ReportePeriodo {
  const n = Number(value);
  return (REPORTE_PERIODOS as readonly number[]).includes(n) ? (n as ReportePeriodo) : 30;
}

export type ReporteMiembro = { usuario_id: string; nombre: string };

export type ReporteLead = {
  id: string;
  asignado_a: string | null;
  estado_nombre: string | null;
  valor_potencial: number | null;
  fecha_creacion: string | null;
};

export type ReporteCambioEtapa = {
  lead_id: string;
  estado_nuevo_nombre: string;
  fecha: string;
};

export type ReporteConversacion = {
  id: string;
  asignado_a: string | null;
  archived_at: string | null;
};

export type ReporteMensaje = MessageDirectionInput & {
  conversacion_id: string;
  tipo?: string | null;
};

export type ReporteAgenteFila = {
  usuario_id: string | null;
  nombre: string;
  leads_abiertos: number;
  leads_nuevos: number;
  ganados: number;
  perdidos: number;
  /** Ganados / (ganados + perdidos); null si no hubo cierres. */
  tasa_conversion: number | null;
  valor_ganado: number;
  conversaciones_activas: number;
  mensajes_enviados: number;
  respuestas: number;
  tiempo_respuesta_mediana_seg: number | null;
  tiempo_respuesta_promedio_seg: number | null;
  sin_responder: number;
};

export type ReporteAgentesInput = {
  desde: string;
  miembros: ReporteMiembro[];
  leads: ReporteLead[];
  cambiosEtapa: ReporteCambioEtapa[];
  conversaciones: ReporteConversacion[];
  mensajes: ReporteMensaje[];
};

const SIN_ASIGNAR = '__sin_asignar__';

function esNotaInterna(m: ReporteMensaje): boolean {
  return m.tipo === 'nota_interna';
}

function timeOf(fecha: string | null | undefined): number {
  const t = new Date(fecha || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

/**
 * Tiempos de respuesta (segundos) de una conversación: desde el primer mensaje
 * entrante de cada tanda hasta el siguiente saliente.
 */
export function tiemposDeRespuesta(mensajes: ReporteMensaje[], desdeMs = 0): number[] {
  const ordenados = sortMessagesChronologically(mensajes.filter((m) => !esNotaInterna(m)));
  const tiempos: number[] = [];
  let pendienteDesde: number | null = null;

  for (const m of ordenados) {
    const t = timeOf(m.fecha_mensaje);
    if (isOutgoingMessage(m)) {
      if (pendienteDesde !== null && pendienteDesde >= desdeMs) {
        tiempos.push(Math.max(0, Math.round((t - pendienteDesde) / 1000)));
      }
      pendienteDesde = null;
    } else if (pendienteDesde === null) {
      pendienteDesde = t;
    }
  }
  return tiempos;
}

/** True si el último mensaje (sin notas internas) es del cliente. */
export function quedoSinResponder(mensajes: ReporteMensaje[]): boolean {
  const ordenados = sortMessagesChronologically(mensajes.filter((m) => !esNotaInterna(m)));
  const ultimo = ordenados[ordenados.length - 1];
  return Boolean(ultimo) && !isOutgoingMessage(ultimo);
}

export function mediana(valores: number[]): number | null {
  if (!valores.length) return null;
  const s = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function promedio(valores: number[]): number | null {
  if (!valores.length) return null;
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
}

/** Último cierre (ganado/perdido) de cada lead dentro del período. */
export function cierresPorLead(cambios: ReporteCambioEtapa[], desdeMs: number): Map<string, 'ganado' | 'perdido'> {
  const ultimo = new Map<string, { t: number; resultado: 'ganado' | 'perdido' }>();
  for (const c of cambios) {
    const t = timeOf(c.fecha);
    if (t < desdeMs) continue;
    const resultado = isEstadoGanado(c.estado_nuevo_nombre)
      ? 'ganado'
      : isEstadoPerdido(c.estado_nuevo_nombre)
        ? 'perdido'
        : null;
    if (!resultado) continue;
    const prev = ultimo.get(c.lead_id);
    if (!prev || t >= prev.t) ultimo.set(c.lead_id, { t, resultado });
  }
  return new Map(Array.from(ultimo, ([id, v]) => [id, v.resultado]));
}

export function construirReporteAgentes(input: ReporteAgentesInput): ReporteAgenteFila[] {
  const desdeMs = timeOf(input.desde);
  const miembrosIds = new Set(input.miembros.map((m) => m.usuario_id));
  const clave = (id: string | null) => (id && miembrosIds.has(id) ? id : SIN_ASIGNAR);

  const filas = new Map<string, ReporteAgenteFila>();
  const tiempos = new Map<string, number[]>();
  const nuevaFila = (usuario_id: string | null, nombre: string): ReporteAgenteFila => ({
    usuario_id,
    nombre,
    leads_abiertos: 0,
    leads_nuevos: 0,
    ganados: 0,
    perdidos: 0,
    tasa_conversion: null,
    valor_ganado: 0,
    conversaciones_activas: 0,
    mensajes_enviados: 0,
    respuestas: 0,
    tiempo_respuesta_mediana_seg: null,
    tiempo_respuesta_promedio_seg: null,
    sin_responder: 0,
  });

  for (const m of input.miembros) {
    filas.set(m.usuario_id, nuevaFila(m.usuario_id, m.nombre));
    tiempos.set(m.usuario_id, []);
  }
  filas.set(SIN_ASIGNAR, nuevaFila(null, 'Sin asignar'));
  tiempos.set(SIN_ASIGNAR, []);

  const cierres = cierresPorLead(input.cambiosEtapa, desdeMs);

  for (const lead of input.leads) {
    const fila = filas.get(clave(lead.asignado_a))!;
    if (!lead.estado_nombre || !isEstadoTerminal(lead.estado_nombre)) fila.leads_abiertos += 1;
    if (timeOf(lead.fecha_creacion) >= desdeMs) fila.leads_nuevos += 1;
    const cierre = cierres.get(lead.id);
    if (cierre === 'ganado') {
      fila.ganados += 1;
      fila.valor_ganado += Number(lead.valor_potencial) || 0;
    } else if (cierre === 'perdido') {
      fila.perdidos += 1;
    }
  }

  const mensajesPorConv = new Map<string, ReporteMensaje[]>();
  for (const m of input.mensajes) {
    const lista = mensajesPorConv.get(m.conversacion_id);
    if (lista) lista.push(m);
    else mensajesPorConv.set(m.conversacion_id, [m]);
  }

  for (const conv of input.conversaciones) {
    const mensajes = mensajesPorConv.get(conv.id);
    if (!mensajes?.length) continue;
    const k = clave(conv.asignado_a);
    const fila = filas.get(k)!;
    fila.conversaciones_activas += 1;
    fila.mensajes_enviados += mensajes.filter((m) => !esNotaInterna(m) && isOutgoingMessage(m)).length;
    tiempos.get(k)!.push(...tiemposDeRespuesta(mensajes, desdeMs));
    if (!conv.archived_at && quedoSinResponder(mensajes)) fila.sin_responder += 1;
  }

  for (const [k, fila] of Array.from(filas)) {
    const t = tiempos.get(k) || [];
    fila.respuestas = t.length;
    fila.tiempo_respuesta_mediana_seg = mediana(t);
    fila.tiempo_respuesta_promedio_seg = promedio(t);
    const cerrados = fila.ganados + fila.perdidos;
    fila.tasa_conversion = cerrados ? fila.ganados / cerrados : null;
  }

  const sinAsignar = filas.get(SIN_ASIGNAR)!;
  const resultado = input.miembros.map((m) => filas.get(m.usuario_id)!);
  const sinAsignarTieneDatos =
    sinAsignar.leads_abiertos + sinAsignar.leads_nuevos + sinAsignar.ganados + sinAsignar.perdidos +
      sinAsignar.conversaciones_activas > 0;
  if (sinAsignarTieneDatos) resultado.push(sinAsignar);
  return resultado;
}

export function formatearDuracion(segundos: number | null): string {
  if (segundos === null) return '—';
  if (segundos < 60) return `${segundos} s`;
  const min = Math.round(segundos / 60);
  if (min < 60) return `${min} min`;
  const horas = segundos / 3600;
  if (horas < 24) return `${horas.toFixed(horas < 10 ? 1 : 0).replace('.', ',')} h`;
  const dias = horas / 24;
  return `${dias.toFixed(dias < 10 ? 1 : 0).replace('.', ',')} d`;
}
