import { describe, expect, it } from 'vitest';
import { shouldAlertIncomingMessage } from '../chatNotifyPolicy';

describe('shouldAlertIncomingMessage', () => {
  it('no alerta mensajes salientes', () => {
    expect(shouldAlertIncomingMessage({
      direction: 'outgoing',
      pageVisible: false,
      conversacionId: 'a',
    })).toBe(false);
  });

  it('no alerta si el usuario está mirando esa conversación', () => {
    expect(shouldAlertIncomingMessage({
      direction: 'incoming',
      pageVisible: true,
      conversacionId: 'a',
      activeConversacionId: 'a',
    })).toBe(false);
  });

  it('alerta si la pestaña está oculta', () => {
    expect(shouldAlertIncomingMessage({
      direction: 'incoming',
      pageVisible: false,
      conversacionId: 'a',
      activeConversacionId: 'a',
    })).toBe(true);
  });

  it('alerta si está en otro chat', () => {
    expect(shouldAlertIncomingMessage({
      direction: 'incoming',
      pageVisible: true,
      conversacionId: 'a',
      activeConversacionId: 'b',
    })).toBe(true);
  });
});
