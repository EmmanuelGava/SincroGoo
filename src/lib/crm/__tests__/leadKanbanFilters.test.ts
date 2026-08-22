import { describe, expect, it } from 'vitest';
import {
  filtrarLeadsKanban,
  formatFechaCierreLead,
  formatValorLead,
  isLeadScore,
  leadMatchesKanbanFiltros,
  normalizeCanalLead,
} from '../leadKanbanFilters';

describe('normalizeCanalLead', () => {
  it('normaliza variantes de whatsapp/telegram/email', () => {
    expect(normalizeCanalLead('whatsapp-lite')).toBe('whatsapp');
    expect(normalizeCanalLead('WhatsApp')).toBe('whatsapp');
    expect(normalizeCanalLead('telegram')).toBe('telegram');
    expect(normalizeCanalLead('email')).toBe('email');
    expect(normalizeCanalLead(null)).toBeNull();
  });
});

describe('isLeadScore', () => {
  it('acepta solo alta|media|baja', () => {
    expect(isLeadScore('alta')).toBe(true);
    expect(isLeadScore('media')).toBe(true);
    expect(isLeadScore('baja')).toBe(true);
    expect(isLeadScore('urgente')).toBe(false);
    expect(isLeadScore(null)).toBe(false);
  });
});

describe('leadMatchesKanbanFiltros', () => {
  const base = {
    valor_potencial: 5000,
    fecha_cierre: '2026-09-15',
    canal: 'whatsapp',
  };

  it('filtra por canal normalizado', () => {
    expect(leadMatchesKanbanFiltros(base, { canal: 'whatsapp' })).toBe(true);
    expect(leadMatchesKanbanFiltros({ ...base, canal: 'whatsapp-lite' }, { canal: 'whatsapp' })).toBe(true);
    expect(leadMatchesKanbanFiltros(base, { canal: 'telegram' })).toBe(false);
    expect(leadMatchesKanbanFiltros({ ...base, canal: null }, { canal: 'whatsapp' })).toBe(false);
  });

  it('filtra por rango de valor', () => {
    expect(leadMatchesKanbanFiltros(base, { valorMin: 1000, valorMax: 10000 })).toBe(true);
    expect(leadMatchesKanbanFiltros(base, { valorMin: 6000 })).toBe(false);
    expect(leadMatchesKanbanFiltros(base, { valorMax: 4000 })).toBe(false);
    expect(leadMatchesKanbanFiltros({ ...base, valor_potencial: null }, { valorMin: 1 })).toBe(false);
  });

  it('filtra por rango de fecha de cierre', () => {
    expect(leadMatchesKanbanFiltros(base, {
      fechaCierreDesde: '2026-09-01',
      fechaCierreHasta: '2026-09-30',
    })).toBe(true);
    expect(leadMatchesKanbanFiltros(base, { fechaCierreDesde: '2026-09-16' })).toBe(false);
    expect(leadMatchesKanbanFiltros(base, { fechaCierreHasta: '2026-09-14' })).toBe(false);
    expect(leadMatchesKanbanFiltros({ ...base, fecha_cierre: null }, {
      fechaCierreDesde: '2026-09-01',
    })).toBe(false);
  });
});

describe('filtrarLeadsKanban', () => {
  it('devuelve solo los que cumplen todos los filtros', () => {
    const leads = [
      { id: '1', valor_potencial: 1000, fecha_cierre: '2026-09-10', canal: 'whatsapp' },
      { id: '2', valor_potencial: 8000, fecha_cierre: '2026-10-01', canal: 'telegram' },
      { id: '3', valor_potencial: 3000, fecha_cierre: '2026-09-20', canal: 'whatsapp' },
    ];
    const filtered = filtrarLeadsKanban(leads, {
      canal: 'whatsapp',
      valorMin: 2000,
      fechaCierreHasta: '2026-09-30',
    });
    expect(filtered.map((l) => l.id)).toEqual(['3']);
  });
});

describe('format helpers', () => {
  it('formatea valor y fecha en es-AR', () => {
    expect(formatValorLead(1500)).toMatch(/1.?500/);
    expect(formatValorLead(null)).toBeNull();
    expect(formatFechaCierreLead('2026-09-15')).toMatch(/15/);
    expect(formatFechaCierreLead(null)).toBeNull();
  });
});
