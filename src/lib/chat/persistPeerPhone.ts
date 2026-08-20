import { getSupabaseAdmin } from '@/lib/supabase/client';
import { isLikelyInternalWhatsAppId, looksLikePhoneNumber } from '@/lib/chat/conversationIdentity';

export async function persistResolvedPeerPhone(opts: {
  conversacionId: string;
  phone: string;
}): Promise<{ updated: boolean; leadId?: string }> {
  const phone = opts.phone.replace(/[^\d]/g, '');
  if (!looksLikePhoneNumber(phone)) {
    return { updated: false };
  }

  const supabase = getSupabaseAdmin();
  const { data: conv } = await supabase
    .from('conversaciones')
    .select('id, lead_id, metadata')
    .eq('id', opts.conversacionId)
    .maybeSingle();

  if (!conv) return { updated: false };

  const metadata = {
    ...((conv.metadata && typeof conv.metadata === 'object' ? conv.metadata : {}) as Record<string, unknown>),
    phone_number: phone,
  };

  await supabase
    .from('conversaciones')
    .update({ metadata })
    .eq('id', conv.id);

  if (conv.lead_id) {
    const { data: lead } = await supabase
      .from('leads')
      .select('id, telefono')
      .eq('id', conv.lead_id)
      .maybeSingle();

    if (lead && (!lead.telefono || isLikelyInternalWhatsAppId(lead.telefono))) {
      await supabase
        .from('leads')
        .update({ telefono: phone })
        .eq('id', lead.id);
    }
  }

  return { updated: true, leadId: conv.lead_id || undefined };
}
