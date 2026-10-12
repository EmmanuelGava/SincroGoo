import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export type OAuthProveedor = 'instagram' | 'mercadolibre';

export type OAuthState = {
  proveedor: OAuthProveedor;
  usuarioId: string;
  organizacionId: string;
  issuedAt: number;
};

const STATE_TTL_MS = 15 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createOAuthState(
  data: Omit<OAuthState, 'issuedAt'>,
  secret: string,
  now: number = Date.now()
): string {
  const payload = Buffer.from(
    JSON.stringify({ ...data, issuedAt: now, nonce: randomBytes(8).toString('hex') })
  ).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function readOAuthState(
  state: string | null | undefined,
  secret: string,
  proveedor: OAuthProveedor,
  now: number = Date.now()
): OAuthState | null {
  if (!state || !secret) return null;
  const [payload, signature] = state.split('.');
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthState;
    if (parsed.proveedor !== proveedor) return null;
    if (!parsed.usuarioId || !parsed.organizacionId || !Number.isFinite(parsed.issuedAt)) return null;
    if (now - parsed.issuedAt > STATE_TTL_MS || parsed.issuedAt > now + 60_000) return null;
    return {
      proveedor: parsed.proveedor,
      usuarioId: parsed.usuarioId,
      organizacionId: parsed.organizacionId,
      issuedAt: parsed.issuedAt,
    };
  } catch {
    return null;
  }
}
