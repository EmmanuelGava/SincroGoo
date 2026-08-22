import { describe, expect, it } from 'vitest';
import {
  average,
  buildInboxStatsSnapshot,
  collectFirstResponseSamples,
  countConversionPorEtapa,
  countNoRespondidas,
  countNuevas,
  formatDurationMs,
  isConversationUnanswered,
  isOutgoingMessage,
  median,
  MS_24H,
  MS_7D,
} from '../inboxStats';

const NOW = Date.parse('2026-08-22T12:00:00.000Z');

describe('isOutgoingMessage', () => {
  it('detecta saliente por usuario_id, direction o fromMe', () => {
    expect(isOutgoingMessage({ usuario_id: 'u1' })).toBe(true);
    expect(isOutgoingMessage({ metadata: { direction: 'outgoing' } })).toBe(true);
    expect(isOutgoingMessage({ metadata: { fromMe: true } })).toBe(true);
    expect(isOutgoingMessage({ metadata: { fromMe: 'true' } })).toBe(true);
    expect(isOutgoingMessage({ metadata: { direction: 'incoming' } })).toBe(false);
    expect(isOutgoingMessage({})).toBe(false);
  });
});

describe('countNuevas', () => {
  it('cuenta actividad en 24h y 7d', () => {
    const convs = [
      { id: 'a', fecha_mensaje: new Date(NOW - 2 * 60 * 60 * 1000).toISOString() },
      { id: 'b', fecha_mensaje: new Date(NOW - 3 * MS_24H).toISOString() },
      { id: 'c', fecha_mensaje: new Date(NOW - 10 * MS_24H).toISOString() },
    ];
    expect(countNuevas(convs, NOW - MS_24H, NOW)).toBe(1);
    expect(countNuevas(convs, NOW - MS_7D, NOW)).toBe(2);
  });
});

describe('no respondidas', () => {
  it('es no respondida si el último mensaje es entrante', () => {
    const unanswered = {
      id: '1',
      mensajes: [
        { fecha_mensaje: '2026-08-21T10:00:00Z', metadata: { direction: 'incoming' } },
        { fecha_mensaje: '2026-08-21T11:00:00Z', metadata: { direction: 'outgoing' } },
        { fecha_mensaje: '2026-08-21T12:00:00Z', metadata: { direction: 'incoming' } },
      ],
    };
    const answered = {
      id: '2',
      mensajes: [
        { fecha_mensaje: '2026-08-21T10:00:00Z', metadata: { direction: 'incoming' } },
        { fecha_mensaje: '2026-08-21T11:00:00Z', usuario_id: 'agent' },
      ],
    };
    const empty = { id: '3', mensajes: [] };

    expect(isConversationUnanswered(unanswered)).toBe(true);
    expect(isConversationUnanswered(answered)).toBe(false);
    expect(isConversationUnanswered(empty)).toBe(false);
    expect(countNoRespondidas([unanswered, answered, empty])).toBe(1);
  });
});

describe('tiempo a primera respuesta', () => {
  it('toma primer entrante y primer saliente posterior dentro de la ventana', () => {
    const convs = [
      {
        id: 'c1',
        mensajes: [
          {
            fecha_mensaje: new Date(NOW - 2 * MS_24H).toISOString(),
            metadata: { direction: 'incoming' },
          },
          {
            fecha_mensaje: new Date(NOW - 2 * MS_24H + 10 * 60 * 1000).toISOString(),
            metadata: { direction: 'outgoing' },
          },
        ],
      },
      {
        id: 'c2',
        mensajes: [
          {
            fecha_mensaje: new Date(NOW - 1 * MS_24H).toISOString(),
            metadata: { direction: 'incoming' },
          },
          // sin respuesta
        ],
      },
      {
        id: 'c3',
        mensajes: [
          {
            fecha_mensaje: new Date(NOW - 10 * MS_24H).toISOString(),
            metadata: { direction: 'incoming' },
          },
          {
            fecha_mensaje: new Date(NOW - 10 * MS_24H + 60_000).toISOString(),
            metadata: { direction: 'outgoing' },
          },
        ],
      },
    ];

    const samples = collectFirstResponseSamples(convs, NOW - MS_7D, NOW);
    expect(samples).toHaveLength(1);
    expect(samples[0].conversacionId).toBe('c1');
    expect(samples[0].responseMs).toBe(10 * 60 * 1000);
  });

  it('median y average', () => {
    expect(median([])).toBeNull();
    expect(median([1, 3, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(average([10, 20])).toBe(15);
  });
});

describe('conversion por etapa', () => {
  it('cuenta leads por estado y rellena ceros', () => {
    const estados = [
      { id: 'e1', nombre: 'Nuevo', orden: 0, color: '#4FC3F7' },
      { id: 'e2', nombre: 'Ganado', orden: 1, color: '#4ECCA3' },
    ];
    const leads = [{ estado_id: 'e1' }, { estado_id: 'e1' }, { estado_id: 'e2' }];
    expect(countConversionPorEtapa(estados, leads)).toEqual([
      { estadoId: 'e1', nombre: 'Nuevo', orden: 0, color: '#4FC3F7', count: 2 },
      { estadoId: 'e2', nombre: 'Ganado', orden: 1, color: '#4ECCA3', count: 1 },
    ]);
  });
});

describe('buildInboxStatsSnapshot', () => {
  it('arma el snapshot completo', () => {
    const snapshot = buildInboxStatsSnapshot({
      nowMs: NOW,
      conversaciones: [
        {
          id: 'c1',
          fecha_mensaje: new Date(NOW - 60 * 60 * 1000).toISOString(),
          mensajes: [
            {
              fecha_mensaje: new Date(NOW - 60 * 60 * 1000).toISOString(),
              metadata: { direction: 'incoming' },
            },
          ],
        },
      ],
      estados: [{ id: 'e1', nombre: 'Nuevo', orden: 0 }],
      leads: [{ estado_id: 'e1' }],
    });

    expect(snapshot.nuevas24h).toBe(1);
    expect(snapshot.nuevas7d).toBe(1);
    expect(snapshot.noRespondidas).toBe(1);
    expect(snapshot.tiempoPrimeraRespuesta.sampleCount).toBe(0);
    expect(snapshot.conversionPorEtapa[0].count).toBe(1);
    expect(snapshot.definitions.nuevas).toContain('24h');
  });
});

describe('formatDurationMs', () => {
  it('formatea duraciones legibles', () => {
    expect(formatDurationMs(null)).toBe('—');
    expect(formatDurationMs(45_000)).toBe('45s');
    expect(formatDurationMs(5 * 60_000)).toBe('5m');
    expect(formatDurationMs(2.5 * 60 * 60_000)).toBe('2.5h');
  });
});
