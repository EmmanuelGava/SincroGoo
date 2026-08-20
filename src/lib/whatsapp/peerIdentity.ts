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

type USyncPeerRow = {
  id?: string;
  lid?: string;
  phoneNumber?: string;
  contact?: unknown;
};

export function phoneFromUSyncRow(
  row: USyncPeerRow | undefined,
  lidDigits: string
): string | null {
  if (!row) return null;

  const candidates = [row.lid, row.phoneNumber, row.id];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate || candidate.includes('@lid')) {
      continue;
    }
    const phone = digitsFromJid(candidate);
    if (!phone || phone === lidDigits) continue;
    if (isJidUser(candidate) || looksLikePhoneNumber(phone)) {
      return phone;
    }
  }
  return null;
}

async function phoneFromLidMapping(
  socket: WASocket,
  remoteJid: string,
  lidDigits: string
): Promise<string | null> {
  const mapping = (socket as WASocket & {
    signalRepository?: {
      lidMapping?: { getPNForLID?: (lid: string) => Promise<string | null> };
    };
  }).signalRepository?.lidMapping;
  if (!mapping?.getPNForLID) return null;
  try {
    const pn = await mapping.getPNForLID(remoteJid);
    if (!pn) return null;
    const phone = digitsFromJid(pn);
    if (phone && phone !== lidDigits && looksLikePhoneNumber(phone)) {
      return phone;
    }
  } catch {
    return null;
  }
  return null;
}

export async function resolveWhatsAppPeer(
  socket: WASocket | null | undefined,
  remoteJid: string,
  extra?: { remoteJidAlt?: string | null; timeoutMs?: number }
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
  if (alt && looksLikePhoneNumber(alt) && digitsFromJid(alt) !== digitsFromJid(remoteJid)) {
    return { phone: digitsFromJid(alt), sendJid, resolved: true, kind: 'lid' };
  }

  if (isLidUser(remoteJid) && socket) {
    const lidDigits = digitsFromJid(remoteJid);
    const mapped = await phoneFromLidMapping(socket, remoteJid, lidDigits);
    if (mapped) {
      return { phone: mapped, sendJid, resolved: true, kind: 'lid' };
    }

    const timeoutMs = extra?.timeoutMs ?? 2500;
    try {
      const result = await Promise.race([
        socket.executeUSyncQuery(
          new USyncQuery()
            .withContactProtocol()
            .withLIDProtocol()
            .withUser(new USyncUser().withId(remoteJid).withLid(remoteJid))
        ),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
      ]);
      if (!result) {
        console.warn('⚠️ Timeout resolviendo LID a teléfono, se usa el JID original');
      } else {
        const row = result.list?.[0] as USyncPeerRow | undefined;
        const phone = phoneFromUSyncRow(row, lidDigits);
        if (phone) {
          return { phone, sendJid, resolved: true, kind: 'lid' };
        }
        console.warn('⚠️ USync no devolvió teléfono para LID:', remoteJid, row);
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
