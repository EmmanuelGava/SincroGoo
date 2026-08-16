export function onlyDigits(value: string | null | undefined): string {
  return String(value || '').replace(/[^\d]/g, '');
}

export function isWhatsAppLid(value: string | null | undefined): boolean {
  return String(value || '').includes('@lid');
}

export function looksLikePhoneNumber(value: string | null | undefined): boolean {
  if (!value || isWhatsAppLid(value)) return false;
  const digits = onlyDigits(value);
  return digits.length >= 8 && digits.length <= 15;
}

function metaOf(conv: { metadata?: Record<string, unknown> | null }) {
  return conv.metadata && typeof conv.metadata === 'object' ? conv.metadata : {};
}

function isLidDisguisedAsPhone(
  remoteJid: string,
  phone: string
): boolean {
  if (!phone) return false;
  if (isWhatsAppLid(phone)) return true;
  if (isWhatsAppLid(remoteJid) && onlyDigits(phone) === onlyDigits(remoteJid)) {
    return true;
  }
  return onlyDigits(phone).length >= 14 && !onlyDigits(phone).startsWith('54');
}

export function conversationIdentityKey(conv: {
  remitente?: string | null;
  servicio_origen?: string | null;
  metadata?: Record<string, unknown> | null;
}): string {
  const meta = metaOf(conv);
  const phone = String(meta.phone_number || '');
  const remoteJid = String(meta.remote_jid || '');
  const platform = conv.servicio_origen || 'chat';

  if (looksLikePhoneNumber(phone) && !isLidDisguisedAsPhone(remoteJid, phone)) {
    return `${platform}:${onlyDigits(phone)}`;
  }
  if (remoteJid.endsWith('@s.whatsapp.net') && looksLikePhoneNumber(remoteJid)) {
    return `${platform}:${onlyDigits(remoteJid)}`;
  }
  if (looksLikePhoneNumber(conv.remitente) && !isWhatsAppLid(remoteJid)) {
    return `${platform}:${onlyDigits(conv.remitente)}`;
  }
  if (remoteJid.includes('@')) return `${platform}:${remoteJid}`;
  return `${platform}:${conv.remitente || 'unknown'}`;
}

export function conversationRealPhone(conv: {
  remitente?: string | null;
  metadata?: Record<string, unknown> | null;
}): string | null {
  const meta = metaOf(conv);
  const remoteJid = String(meta.remote_jid || '');
  const phone = String(meta.phone_number || '');

  if (looksLikePhoneNumber(phone) && !isLidDisguisedAsPhone(remoteJid, phone)) {
    return formatPhone(phone);
  }
  if (remoteJid.endsWith('@s.whatsapp.net') && looksLikePhoneNumber(remoteJid)) {
    return formatPhone(remoteJid);
  }
  if (
    looksLikePhoneNumber(conv.remitente)
    && !isWhatsAppLid(remoteJid)
    && !isLidDisguisedAsPhone(remoteJid, String(conv.remitente))
  ) {
    return formatPhone(String(conv.remitente));
  }
  return null;
}

export function conversationDisplayName(conv: {
  remitente?: string | null;
  display_name?: string | null;
  metadata?: Record<string, unknown> | null;
}): string {
  if (conv.display_name?.trim()) return conv.display_name.trim();

  const meta = metaOf(conv);
  const name = String(meta.contact_name || '').trim();
  if (name) return name;

  return conversationRealPhone(conv) || 'Contacto WhatsApp';
}

export function formatPhone(value: string): string {
  const digits = onlyDigits(value);
  if (digits.startsWith('549') && digits.length >= 11) {
    return `+54 9 ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  if (digits.startsWith('54') && digits.length >= 10) {
    return `+${digits}`;
  }
  if (digits.length >= 8) return `+${digits}`;
  return value;
}
