export function onlyDigits(value: string | null | undefined): string {
  return String(value || '').replace(/[^\d]/g, '');
}

export function looksLikePhoneNumber(value: string | null | undefined): boolean {
  const digits = onlyDigits(value);
  return digits.length >= 8 && digits.length <= 15;
}

export function conversationIdentityKey(conv: {
  remitente?: string | null;
  servicio_origen?: string | null;
  metadata?: Record<string, unknown> | null;
}): string {
  const meta = conv.metadata && typeof conv.metadata === 'object' ? conv.metadata : {};
  const phone = String(meta.phone_number || '');
  const remoteJid = String(meta.remote_jid || '');
  const platform = conv.servicio_origen || 'chat';

  if (looksLikePhoneNumber(phone)) return `${platform}:${onlyDigits(phone)}`;
  if (remoteJid.endsWith('@s.whatsapp.net') && looksLikePhoneNumber(remoteJid)) {
    return `${platform}:${onlyDigits(remoteJid)}`;
  }
  if (looksLikePhoneNumber(conv.remitente)) return `${platform}:${onlyDigits(conv.remitente)}`;
  if (remoteJid.includes('@')) return `${platform}:${remoteJid}`;
  return `${platform}:${conv.remitente || 'unknown'}`;
}

export function conversationDisplayName(conv: {
  remitente?: string | null;
  metadata?: Record<string, unknown> | null;
}): string {
  const meta = conv.metadata && typeof conv.metadata === 'object' ? conv.metadata : {};
  const name = String(meta.contact_name || '').trim();
  if (name) return name;

  const phone = String(meta.phone_number || conv.remitente || '');
  if (looksLikePhoneNumber(phone)) return formatPhone(phone);

  const remoteJid = String(meta.remote_jid || '');
  if (remoteJid.endsWith('@s.whatsapp.net') && looksLikePhoneNumber(remoteJid)) {
    return formatPhone(remoteJid);
  }

  return conv.remitente || 'Contacto';
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
