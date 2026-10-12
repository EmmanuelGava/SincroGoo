import { describe, expect, it } from 'vitest';
import {
  aplicarValoresCampos,
  camposParaTarjeta,
  claveDesdeEtiqueta,
  formatearValorCampo,
  parseCampoDefinicionNueva,
  parseCampoDefinicionPatch,
  type CampoDefinicion,
} from '../camposPersonalizados';

function def(partial: Partial<CampoDefinicion> & Pick<CampoDefinicion, 'clave' | 'tipo'>): CampoDefinicion {
  return {
    id: partial.clave,
    entidad: 'lead',
    etiqueta: partial.clave,
    opciones: [],
    orden: 0,
    mostrar_en_tarjeta: false,
    ...partial,
  };
}

const defs: CampoDefinicion[] = [
  def({ clave: 'rubro', tipo: 'opcion', etiqueta: 'Rubro', opciones: ['Gastronomía', 'Retail'], mostrar_en_tarjeta: true, orden: 2 }),
  def({ clave: 'empleados', tipo: 'numero', etiqueta: 'Empleados', mostrar_en_tarjeta: true, orden: 1 }),
  def({ clave: 'visita', tipo: 'fecha', etiqueta: 'Visita' }),
  def({ clave: 'factura_a', tipo: 'si_no', etiqueta: 'Factura A' }),
  def({ clave: 'cuit', tipo: 'texto', etiqueta: 'CUIT' }),
];

describe('claveDesdeEtiqueta', () => {
  it('quita acentos y símbolos', () => {
    expect(claveDesdeEtiqueta('Cantidad de Empleados')).toBe('cantidad_de_empleados');
    expect(claveDesdeEtiqueta('¿Facturación?')).toBe('facturacion');
    expect(claveDesdeEtiqueta('!!!')).toBe('');
  });
});

describe('parseCampoDefinicionNueva', () => {
  it('arma la definición y deduplica opciones', () => {
    const parsed = parseCampoDefinicionNueva({
      entidad: 'lead',
      etiqueta: 'Rubro',
      tipo: 'opcion',
      opciones: 'Gastronomía, Retail, retail, ',
      mostrar_en_tarjeta: true,
    });
    expect(parsed).toEqual({
      ok: true,
      value: {
        entidad: 'lead',
        clave: 'rubro',
        etiqueta: 'Rubro',
        tipo: 'opcion',
        opciones: ['Gastronomía', 'Retail'],
        mostrar_en_tarjeta: true,
      },
    });
  });

  it('valida entidad, tipo, nombre y opciones', () => {
    expect(parseCampoDefinicionNueva({ entidad: 'otro', etiqueta: 'X', tipo: 'texto' }).ok).toBe(false);
    expect(parseCampoDefinicionNueva({ entidad: 'lead', etiqueta: 'X', tipo: 'color' }).ok).toBe(false);
    expect(parseCampoDefinicionNueva({ entidad: 'lead', etiqueta: '  ', tipo: 'texto' }).ok).toBe(false);
    expect(parseCampoDefinicionNueva({ entidad: 'lead', etiqueta: 'Rubro', tipo: 'opcion', opciones: [] }).ok).toBe(false);
  });

  it('en contactos no se muestra en la tarjeta del Kanban', () => {
    const parsed = parseCampoDefinicionNueva({ entidad: 'contacto', etiqueta: 'DNI', tipo: 'texto', mostrar_en_tarjeta: true });
    expect(parsed.ok && parsed.value.mostrar_en_tarjeta).toBe(false);
  });
});

describe('parseCampoDefinicionPatch', () => {
  it('no permite cambiar clave ni tipo', () => {
    const parsed = parseCampoDefinicionPatch({ clave: 'otra', tipo: 'texto', etiqueta: 'Rubro nuevo' }, defs[0]);
    expect(parsed).toEqual({ ok: true, value: { etiqueta: 'Rubro nuevo' } });
  });
});

describe('aplicarValoresCampos', () => {
  it('valida y normaliza por tipo', () => {
    const r = aplicarValoresCampos(defs, {}, {
      rubro: 'retail',
      empleados: '1.234,5',
      visita: '2026-10-20',
      factura_a: 'sí',
      cuit: ' 20-12345678-9 ',
      desconocido: 'x',
    });
    expect(r).toEqual({
      ok: true,
      value: { rubro: 'Retail', empleados: 1234.5, visita: '2026-10-20', factura_a: true, cuit: '20-12345678-9' },
    });
  });

  it('vacío borra y conserva valores de campos ya eliminados', () => {
    const r = aplicarValoresCampos(defs, { cuit: '1', viejo: 'queda' }, { cuit: '' });
    expect(r).toEqual({ ok: true, value: { viejo: 'queda' } });
  });

  it('rechaza valores inválidos con el nombre del campo', () => {
    expect(aplicarValoresCampos(defs, {}, { rubro: 'Minería' })).toEqual({ ok: false, error: 'Rubro: opción no válida' });
    expect(aplicarValoresCampos(defs, {}, { empleados: 'muchos' }).ok).toBe(false);
    expect(aplicarValoresCampos(defs, {}, { visita: '2026-02-30' }).ok).toBe(false);
    expect(aplicarValoresCampos(defs, {}, { factura_a: 'quizás' }).ok).toBe(false);
    expect(aplicarValoresCampos(defs, {}, ['x']).ok).toBe(false);
  });
});

describe('mostrar', () => {
  it('formatea por tipo', () => {
    expect(formatearValorCampo({ tipo: 'si_no' }, false)).toBe('No');
    expect(formatearValorCampo({ tipo: 'fecha' }, '2026-10-20')).toBe('20/10/2026');
    expect(formatearValorCampo({ tipo: 'texto' }, '')).toBeNull();
  });

  it('tarjeta: solo marcados, en orden y sin vacíos', () => {
    expect(camposParaTarjeta(defs, { rubro: 'Retail', empleados: 12, cuit: 'x' })).toEqual([
      { clave: 'empleados', etiqueta: 'Empleados', texto: '12' },
      { clave: 'rubro', etiqueta: 'Rubro', texto: 'Retail' },
    ]);
  });
});
