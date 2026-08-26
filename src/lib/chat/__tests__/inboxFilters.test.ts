import { describe, expect, it } from 'vitest';
import {
  countInboxFiltro,
  filtrarConversacionesInbox,
  normalizeInboxCanal,
  parseInboxFiltroFromUrl,
} from '../inboxFilters';

const sample = [
  { id: '1', unread_count: 2, esperando_seguimiento: false, servicio_origen: 'whatsapp-lite' },
  { id: '2', unread_count: 0, esperando_seguimiento: true, servicio_origen: 'telegram' },
  { id: '3', unread_count: 0, esperando_seguimiento: false, servicio_origen: 'email' },
];

describe('normalizeInboxCanal', () => {
  it('normaliza whatsapp-lite a whatsapp', () => {
    expect(normalizeInboxCanal('whatsapp-lite')).toBe('whatsapp');
  });
});

describe('filtrarConversacionesInbox', () => {
  it('filtra no leídas', () => {
    expect(filtrarConversacionesInbox(sample, { tipo: 'unread' }).map((c) => c.id)).toEqual(['1']);
  });

  it('filtra seguimiento', () => {
    expect(filtrarConversacionesInbox(sample, { tipo: 'seguimiento' }).map((c) => c.id)).toEqual(['2']);
  });

  it('filtra por canal whatsapp', () => {
    expect(filtrarConversacionesInbox(sample, { tipo: 'whatsapp' }).map((c) => c.id)).toEqual(['1']);
  });
});

describe('countInboxFiltro / parseInboxFiltroFromUrl', () => {
  it('cuenta por filtro', () => {
    expect(countInboxFiltro(sample, 'unread')).toBe(1);
    expect(countInboxFiltro(sample, 'seguimiento')).toBe(1);
  });

  it('parsea filtro desde URL', () => {
    expect(parseInboxFiltroFromUrl('unread')).toBe('unread');
    expect(parseInboxFiltroFromUrl('no-leidas')).toBe('unread');
    expect(parseInboxFiltroFromUrl('archivados')).toBe('archivados');
    expect(parseInboxFiltroFromUrl(null)).toBe('todos');
  });
});
