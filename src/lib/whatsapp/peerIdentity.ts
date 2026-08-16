import {
  isJidUser,
  isLidUser,
  USyncQuery,
  USyncUser,
  type WASocket,
} from 'baileys';

export function digitsFromJid(jid: string): string {
  return jid.split('@')[0].split(':')[0].replace(/[^\d]/g, '');
}

export function looksLikePhoneNumber(value: string): boolean {
  const digits = value.replace(/[^\d]/g, '');
  return digits.length >= 8 && digits.length <= 15 && !value.includes('@lid');
}

export async function resolveWhatsAppPeer(
  socket: WASocket | null | undefined,
  remoteJid: string,
  extra?: { remoteJidAlt?: string | null }
): Promise<{ phone: string; sendJid: string; resolved: boolean; kind: 'pn' | 'lid' }> {
  const sendJid = remoteJid;

  if (isJidUser(remoteJid)) {
    const phone = digitsFromJid(remoteJid);
    return { phone, sendJid: `${phone}@s.whatsapp.net`, resolved: true, kind: 'pn' };
  }

  const alt = extra?.remoteJidAlt;
  if (alt && isJidUser(alt)) {
    return { phone: digitsFromJid(alt), sendJid, resolved: true, kind: 'lid' };
  }

  if (isLidUser(remoteJid) && socket) {
    try {
      const result = await socket.executeUSyncQuery(
        new USyncQuery()
          .withContactProtocol()
          .withLIDProtocol()
          .withUser(new USyncUser().withId(remoteJid).withLid(remoteJid))
      );
      const row = result?.list?.[0] as { id?: string; lid?: string } | undefined;
      const candidate = typeof row?.id === 'string' ? row.id : '';
      const phone = digitsFromJid(candidate);
      const lidDigits = digitsFromJid(remoteJid);
      if (phone && phone !== lidDigits && (isJidUser(candidate) || looksLikePhoneNumber(phone))) {
        return { phone, sendJid, resolved: true, kind: 'lid' };
      }
    } catch (error) {
      console.warn('⚠️ No se pudo resolver LID a teléfono:', remoteJid, error);
    }
  }

  return {
    phone: digitsFromJid(remoteJid),
    sendJid,
    resolved: false,
    kind: isLidUser(remoteJid) ? 'lid' : 'pn',
  };
}
