import { describe, expect, it } from 'vitest';
import {
  classifyOutboxFailure,
  nextOutboxStatus,
  outboxBackoffMs,
} from '../outbox';

describe('outboxBackoffMs', () => {
  it('tras el primer claim espera 60s mas jitter 0-20%', () => {
    expect(outboxBackoffMs(1, () => 0)).toBe(60_000);
    expect(outboxBackoffMs(1, () => 1)).toBe(72_000);
  });

  it('no supera 15 minutos aunque attempts sea alto', () => {
    expect(outboxBackoffMs(20, () => 0)).toBe(15 * 60_000);
  });
});

describe('classifyOutboxFailure', () => {
  it('trata Connection Closed y 428 como transitorios', () => {
    expect(classifyOutboxFailure('Connection Closed')).toBe('transient');
    expect(classifyOutboxFailure('WhatsApp Lite no está conectado')).toBe('transient');
    expect(classifyOutboxFailure('status 428')).toBe('transient');
  });

  it('trata jid invalido como permanente', () => {
    expect(classifyOutboxFailure('jid inválido')).toBe('permanent');
    expect(classifyOutboxFailure('Invalid jid')).toBe('permanent');
  });
});

describe('nextOutboxStatus', () => {
  it('reencola un error transitorio si quedan intentos', () => {
    expect(nextOutboxStatus({ attempts: 2, maxAttempts: 8, kind: 'transient' })).toBe('queued');
  });

  it('marca failed si se acaba max_attempts o el error es permanente', () => {
    expect(nextOutboxStatus({ attempts: 8, maxAttempts: 8, kind: 'transient' })).toBe('failed');
    expect(nextOutboxStatus({ attempts: 1, maxAttempts: 8, kind: 'permanent' })).toBe('failed');
  });
});
