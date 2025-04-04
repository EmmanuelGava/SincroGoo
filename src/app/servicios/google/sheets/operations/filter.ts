import { sheets_v4 } from 'googleapis';

export interface OpcionesFiltro {
  sheetId: number;
  rangoFiltro: {
    startRowIndex: number;
    endRowIndex?: number;
    startColumnIndex: number;
    endColumnIndex: number;
  };
  criterios: CriterioFiltro[];
}

export interface CriterioFiltro {
  columna: number;
  tipo: TipoFiltro;
  valor?: any;
  valores?: any[];
  condicion?: CondicionFiltro;
}

export type TipoFiltro = 'VALOR' | 'CONDICION' | 'PERSONALIZADO';

export interface CondicionFiltro {
  tipo: 'TEXTO' | 'NUMERO' | 'FECHA';
  operador: OperadorFiltro;
  valor: any;
  valorSecundario?: any;
}

export type OperadorFiltro =
  | 'IGUAL'
  | 'NO_IGUAL'
  | 'MAYOR_QUE'
  | 'MENOR_QUE'
  | 'MAYOR_IGUAL'
  | 'MENOR_IGUAL'
  | 'ENTRE'
  | 'NO_ENTRE'
  | 'CONTIENE'
  | 'NO_CONTIENE'
  | 'COMIENZA_CON'
  | 'TERMINA_CON'
  | 'ES_NULO'
  | 'NO_ES_NULO';

export function crearRequestFiltro(opciones: OpcionesFiltro): sheets_v4.Schema$Request {
  return {
    setBasicFilter: {
      filter: {
        range: {
          sheetId: opciones.sheetId,
          startRowIndex: opciones.rangoFiltro.startRowIndex,
          endRowIndex: opciones.rangoFiltro.endRowIndex,
          startColumnIndex: opciones.rangoFiltro.startColumnIndex,
          endColumnIndex: opciones.rangoFiltro.endColumnIndex
        },
        filterSpecs: opciones.criterios.map(mapearCriterioFiltro)
      }
    }
  };
}

function mapearCriterioFiltro(criterio: CriterioFiltro): sheets_v4.Schema$FilterSpec {
  const filterSpec: sheets_v4.Schema$FilterSpec = {
    columnIndex: criterio.columna
  };

  switch (criterio.tipo) {
    case 'VALOR':
      filterSpec.filterCriteria = {
        hiddenValues: Array.isArray(criterio.valores) ? criterio.valores : [criterio.valor]
      };
      break;

    case 'CONDICION':
      if (criterio.condicion) {
        filterSpec.filterCriteria = mapearCondicionFiltro(criterio.condicion);
      }
      break;

    case 'PERSONALIZADO':
      filterSpec.filterCriteria = {
        condition: {
          type: 'CUSTOM_FORMULA',
          values: [{ userEnteredValue: criterio.valor }]
        }
      };
      break;
  }

  return filterSpec;
}

function mapearCondicionFiltro(condicion: CondicionFiltro): sheets_v4.Schema$FilterCriteria {
  const filterCriteria: sheets_v4.Schema$FilterCriteria = {
    condition: {
      type: mapearTipoCondicion(condicion.tipo, condicion.operador),
      values: [{ userEnteredValue: String(condicion.valor) }]
    }
  };

  if (condicion.valorSecundario !== undefined && condicion.operador === 'ENTRE') {
    filterCriteria.condition!.values!.push({ 
      userEnteredValue: String(condicion.valorSecundario) 
    });
  }

  return filterCriteria;
}

function mapearTipoCondicion(tipo: CondicionFiltro['tipo'], operador: OperadorFiltro): string {
  const mapeoTexto: Record<OperadorFiltro, string> = {
    'IGUAL': 'TEXT_EQ',
    'NO_IGUAL': 'TEXT_NOT_EQ',
    'CONTIENE': 'TEXT_CONTAINS',
    'NO_CONTIENE': 'TEXT_NOT_CONTAINS',
    'COMIENZA_CON': 'TEXT_STARTS_WITH',
    'TERMINA_CON': 'TEXT_ENDS_WITH',
    'MAYOR_QUE': 'TEXT_GREATER',
    'MENOR_QUE': 'TEXT_LESS',
    'MAYOR_IGUAL': 'TEXT_GREATER_THAN_EQ',
    'MENOR_IGUAL': 'TEXT_LESS_THAN_EQ',
    'ENTRE': 'TEXT_BETWEEN',
    'NO_ENTRE': 'TEXT_NOT_BETWEEN',
    'ES_NULO': 'BLANK',
    'NO_ES_NULO': 'NOT_BLANK'
  };

  const mapeoNumero: Record<OperadorFiltro, string> = {
    'IGUAL': 'NUMBER_EQ',
    'NO_IGUAL': 'NUMBER_NOT_EQ',
    'MAYOR_QUE': 'NUMBER_GREATER',
    'MENOR_QUE': 'NUMBER_LESS',
    'MAYOR_IGUAL': 'NUMBER_GREATER_THAN_EQ',
    'MENOR_IGUAL': 'NUMBER_LESS_THAN_EQ',
    'ENTRE': 'NUMBER_BETWEEN',
    'NO_ENTRE': 'NUMBER_NOT_BETWEEN',
    'ES_NULO': 'BLANK',
    'NO_ES_NULO': 'NOT_BLANK',
    'CONTIENE': 'NUMBER_EQ',
    'NO_CONTIENE': 'NUMBER_NOT_EQ',
    'COMIENZA_CON': 'NUMBER_EQ',
    'TERMINA_CON': 'NUMBER_EQ'
  };

  const mapeoFecha: Record<OperadorFiltro, string> = {
    'IGUAL': 'DATE_EQ',
    'NO_IGUAL': 'DATE_NOT_EQ',
    'MAYOR_QUE': 'DATE_AFTER',
    'MENOR_QUE': 'DATE_BEFORE',
    'MAYOR_IGUAL': 'DATE_ON_OR_AFTER',
    'MENOR_IGUAL': 'DATE_ON_OR_BEFORE',
    'ENTRE': 'DATE_BETWEEN',
    'NO_ENTRE': 'DATE_NOT_BETWEEN',
    'ES_NULO': 'BLANK',
    'NO_ES_NULO': 'NOT_BLANK',
    'CONTIENE': 'DATE_EQ',
    'NO_CONTIENE': 'DATE_NOT_EQ',
    'COMIENZA_CON': 'DATE_EQ',
    'TERMINA_CON': 'DATE_EQ'
  };

  switch (tipo) {
    case 'TEXTO':
      return mapeoTexto[operador];
    case 'NUMERO':
      return mapeoNumero[operador];
    case 'FECHA':
      return mapeoFecha[operador];
    default:
      throw new Error(`Tipo de condición no soportado: ${tipo}`);
  }
} 