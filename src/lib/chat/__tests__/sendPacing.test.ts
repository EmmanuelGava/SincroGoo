import { describe, expect, it } from 'vitest';
import { SendPacer, nextSendDelayMs } from '@/app/servicios/messaging/whatsapp/modules/sendPacing';

describe('nextSendDelayMs', () => {
  it('no espera si nunca se envió o el último envío fue hace más de 2 min', () => {
    const now = 1_000_000;
    expect(nextSendDelayMs(null, now)).toBe(0);
    expect(nextSendDelayMs(now - 120_001, now)).toBe(0);
  });

  it('espera entre 2000 y 3999 ms si el último envío fue reciente', () => {
    const now = 1_000_000;
    const lastSentAt = now - 5_000;
    expect(nextSendDelayMs(lastSentAt, now, () => 0)).toBe(2000);
    expect(nextSendDelayMs(lastSentAt, now, () => 0.999)).toBe(2000 + Math.floor(0.999 * 2000));
  });
});

describe('SendPacer', () => {
  it('deja pasar el primer envío sin delay', () => {
    const pacer = new SendPacer(() => 1_000_000, () => 0);
    expect(pacer.decide('user-1')).toEqual({ action: 'send', delayMs: 0 });
  });

  it('después de un envío reciente pide gap antes del siguiente', () => {
    let now = 1_000_000;
    const pacer = new SendPacer(() => now, () => 0);
    pacer.recordSent('user-1');
    now += 1_000;
    expect(pacer.decide('user-1')).toEqual({ action: 'send', delayMs: 2000 });
  });

  it('no mezcla el pacing de dos vendedores', () => {
    let now = 1_000_000;
    const pacer = new SendPacer(() => now, () => 0);
    pacer.recordSent('user-1');
    now += 1_000;
    expect(pacer.decide('user-2')).toEqual({ action: 'send', delayMs: 0 });
  });

  it('si ya van 20 envíos en 60 s, aplaza 20–40 s y no pide send', () => {
    let now = 1_000_000;
    const pacer = new SendPacer(() => now, () => 0);
    for (let i = 0; i < 20; i += 1) {
      pacer.recordSent('user-1');
      now += 100;
    }
    const decision = pacer.decide('user-1');
    expect(decision).toEqual({ action: 'defer', delayMs: 20_000 });
  });
});
