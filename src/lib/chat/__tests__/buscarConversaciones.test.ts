import { describe, expect, it } from 'vitest';
import {
  buildSearchPreview,
  escapeIlikePattern,
  ilikeContainsPattern,
  normalizeSearchQuery,
  phoneMatchesQuery,
  rankConversationSearchHits,
  scoreConversationSearchHit,
  textMatchesQuery,
} from '../buscarConversaciones';

describe('normalizeSearchQuery / escapeIlikePattern', () => {
  it('trim y colapsa espacios', () => {
    expect(normalizeSearchQuery('  hola   mundo  ')).toBe('hola mundo');
  });

  it('escapa comodines ILIKE', () => {
    expect(escapeIlikePattern('100%_off')).toBe('100\\%\\_off');
    expect(ilikeContainsPattern('ana')).toBe('%ana%');
    expect(ilikeContainsPattern('  ')).toBeNull();
  });
});

describe('textMatchesQuery / phoneMatchesQuery', () => {
  it('matchea nombre sin importar mayúsculas', () => {
    expect(textMatchesQuery('Juan Pérez', 'juan')).toBe(true);
    expect(textMatchesQuery('Juan Pérez', 'maria')).toBe(false);
  });

  it('matchea teléfono por dígitos aunque haya espacios o +', () => {
    expect(phoneMatchesQuery('+54 9 11 2345-6789', '112345')).toBe(true);
    expect(phoneMatchesQuery('5491123456789', '11 2345')).toBe(true);
    expect(phoneMatchesQuery('54911', '99')).toBe(false);
  });
});

describe('buildSearchPreview', () => {
  it('recorta alrededor del hit', () => {
    const long = `AAA ${'x'.repeat(80)} presupuesto vapers ${'y'.repeat(80)} ZZZ`;
    const preview = buildSearchPreview(long, 'presupuesto', 40);
    expect(preview.toLowerCase()).toContain('presupuesto');
    expect(preview.length).toBeLessThanOrEqual(42);
  });
});

describe('scoreConversationSearchHit / rankConversationSearchHits', () => {
  it('prioriza nombre sobre contenido de mensaje', () => {
    const ranked = rankConversationSearchHits(
      [
        {
          id: 'msg',
          ultimo_mensaje: 'hola juan',
          hit_mensaje: 'hola juan',
          fecha_mensaje: '2026-08-22T12:00:00Z',
        },
        {
          id: 'name',
          contacto_nombre: 'Juan López',
          ultimo_mensaje: 'ok',
          fecha_mensaje: '2026-08-20T12:00:00Z',
        },
      ],
      'juan'
    );
    expect(ranked.map((h) => h.id)).toEqual(['name', 'msg']);
    expect(ranked[0].match_kind).toBe('nombre');
    expect(ranked[1].match_kind).toBe('mensaje');
  });

  it('usa preview del hit de mensaje', () => {
    const hit = scoreConversationSearchHit(
      {
        id: '1',
        hit_mensaje: 'Necesito el presupuesto de los vapers',
        ultimo_mensaje: 'último distinto',
        fecha_mensaje: '2026-08-22T12:00:00Z',
      },
      'presupuesto'
    );
    expect(hit?.match_kind).toBe('mensaje');
    expect(hit?.preview.toLowerCase()).toContain('presupuesto');
  });

  it('matchea teléfono y deja preview del último mensaje', () => {
    const hit = scoreConversationSearchHit(
      {
        id: '1',
        phone_number: '5491123456789',
        display_phone: '+54 9 1123 456789',
        ultimo_mensaje: 'Nos vemos mañana',
        fecha_mensaje: '2026-08-22T12:00:00Z',
      },
      '112345'
    );
    expect(hit?.match_kind).toBe('telefono');
    expect(hit?.preview).toBe('Nos vemos mañana');
  });

  it('dedupe por id quedándose con mejor score', () => {
    const ranked = rankConversationSearchHits(
      [
        {
          id: 'same',
          hit_mensaje: 'hola juan',
          fecha_mensaje: '2026-08-22T12:00:00Z',
        },
        {
          id: 'same',
          contact_name: 'Juan',
          ultimo_mensaje: 'ok',
          fecha_mensaje: '2026-08-21T12:00:00Z',
        },
      ],
      'juan'
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0].match_kind).toBe('nombre');
  });
});
