import { describe, expect, it } from 'vitest';
import {
  computeSeguimientoMeta,
  countEsperandoSeguimiento,
  DEFAULT_SEGUIMIENTO_CONFIG,
  isEsperandoSeguimiento,
  isEtapaTempranaSeguimiento,
  resolveUmbralHorasSeguimiento,
  sortConversacionesConSeguimiento,
} from '../seguimientoInbox';

const NOW = Date.parse('2026-08-24T12:00:00.000Z');

function hoursAgo(h: number): string {
  return new Date(NOW - h * 60 * 60 * 1000).toISOString();
}

describe('resolveUmbralHorasSeguimiento', () => {
  it('usa 12h para Nuevo/Contactado y 24h para el resto', () => {
    expect(resolveUmbralHorasSeguimiento('Nuevo')).toBe(12);
    expect(resolveUmbralHorasSeguimiento('contactado')).toBe(12);
    expect(resolveUmbralHorasSeguimiento('Calificado')).toBe(24);
    expect(resolveUmbralHorasSeguimiento(null)).toBe(24);
  });

  it('detecta etapas tempranas', () => {
    expect(isEtapaTempranaSeguimiento('Nuevo')).toBe(true);
    expect(isEtapaTempranaSeguimiento('Propuesta')).toBe(false);
  });
});

describe('isEsperandoSeguimiento', () => {
  it('marca entrante hace 25h en lead Nuevo', () => {
    expect(
      isEsperandoSeguimiento(
        {
          leadEtapaNombre: 'Nuevo',
          mensajes: [{ fecha_mensaje: hoursAgo(25), metadata: { direction: 'incoming' } }],
          nowMs: NOW,
        },
        DEFAULT_SEGUIMIENTO_CONFIG
      )
    ).toBe(true);
  });

  it('no marca entrante hace 25h en lead Ganado', () => {
    expect(
      isEsperandoSeguimiento(
        {
          leadEtapaNombre: 'Ganado',
          mensajes: [{ fecha_mensaje: hoursAgo(25), metadata: { direction: 'incoming' } }],
          nowMs: NOW,
        },
        DEFAULT_SEGUIMIENTO_CONFIG
      )
    ).toBe(false);
  });

  it('no marca entrante hace 2h aunque sea sin respuesta instantánea', () => {
    expect(
      isEsperandoSeguimiento(
        {
          leadEtapaNombre: 'Nuevo',
          mensajes: [{ fecha_mensaje: hoursAgo(2), metadata: { direction: 'incoming' } }],
          nowMs: NOW,
        },
        DEFAULT_SEGUIMIENTO_CONFIG
      )
    ).toBe(false);
  });

  it('no marca si el último mensaje es saliente', () => {
    expect(
      isEsperandoSeguimiento(
        {
          leadEtapaNombre: 'Contactado',
          mensajes: [
            { fecha_mensaje: hoursAgo(30), metadata: { direction: 'incoming' } },
            { fecha_mensaje: hoursAgo(1), usuario_id: 'vendedor' },
          ],
          nowMs: NOW,
        },
        DEFAULT_SEGUIMIENTO_CONFIG
      )
    ).toBe(false);
  });

  it('no marca sin mensajes', () => {
    expect(
      isEsperandoSeguimiento({ mensajes: [], nowMs: NOW }, DEFAULT_SEGUIMIENTO_CONFIG)
    ).toBe(false);
  });

  it('marca con 13h en Contactado (umbral 12h)', () => {
    const meta = computeSeguimientoMeta(
      {
        leadEtapaNombre: 'Contactado',
        mensajes: [{ fecha_mensaje: hoursAgo(13), metadata: { direction: 'incoming' } }],
        nowMs: NOW,
      },
      DEFAULT_SEGUIMIENTO_CONFIG
    );
    expect(meta.esperando_seguimiento).toBe(true);
    expect(meta.seguimiento_desde).toBeTruthy();
    expect(meta.seguimiento_horas).toBeGreaterThanOrEqual(13);
  });

  it('no marca si seguimiento fue dismissado después del último entrante', () => {
    const incomingAt = hoursAgo(20);
    const dismissedAt = hoursAgo(1);
    expect(
      isEsperandoSeguimiento(
        {
          leadEtapaNombre: 'Nuevo',
          mensajes: [{ fecha_mensaje: incomingAt, metadata: { direction: 'incoming' } }],
          seguimientoDismissedAt: dismissedAt,
          nowMs: NOW,
        },
        DEFAULT_SEGUIMIENTO_CONFIG
      )
    ).toBe(false);
  });
});

describe('countEsperandoSeguimiento', () => {
  it('cuenta solo las que cumplen umbral', () => {
    const convs = [
      {
        leadEtapaNombre: 'Nuevo',
        mensajes: [{ fecha_mensaje: hoursAgo(20), metadata: { direction: 'incoming' } }],
      },
      {
        leadEtapaNombre: 'Calificado',
        mensajes: [{ fecha_mensaje: hoursAgo(20), metadata: { direction: 'incoming' } }],
      },
      {
        leadEtapaNombre: 'Perdido',
        mensajes: [{ fecha_mensaje: hoursAgo(48), metadata: { direction: 'incoming' } }],
      },
    ];
    expect(countEsperandoSeguimiento(convs, DEFAULT_SEGUIMIENTO_CONFIG, NOW)).toBe(1);
  });
});

describe('sortConversacionesConSeguimiento', () => {
  it('prioriza seguimiento y luego fecha', () => {
    const sorted = sortConversacionesConSeguimiento([
      { id: 'a', fecha_mensaje: hoursAgo(1), esperando_seguimiento: false },
      { id: 'b', fecha_mensaje: hoursAgo(5), esperando_seguimiento: true },
      { id: 'c', fecha_mensaje: hoursAgo(0.5), esperando_seguimiento: true },
    ] as Array<{ id: string; fecha_mensaje: string; esperando_seguimiento: boolean }>);
    expect(sorted.map((c) => c.id)).toEqual(['c', 'b', 'a']);
  });
});
