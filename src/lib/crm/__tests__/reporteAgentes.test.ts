import { describe, expect, it } from 'vitest';
import {
  cierresPorLead,
  construirReporteAgentes,
  formatearDuracion,
  mediana,
  parseReportePeriodo,
  quedoSinResponder,
  tiemposDeRespuesta,
  type ReporteMensaje,
} from '../reporteAgentes';

const base = Date.parse('2026-10-01T12:00:00Z');
const at = (min: number) => new Date(base + min * 60_000).toISOString();
const entrante = (conv: string, min: number): ReporteMensaje => ({
  conversacion_id: conv,
  fecha_mensaje: at(min),
  metadata: { direction: 'incoming' },
});
const saliente = (conv: string, min: number): ReporteMensaje => ({
  conversacion_id: conv,
  fecha_mensaje: at(min),
  metadata: { direction: 'outgoing' },
});

describe('tiemposDeRespuesta', () => {
  it('mide desde el primer entrante de cada tanda hasta el siguiente saliente', () => {
    const mensajes = [
      entrante('c', 0),
      entrante('c', 2),
      saliente('c', 5),
      saliente('c', 6),
      entrante('c', 30),
      saliente('c', 90),
    ];
    expect(tiemposDeRespuesta(mensajes)).toEqual([300, 3600]);
  });

  it('ignora notas internas y entrantes sin respuesta', () => {
    const mensajes = [
      entrante('c', 0),
      { ...saliente('c', 1), tipo: 'nota_interna' },
      saliente('c', 10),
      entrante('c', 20),
    ];
    expect(tiemposDeRespuesta(mensajes)).toEqual([600]);
  });

  it('no cuenta tandas que empezaron antes del período', () => {
    const mensajes = [entrante('c', 0), saliente('c', 10)];
    expect(tiemposDeRespuesta(mensajes, base + 5 * 60_000)).toEqual([]);
  });
});

describe('quedoSinResponder / mediana / formatearDuracion', () => {
  it('detecta último mensaje del cliente', () => {
    expect(quedoSinResponder([saliente('c', 0), entrante('c', 1)])).toBe(true);
    expect(quedoSinResponder([entrante('c', 0), saliente('c', 1)])).toBe(false);
    expect(quedoSinResponder([])).toBe(false);
  });

  it('calcula la mediana', () => {
    expect(mediana([])).toBeNull();
    expect(mediana([5, 1, 3])).toBe(3);
    expect(mediana([1, 2, 3, 10])).toBe(3);
  });

  it('formatea duraciones', () => {
    expect(formatearDuracion(null)).toBe('—');
    expect(formatearDuracion(42)).toBe('42 s');
    expect(formatearDuracion(600)).toBe('10 min');
    expect(formatearDuracion(5400)).toBe('1,5 h');
    expect(formatearDuracion(3 * 86400)).toBe('3,0 d');
  });

  it('acepta solo períodos conocidos', () => {
    expect(parseReportePeriodo('7')).toBe(7);
    expect(parseReportePeriodo('90')).toBe(90);
    expect(parseReportePeriodo('15')).toBe(30);
    expect(parseReportePeriodo(undefined)).toBe(30);
  });
});

describe('cierresPorLead', () => {
  it('se queda con el último cierre del período', () => {
    const cierres = cierresPorLead(
      [
        { lead_id: 'a', estado_nuevo_nombre: 'Perdido', fecha: at(10) },
        { lead_id: 'a', estado_nuevo_nombre: 'Ganado', fecha: at(20) },
        { lead_id: 'b', estado_nuevo_nombre: 'Ganado', fecha: at(-100) },
        { lead_id: 'c', estado_nuevo_nombre: 'Propuesta', fecha: at(30) },
      ],
      base
    );
    expect(cierres.get('a')).toBe('ganado');
    expect(cierres.has('b')).toBe(false);
    expect(cierres.has('c')).toBe(false);
  });
});

describe('construirReporteAgentes', () => {
  const miembros = [
    { usuario_id: 'u1', nombre: 'Ana' },
    { usuario_id: 'u2', nombre: 'Beto' },
  ];

  it('agrega leads, cierres y respuestas por agente', () => {
    const filas = construirReporteAgentes({
      desde: at(0),
      miembros,
      leads: [
        { id: 'l1', asignado_a: 'u1', estado_nombre: 'Ganado', valor_potencial: 1000, fecha_creacion: at(1) },
        { id: 'l2', asignado_a: 'u1', estado_nombre: 'Perdido', valor_potencial: 500, fecha_creacion: at(-500) },
        { id: 'l3', asignado_a: 'u1', estado_nombre: 'Nuevo', valor_potencial: null, fecha_creacion: at(2) },
        { id: 'l4', asignado_a: 'u2', estado_nombre: 'Contactado', valor_potencial: null, fecha_creacion: at(-10) },
      ],
      cambiosEtapa: [
        { lead_id: 'l1', estado_nuevo_nombre: 'Ganado', fecha: at(50) },
        { lead_id: 'l2', estado_nuevo_nombre: 'Perdido', fecha: at(60) },
      ],
      conversaciones: [
        { id: 'c1', asignado_a: 'u1', archived_at: null },
        { id: 'c2', asignado_a: 'u2', archived_at: null },
        { id: 'c3', asignado_a: null, archived_at: null },
      ],
      mensajes: [
        entrante('c1', 1),
        saliente('c1', 3),
        entrante('c2', 5),
        entrante('c3', 7),
      ],
    });

    const ana = filas.find((f) => f.usuario_id === 'u1')!;
    expect(ana.leads_abiertos).toBe(1);
    expect(ana.leads_nuevos).toBe(2);
    expect(ana.ganados).toBe(1);
    expect(ana.perdidos).toBe(1);
    expect(ana.tasa_conversion).toBe(0.5);
    expect(ana.valor_ganado).toBe(1000);
    expect(ana.conversaciones_activas).toBe(1);
    expect(ana.mensajes_enviados).toBe(1);
    expect(ana.tiempo_respuesta_mediana_seg).toBe(120);
    expect(ana.sin_responder).toBe(0);

    const beto = filas.find((f) => f.usuario_id === 'u2')!;
    expect(beto.leads_abiertos).toBe(1);
    expect(beto.leads_nuevos).toBe(0);
    expect(beto.tasa_conversion).toBeNull();
    expect(beto.sin_responder).toBe(1);
    expect(beto.tiempo_respuesta_mediana_seg).toBeNull();

    const sinAsignar = filas.find((f) => f.usuario_id === null)!;
    expect(sinAsignar.nombre).toBe('Sin asignar');
    expect(sinAsignar.conversaciones_activas).toBe(1);
    expect(sinAsignar.sin_responder).toBe(1);
  });

  it('omite la fila sin asignar cuando no tiene datos y trata ex miembros como sin asignar', () => {
    const vacio = construirReporteAgentes({
      desde: at(0),
      miembros,
      leads: [],
      cambiosEtapa: [],
      conversaciones: [],
      mensajes: [],
    });
    expect(vacio.map((f) => f.nombre)).toEqual(['Ana', 'Beto']);

    const conExMiembro = construirReporteAgentes({
      desde: at(0),
      miembros,
      leads: [{ id: 'l', asignado_a: 'u9', estado_nombre: 'Nuevo', valor_potencial: null, fecha_creacion: at(1) }],
      cambiosEtapa: [],
      conversaciones: [],
      mensajes: [],
    });
    expect(conExMiembro.find((f) => f.usuario_id === null)?.leads_abiertos).toBe(1);
  });
});
