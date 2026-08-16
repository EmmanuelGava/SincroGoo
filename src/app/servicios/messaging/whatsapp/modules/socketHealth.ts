import type { WASocket } from 'baileys';
import { DisconnectReason } from 'baileys';

const WS_OPEN = 1;

/**
 * Baileys deja `socket.user` incluso después de `connection: close`.
 * Solo el WebSocket abierto indica que se puede enviar.
 */
export function isWaSocketOpen(socket: WASocket | null | undefined): boolean {
  if (!socket) return false;
  const ws = socket.ws as { readyState?: number; isOpen?: boolean } | undefined;
  if (!ws) return false;
  if (typeof ws.isOpen === 'boolean') return ws.isOpen;
  if (typeof ws.readyState === 'number') return ws.readyState === WS_OPEN;
  return false;
}

export function getDisconnectStatusCode(error: unknown): number | undefined {
  const boom = error as {
    output?: { statusCode?: number };
    statusCode?: number;
  };
  return boom?.output?.statusCode ?? boom?.statusCode;
}

export function isPermanentDisconnect(statusCode: number | undefined): boolean {
  return (
    statusCode === DisconnectReason.loggedOut ||
    statusCode === DisconnectReason.forbidden ||
    statusCode === DisconnectReason.multideviceMismatch ||
    statusCode === DisconnectReason.badSession
  );
}

export function isConnectionClosedError(error: unknown): boolean {
  const code = getDisconnectStatusCode(error);
  if (
    code === DisconnectReason.connectionClosed ||
    code === DisconnectReason.connectionLost ||
    code === DisconnectReason.timedOut ||
    code === DisconnectReason.connectionReplaced
  ) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /connection closed/i.test(message) || /precondition required/i.test(message);
}
