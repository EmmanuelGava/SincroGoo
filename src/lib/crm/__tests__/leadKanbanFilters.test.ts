import { describe, expect, it } from 'vitest';
import {
  collectEtiquetasUnicas,
  filtrarLeadsKanban,
  hayFiltrosKanbanActivos,
  leadMatchesEtiquetas,
  leadMatchesSearch,
} from '../leadKanbanFilters';

describe('leadMatchesSearch', () => {
  const lead = {
    nombre: 'Emma García',
    empresa: 'Acme SA',
    telefono: '+5491122334455',
    email: 'emma@acme.com',
  };

  it('matchea por nombre case-insensitive', () => {
    expect(leadMatchesSearch(lead, 'emma')).toBe(true);
    expect(leadMatchesSearch(lead, 'GARCÍA')).toBe(true);
    expect(leadMatchesSearch(lead, 'maria')).toBe(false);
  });

  it('matchea teléfono por dígitos parciales', () => {
    expect(leadMatchesSearch(lead, '54911')).toBe(true);
    expect(leadMatchesSearch(lead, '9112233')).toBe(true);
  });

  it('query vacía siempre matchea', () => {
    expect(leadMatchesSearch(lead, '')).toBe(true);
    expect(leadMatchesSearch(lead, '   ')).toBe(true);
  });
});

describe('leadMatchesEtiquetas / collectEtiquetasUnicas', () => {
  it('requiere todas las etiquetas seleccionadas', () => {
    const lead = { contacto_etiquetas: ['vip', 'mayorista'] };
    expect(leadMatchesEtiquetas(lead, ['vip'])).toBe(true);
    expect(leadMatchesEtiquetas(lead, ['vip', 'mayorista'])).toBe(true);
    expect(leadMatchesEtiquetas(lead, ['urgente'])).toBe(false);
    expect(leadMatchesEtiquetas({ contacto_etiquetas: [] }, ['vip'])).toBe(false);
  });

  it('collectEtiquetasUnicas ordena alfabéticamente', () => {
    const tags = collectEtiquetasUnicas([
      { contacto_etiquetas: ['vip', 'mayorista'] },
      { contacto_etiquetas: ['urgente'] },
    ]);
    expect(tags).toEqual(['mayorista', 'urgente', 'vip']);
  });
});

describe('filtrarLeadsKanban con query y seguimiento', () => {
  const leads = [
    { id: '1', nombre: 'Emma', esperando_seguimiento: true, contacto_etiquetas: ['vip'] },
    { id: '2', nombre: 'Juan', esperando_seguimiento: false, contacto_etiquetas: ['vip'] },
    { id: '3', nombre: 'Pedro', esperando_seguimiento: true, contacto_etiquetas: [] },
  ];

  it('combina query AND soloSeguimiento', () => {
    const filtered = filtrarLeadsKanban(leads, { query: 'emma', soloSeguimiento: true });
    expect(filtered.map((l) => l.id)).toEqual(['1']);
  });

  it('filtra por etiquetas', () => {
    const filtered = filtrarLeadsKanban(leads, { etiquetas: ['vip'] });
    expect(filtered.map((l) => l.id)).toEqual(['1', '2']);
  });
});

describe('filtrarLeadsKanban asignación', () => {
  const leads = [
    { id: '1', nombre: 'A', asignado_a: 'user-1' },
    { id: '2', nombre: 'B', asignado_a: 'user-2' },
    { id: '3', nombre: 'C', asignado_a: null },
  ];

  it('filtra mis leads', () => {
    const filtered = filtrarLeadsKanban(leads, {
      asignacion: 'mios',
      usuarioActualId: 'user-1',
    });
    expect(filtered.map((l) => l.id)).toEqual(['1']);
  });

  it('filtra sin asignar', () => {
    const filtered = filtrarLeadsKanban(leads, { asignacion: 'sin_asignar' });
    expect(filtered.map((l) => l.id)).toEqual(['3']);
  });
});

describe('hayFiltrosKanbanActivos', () => {
  it('detecta filtros nuevos', () => {
    expect(hayFiltrosKanbanActivos({ query: 'emma' })).toBe(true);
    expect(hayFiltrosKanbanActivos({ soloSeguimiento: true })).toBe(true);
    expect(hayFiltrosKanbanActivos({ etiquetas: ['vip'] })).toBe(true);
    expect(hayFiltrosKanbanActivos({ asignacion: 'mios' })).toBe(true);
    expect(hayFiltrosKanbanActivos({})).toBe(false);
  });
});
