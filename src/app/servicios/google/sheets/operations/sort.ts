import { sheets_v4 } from 'googleapis';

export interface OpcionesOrdenamiento {
  sheetId: number;
  rangoOrdenamiento: {
    startRowIndex: number;
    endRowIndex?: number;
    startColumnIndex: number;
    endColumnIndex: number;
  };
  criterios: CriterioOrdenamiento[];
}

export interface CriterioOrdenamiento {
  columna: number;
  orden: 'ASCENDENTE' | 'DESCENDENTE';
  tipoValor?: TipoValorOrdenamiento;
}

export type TipoValorOrdenamiento = 'TEXTO' | 'NUMERO' | 'FECHA' | 'PERSONALIZADO';

export function crearRequestOrdenamiento(opciones: OpcionesOrdenamiento): sheets_v4.Schema$Request {
  return {
    sortRange: {
      range: {
        sheetId: opciones.sheetId,
        startRowIndex: opciones.rangoOrdenamiento.startRowIndex,
        endRowIndex: opciones.rangoOrdenamiento.endRowIndex,
        startColumnIndex: opciones.rangoOrdenamiento.startColumnIndex,
        endColumnIndex: opciones.rangoOrdenamiento.endColumnIndex
      },
      sortSpecs: opciones.criterios.map(mapearCriterioOrdenamiento)
    }
  };
}

function mapearCriterioOrdenamiento(criterio: CriterioOrdenamiento): sheets_v4.Schema$SortSpec {
  return {
    dimensionIndex: criterio.columna,
    sortOrder: criterio.orden === 'ASCENDENTE' ? 'ASCENDING' : 'DESCENDING',
    ...obtenerConfiguracionTipoValor(criterio.tipoValor)
  };
}

function obtenerConfiguracionTipoValor(tipo?: TipoValorOrdenamiento): Partial<sheets_v4.Schema$SortSpec> {
  if (!tipo) return {};

  switch (tipo) {
    case 'TEXTO':
      return { 
        sortOrder: 'ASCENDING',
        backgroundColor: undefined,
        foregroundColor: undefined,
        dataSourceColumnReference: undefined
      };
    case 'NUMERO':
      return {
        sortOrder: 'ASCENDING',
        backgroundColor: undefined,
        foregroundColor: undefined,
        dataSourceColumnReference: undefined
      };
    case 'FECHA':
      return {
        sortOrder: 'ASCENDING',
        backgroundColor: undefined,
        foregroundColor: undefined,
        dataSourceColumnReference: undefined
      };
    case 'PERSONALIZADO':
      return {
        sortOrder: 'CUSTOM',
        backgroundColor: undefined,
        foregroundColor: undefined,
        dataSourceColumnReference: undefined
      };
    default:
      return {};
  }
} 