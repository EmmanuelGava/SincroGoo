import { describe, expect, it } from 'vitest';
import {
  currentScheduleFields,
  defaultScheduleFields,
  isFutureSchedule,
  parseLocalScheduleDatetime,
} from '../scheduleSend';

describe('parseLocalScheduleDatetime', () => {
  it('parsea fecha y hora local', () => {
    const when = parseLocalScheduleDatetime('2026-08-27', '09:30');
    expect(when).not.toBeNull();
    expect(when!.getHours()).toBe(9);
    expect(when!.getMinutes()).toBe(30);
  });

  it('rechaza formatos inválidos', () => {
    expect(parseLocalScheduleDatetime('', '09:00')).toBeNull();
    expect(parseLocalScheduleDatetime('2026-08-27', '9:00')).toBeNull();
  });
});

describe('isFutureSchedule', () => {
  it('exige al menos 1s en el futuro', () => {
    const now = Date.now();
    expect(isFutureSchedule(new Date(now + 2000), now)).toBe(true);
    expect(isFutureSchedule(new Date(now + 500), now)).toBe(false);
  });
});

describe('currentScheduleFields', () => {
  it('devuelve fecha y hora local actuales', () => {
    const base = new Date('2026-08-26T21:03:00');
    const fields = currentScheduleFields(base);
    expect(fields.fecha).toBe('2026-08-26');
    expect(fields.hora).toBe('21:03');
  });
});

describe('defaultScheduleFields', () => {
  it('devuelve ahora + minutos', () => {
    const base = new Date('2026-08-26T12:00:00');
    const fields = defaultScheduleFields(5, base);
    expect(fields.fecha).toBe('2026-08-26');
    expect(fields.hora).toBe('12:05');
  });
});
