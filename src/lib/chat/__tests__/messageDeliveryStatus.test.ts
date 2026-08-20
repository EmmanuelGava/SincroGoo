import { describe, expect, it } from 'vitest';
import {
  canAdvanceDeliveryStatus,
  mapBaileysAckToEstado,
  resolveDisplayEstado,
} from '../messageDeliveryStatus';

describe('mapBaileysAckToEstado', () => {
  it('mapea acks de Baileys al estado de la UI', () => {
    expect(mapBaileysAckToEstado(0)).toBe('error');
    expect(mapBaileysAckToEstado(1)).toBeNull();
    expect(mapBaileysAckToEstado(2)).toBe('enviado');
    expect(mapBaileysAckToEstado(3)).toBe('entregado');
    expect(mapBaileysAckToEstado(4)).toBe('leido');
    expect(mapBaileysAckToEstado(5)).toBe('leido');
  });
});

describe('canAdvanceDeliveryStatus', () => {
  it('solo avanza hacia adelante', () => {
    expect(canAdvanceDeliveryStatus('enviando', 'enviado')).toBe(true);
    expect(canAdvanceDeliveryStatus('enviado', 'entregado')).toBe(true);
    expect(canAdvanceDeliveryStatus('entregado', 'leido')).toBe(true);
    expect(canAdvanceDeliveryStatus('leido', 'enviado')).toBe(false);
    expect(canAdvanceDeliveryStatus('leido', 'entregado')).toBe(false);
    expect(canAdvanceDeliveryStatus('entregado', 'enviado')).toBe(false);
  });

  it('no pisa un error ni un leido', () => {
    expect(canAdvanceDeliveryStatus('error', 'enviado')).toBe(false);
    expect(canAdvanceDeliveryStatus('enviando', 'error')).toBe(true);
    expect(canAdvanceDeliveryStatus('leido', 'error')).toBe(false);
  });
});

describe('resolveDisplayEstado', () => {
  it('los temp- no se muestran como enviados', () => {
    expect(resolveDisplayEstado(undefined, 'temp-1')).toBe('enviando');
    expect(resolveDisplayEstado('enviado', 'temp-1')).toBe('enviando');
    expect(resolveDisplayEstado('enviando', 'temp-1')).toBe('enviando');
  });

  it('los mensajes persistidos sin estado se muestran como enviados', () => {
    expect(resolveDisplayEstado(undefined, 'uuid-real')).toBe('enviado');
    expect(resolveDisplayEstado('leido', 'uuid-real')).toBe('leido');
  });
});
