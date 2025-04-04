import { sheets_v4 } from 'googleapis';
import { ResultadoServicio, ResultadoAPI } from '../core/types';

export type GoogleSpreadsheet = sheets_v4.Schema$Spreadsheet;
export type GoogleSheet = sheets_v4.Schema$Sheet;
export type GoogleRange = sheets_v4.Schema$GridRange;
export type GoogleCellData = sheets_v4.Schema$CellData;
export type GoogleCellFormat = sheets_v4.Schema$CellFormat;

export interface HojaCalculo {
  id: string;
  titulo: string;
  hojas: Hoja[];
  propietarios: string[];
  fechaCreacion: Date;
  fechaModificacion: Date;
  urlEdicion: string;
  urlVisualizacion: string;
}

export interface Hoja {
  id: number;
  titulo: string;
  indice: number;
  filas: number;
  columnas: number;
  datos?: DatosHoja;
}

export interface DatosHoja {
  encabezados: string[];
  filas: FilaHoja[];
  rango: string;
}

export interface FilaHoja {
  indice: number;
  valores: ValorCelda[];
  metadata?: {
    [key: string]: any;
  };
}

export interface ValorCelda {
  valor: any;
  formato?: FormatoCelda;
  formula?: string;
  tipo: TipoCelda;
}

export interface FormatoCelda {
  color?: string;
  colorFondo?: string;
  fuente?: string;
  tamanioFuente?: number;
  negrita?: boolean;
  cursiva?: boolean;
  subrayado?: boolean;
  alineacion?: 'LEFT' | 'CENTER' | 'RIGHT';
  formatoNumero?: string;
}

export type TipoCelda = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'FORMULA' | 'ERROR' | 'EMPTY';

export interface OpcionesLectura {
  incluirFormato?: boolean;
  incluirFormulas?: boolean;
  incluirMetadata?: boolean;
  rangoPersonalizado?: string;
}

export interface OpcionesEscritura extends OpcionesLectura {
  modo?: 'OVERWRITE' | 'INSERT_ROWS' | 'APPEND';
  validarDatos?: boolean;
}

// Tipos de respuesta
export type ResultadoHojaCalculo = ResultadoServicio<HojaCalculo>;
export type ResultadoHoja = ResultadoServicio<Hoja>;
export type ResultadoDatosHoja = ResultadoServicio<DatosHoja>;
export type ResultadoActualizacion = ResultadoServicio<{
  celdasActualizadas: number;
  filasActualizadas: number;
}>;

export interface SheetData {
  spreadsheetId: string;
  properties: {
    title: string;
    locale: string;
    timeZone: string;
  };
  sheets: Sheet[];
}

export interface Sheet {
  properties: {
    sheetId: number;
    title: string;
    index: number;
    sheetType: string;
    gridProperties: {
      rowCount: number;
      columnCount: number;
    };
  };
  data?: {
    rowData: RowData[];
  }[];
}

export interface RowData {
  values: CellData[];
}

export interface CellData {
  userEnteredValue?: {
    stringValue?: string;
    numberValue?: number;
    boolValue?: boolean;
    formulaValue?: string;
  };
  formattedValue?: string;
}

export interface UpdateResult {
  spreadsheetId: string;
  updatedRange: string;
  updatedRows: number;
  updatedColumns: number;
  updatedCells: number;
}

export type SheetUpdateResponse = ResultadoAPI<UpdateResult>;
export type SheetDataResponse = ResultadoAPI<SheetData>;
