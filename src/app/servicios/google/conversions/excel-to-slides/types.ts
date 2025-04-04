import { slides_v1 } from 'googleapis';

export interface HojaExcel {
  nombre: string;
  nombreDestino: string;
  seleccionada: boolean;
  datos?: any[][];
}

export interface OpcionesConversion {
  nombreDocumento: string;
  documentoExistenteId?: string;
  filasPorDiapositiva?: number;
  incluirEncabezados?: boolean;
}

export interface DatosConversion {
  exito: boolean;
  presentationId: string;
  url?: string;
  diapositivas: {
    id: string;
    titulo: string;
    indice: number;
  }[];
}

export interface ResultadoConversion {
  exito: boolean;
  error?: string;
  datos?: DatosConversion;
  codigo?: number;
}

export type TipoGrafico = 'barras' | 'lineas' | 'circular';

export interface ConfiguracionFila {
  inicio: number;  // Fila inicial (1-indexed)
  fin?: number;    // Fila final opcional (1-indexed)
}

export interface ElementoSlide {
  tipo: 'TITLE' | 'SUBTITLE' | 'TABLE' | 'CHART' | 'FOOTER' | 'NOTES';
  texto?: string;
  datos?: any[][];
  tipoGrafico?: TipoGrafico;
}

export interface ConfiguracionPaginacion {
  filasPorDiapositiva: number;
  incluirEncabezados: boolean;
}
