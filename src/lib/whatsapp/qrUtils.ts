import QRCode from 'qrcode';

export async function toQrDataUrl(qr: string | null | undefined): Promise<string | null> {
  if (!qr) return null;
  if (qr.startsWith('data:image')) return qr;
  try {
    return await QRCode.toDataURL(qr);
  } catch {
    return qr;
  }
}

export async function waitForLiteQr(
  getQr: () => string | null | undefined,
  timeoutMs = 30000,
  intervalMs = 400
): Promise<string | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const qr = getQr();
    if (qr) return toQrDataUrl(qr);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return toQrDataUrl(getQr());
}
