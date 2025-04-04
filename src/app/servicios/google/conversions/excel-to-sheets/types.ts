import { sheets_v4 } from 'googleapis';

export interface HojaExcel {
  nombre: string;
  nombreDestino: string;
  seleccionada: boolean;
  datos?: any[][];
}

export interface OpcionesConversion {
  nombreDocumento: string;
  documentoExistenteId?: string;
}

export interface ResultadoConversion {
  exito: boolean;
  error?: string;
  datos?: {
    spreadsheetId: string;
    url?: string;
    hojas: {
      nombre: string;
      id: number;
      filas: number;
      columnas: number;
    }[];
  };
  codigo?: number;
}
