export type LeadConversationLink = {
  id: string;
  lead_id?: string | null;
  contacto_id?: string | null;
  unread_count?: number | null;
  fecha_mensaje?: string | null;
};

export type LeadWithContacto = {
  id: string;
  contacto_id?: string | null;
};

function newer(a: LeadConversationLink, b: LeadConversationLink): LeadConversationLink {
  return new Date(a.fecha_mensaje || 0).getTime() >= new Date(b.fecha_mensaje || 0).getTime()
    ? a
    : b;
}

export function attachLeadConversationMeta<T extends LeadWithContacto>(
  leads: T[],
  conversaciones: LeadConversationLink[]
): Array<T & { conversacion_id: string | null; unread_count: number }> {
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
    return {
      ...lead,
      conversacion_id: conv?.id || null,
      unread_count: conv?.unread_count || 0,
    };
  });
}
