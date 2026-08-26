import { describe, expect, it } from 'vitest';
import { resolveTaskBadgeKind } from '../leadTaskBadge';

describe('resolveTaskBadgeKind', () => {
  const now = new Date('2026-08-26T15:00:00');

  it('marca vencida si due_date es ayer', () => {
    expect(resolveTaskBadgeKind({ id: '1', due_date: '2026-08-25T09:00:00Z' }, now)).toBe('overdue');
  });

  it('marca hoy si vence el mismo día local', () => {
    expect(resolveTaskBadgeKind({ id: '1', due_date: '2026-08-26T20:00:00Z' }, now)).toBe('today');
  });

  it('marca future si es posterior', () => {
    expect(resolveTaskBadgeKind({ id: '1', due_date: '2026-08-27T09:00:00Z' }, now)).toBe('future');
  });

  it('null sin tarea', () => {
    expect(resolveTaskBadgeKind(null, now)).toBeNull();
  });
});
