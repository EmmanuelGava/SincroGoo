import { ResultadoServicio } from '../core/types';

export interface OpcionesExportacion {
  hojaId: string;
  formato: FormatoExportacion;
  orientacion?: OrientacionPagina;
  escala?: number;
  ajustarAncho?: boolean;
  margenes?: Margenes;
  encabezadoPie?: EncabezadoPie;
  rangos?: string[];
}

export interface Margenes {
  superior: number;
  inferior: number;
  izquierdo: number;
  derecho: number;
  unidad: 'PT' | 'PX' | 'MM';
}

export interface EncabezadoPie {
  encabezado?: string;
  piePagina?: string;
  numeroPagina?: boolean;
  fechaHora?: boolean;
}

export type FormatoExportacion = 
  | 'PDF'
  | 'XLSX'
  | 'CSV'
  | 'TSV'
  | 'ODS';

export type OrientacionPagina =
  | 'PORTRAIT'
  | 'LANDSCAPE';

export interface ConfiguracionExportacion {
  mimeType: string;
  exportFormat: string;
  parameters?: Record<string, string>;
}

export interface ResultadoExportacion extends ResultadoServicio<{
  url: string;
  nombreArchivo: string;
  formato: FormatoExportacion;
  tamaño: number;
}> {
  metadatos?: {
    paginas: number;
    hojas: number;
    filas: number;
    columnas: number;
  };
} 