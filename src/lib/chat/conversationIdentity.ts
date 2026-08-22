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

/** Remitente canónico: LID si hay @lid; si no, teléfono; si no, el id crudo. */
export function preferredConversationRemitente(input: {
  remoteJid?: string | null;
  phoneNumber?: string | null;
  remitente?: string | null;
}): string {
  const remoteJid = String(input.remoteJid || '');
  if (isWhatsAppLid(remoteJid)) {
    return remoteJid.split('@')[0].split(':')[0];
  }
  const phone = String(input.phoneNumber || '');
  if (looksLikePhoneNumber(phone)) return onlyDigits(phone);
  const remitente = String(input.remitente || '');
  if (looksLikePhoneNumber(remitente) && !isWhatsAppLid(remitente)) {
    return onlyDigits(remitente);
  }
  return remitente || phone || 'unknown';
}

/** True si el string es un nombre usable en saludos (no teléfono ni LID). */
export function isUsablePersonName(value: string | null | undefined): boolean {
  const name = String(value || '').trim();
  if (name.length < 2) return false;
  if (looksLikePhoneNumber(name)) return false;
  if (isWhatsAppLid(name)) return false;
  const digits = onlyDigits(name);
  if (digits.length >= 8 && digits.length === name.replace(/[\s+\-()]/g, '').length) {
    return false;
  }
  if (digits.length >= 14 && !/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(name)) {
    return false;
  }
  return true;
}

/** Limpia huecos feos cuando {{nombre}} quedó vacío: "Hola , ¿…" → "Hola, ¿…" */
export function cleanupEmptyNombreInText(text: string): string {
  let out = text
    .replace(/\s+,/g, ',')
    .replace(/^\s*,\s*/u, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (out && /^[a-záéíóúñü]/u.test(out)) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
  }
  return out;
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

  // Si hay teléfono real, unifica hilos LID + número en la lista
  if (looksLikePhoneNumber(phone) && !isLidDisguisedAsPhone(remoteJid, phone)) {
    return `${platform}:${onlyDigits(phone)}`;
  }
  if (isWhatsAppLid(remoteJid)) {
    return `${platform}:${remoteJid}`;
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

/**
 * Nombre para saludos / {{nombre}} en respuestas rápidas.
 * Nunca usa teléfono ni LID (evita "Hola 54911…, ¿cómo estás?").
 */
export function conversationGreetingName(conv: {
  remitente?: string | null;
  display_name?: string | null;
  metadata?: Record<string, unknown> | null;
  contactos?: { nombre?: string | null } | { nombre?: string | null }[] | null;
}): string {
  const fromContact = contactoNombre(conv.contactos);
  if (isUsablePersonName(fromContact)) return fromContact.trim();
  if (isUsablePersonName(conv.display_name)) return String(conv.display_name).trim();
  const metaName = String(metaOf(conv).contact_name || '').trim();
  if (isUsablePersonName(metaName)) return metaName;
  return '';
}

function contactoNombre(
  contactos?: { nombre?: string | null } | { nombre?: string | null }[] | null
): string {
  const row = Array.isArray(contactos) ? contactos[0] : contactos;
  return String(row?.nombre || '').trim();
}

export function conversationChatDisplayName(conv: {
  remitente?: string | null;
  display_name?: string | null;
  metadata?: Record<string, unknown> | null;
  contactos?: { nombre?: string | null } | { nombre?: string | null }[] | null;
}): string {
  return contactoNombre(conv.contactos) || conversationDisplayName(conv);
}

export function isPlaceholderLeadEmail(email: string | null | undefined): boolean {
  const value = String(email || '').trim().toLowerCase();
  return !value || value.endsWith('@klosync.local');
}

export function isLikelyInternalWhatsAppId(value: string | null | undefined): boolean {
  if (!value) return false;
  if (isWhatsAppLid(value)) return true;
  const digits = onlyDigits(value);
  return digits.length >= 14 && !digits.startsWith('54');
}

export function leadFormEmail(email: string | null | undefined): string {
  return isPlaceholderLeadEmail(email) ? '' : String(email).trim();
}

export function leadFormPhone(telefono: string | null | undefined): string {
  if (!telefono || isLikelyInternalWhatsAppId(telefono) || !looksLikePhoneNumber(telefono)) {
    return '';
  }
  return String(telefono).trim();
}

export function conversationNeedsPhoneResolution(conv: {
  remitente?: string | null;
  metadata?: Record<string, unknown> | null;
}): boolean {
  if (conversationRealPhone(conv)) return false;
  const remoteJid = String(metaOf(conv).remote_jid || '');
  return isWhatsAppLid(remoteJid) || isLikelyInternalWhatsAppId(conv.remitente);
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
