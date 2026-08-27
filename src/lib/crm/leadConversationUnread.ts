import { computeSeguimientoMeta } from '@/lib/crm/seguimientoInbox';
import type { MessageDirectionInput } from '@/lib/crm/messageDirection';

export type LeadConversationLink = {
  id: string;
  lead_id?: string | null;
  contacto_id?: string | null;
  unread_count?: number | null;
  fecha_mensaje?: string | null;
  ultimo_mensaje?: string | null;
  servicio_origen?: string | null;
  mensajes?: MessageDirectionInput[] | null;
  seguimiento_dismissed_at?: string | null;
};

export type LeadWithContacto = {
  id: string;
  contacto_id?: string | null;
};

export type MensajePreview = {
  contenido?: string | null;
  fecha_mensaje?: string | null;
};

const PREVIEW_MESSAGES = 3;
const PREVIEW_MAX_CHARS = 240;

function newer(a: LeadConversationLink, b: LeadConversationLink): LeadConversationLink {
  return new Date(a.fecha_mensaje || 0).getTime() >= new Date(b.fecha_mensaje || 0).getTime()
    ? a
    : b;
}

function cleanLine(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/**
 * Últimas líneas del hilo para la tarjeta del Kanban (orden cronológico).
 * Así se entiende de qué se hablaba aunque el último mensaje sea corto ("ok", "3").
 */
export function pickUltimoMensaje(
  mensajes: MensajePreview[] | null | undefined
): { contenido: string | null; fecha_mensaje: string | null } {
  if (!mensajes?.length) return { contenido: null, fecha_mensaje: null };

  const sortedDesc = [...mensajes].sort(
    (a, b) => new Date(b.fecha_mensaje || 0).getTime() - new Date(a.fecha_mensaje || 0).getTime()
  );

  const recent = sortedDesc
    .map((m) => ({
      texto: cleanLine(String(m.contenido || '')),
      fecha_mensaje: m.fecha_mensaje || null,
    }))
    .filter((m) => m.texto.length > 0)
    .slice(0, PREVIEW_MESSAGES);

  if (recent.length === 0) {
    return { contenido: null, fecha_mensaje: sortedDesc[0]?.fecha_mensaje || null };
  }

  const chronological = [...recent].reverse();
  let contenido = chronological.map((m) => m.texto).join('\n');
  if (contenido.length > PREVIEW_MAX_CHARS) {
    contenido = `${contenido.slice(0, PREVIEW_MAX_CHARS).trimEnd()}…`;
  }

  return {
    contenido,
    fecha_mensaje: recent[0]?.fecha_mensaje || null,
  };
}

type LeadWithEtapa = LeadWithContacto & {
  estados_lead?: { nombre?: string | null } | { nombre?: string | null }[] | null;
};

function leadEtapaNombre(lead: LeadWithEtapa): string | null {
  const estado = Array.isArray(lead.estados_lead) ? lead.estados_lead[0] : lead.estados_lead;
  const nombre = String(estado?.nombre || '').trim();
  return nombre || null;
}

export function attachLeadConversationMeta<T extends LeadWithEtapa>(
  leads: T[],
  conversaciones: LeadConversationLink[]
): Array<
  T & {
    conversacion_id: string | null;
    unread_count: number;
    ultimo_mensaje: string | null;
    fecha_ultimo_mensaje: string | null;
    canal: string | null;
    esperando_seguimiento: boolean;
    seguimiento_desde: string | null;
    seguimiento_horas: number | null;
  }
> {
  const byLeadId = new Map<string, LeadConversationLink>();
  const byContactoId = new Map<string, LeadConversationLink>();

  for (const conv of conversaciones) {
    if (conv.lead_id) {
      const existing = byLeadId.get(conv.lead_id);
      byLeadId.set(conv.lead_id, existing ? newer(existing, conv) : conv);
    }
    if (conv.contacto_id) {
      const existing = byContactoId.get(conv.contacto_id);
      byContactoId.set(conv.contacto_id, existing ? newer(existing, conv) : conv);
    }
  }

  return leads.map((lead) => {
    const conv =
      byLeadId.get(lead.id)
      || (lead.contacto_id ? byContactoId.get(lead.contacto_id) : undefined);
    const seguimiento = computeSeguimientoMeta({
      mensajes: conv?.mensajes,
      leadEtapaNombre: leadEtapaNombre(lead),
      seguimientoDismissedAt: conv?.seguimiento_dismissed_at || null,
    });
    return {
      ...lead,
      conversacion_id: conv?.id || null,
      unread_count: conv?.unread_count || 0,
      ultimo_mensaje: conv?.ultimo_mensaje || null,
      fecha_ultimo_mensaje: conv?.fecha_mensaje || null,
      canal: conv?.servicio_origen || null,
      esperando_seguimiento: seguimiento.esperando_seguimiento,
      seguimiento_desde: seguimiento.seguimiento_desde,
      seguimiento_horas: seguimiento.seguimiento_horas,
    };
  });
}
