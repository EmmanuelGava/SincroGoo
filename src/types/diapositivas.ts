import { slides_v1 } from 'googleapis';

// Tipos para diapositivas
export interface Diapositiva {
  id: string;
  titulo: string;
  elementos: ElementoDiapositiva[];
  indice: number;
}

// Tipos para elementos de diapositivas
export interface ElementoDiapositiva {
  id: string;
  idDiapositiva?: string;
  tipo: string;
  texto?: string;
  contenido: string | { texto: string } | any;
  posicion?: {
    x: number;
    y: number;
    ancho: number;
    alto: number;
  };
  estilo?: {
    color?: string;
    tamanoFuente?: number;
    alineacion?: 'left' | 'center' | 'right';
  };
  celda?: string;
  columnaAsociada?: string;
  tipoAsociacion?: 'manual' | 'automatica' | 'plantilla';
  modificado?: boolean;
  _filaId?: string;
}

// Tipos para cambios previos a aplicar
export interface CambioPrevio {
  idElemento: string;
  idDiapositiva: string;
  contenidoAnterior: string;
  contenidoNuevo: string;
  variables?: string[];
}

// Tipos para respuestas de la API
export interface RespuestaAPI<T> {
  exito: boolean;
  datos?: T;
  error?: string;
  mensaje?: string;
}

// Tipos para vista previa de diapositivas
export interface VistaPreviaDiapositiva {
  id: string;
  titulo: string;
  indice: number;
  elementos: ElementoDiapositiva[];
}

// Tipos para actualizaciones de elementos
export interface ActualizacionElemento {
  idDiapositiva: string;
  idElemento: string;
  contenidoNuevo: string;
  columnaAsociada?: string;
  tipoAsociacion?: 'manual' | 'automatica' | 'plantilla';
}

// Tipos para mapeo de variables
export interface MapeoVariable {
  variable: string;
  columna: string;
  valor: string;
}

// Tipos para filas de hojas de cálculo
export interface FilaHoja {
  [key: string]: string | number;
}

export interface ActualizacionDiapositiva {
  idDiapositiva: string;
  elementos?: ElementoDiapositiva[];
  estilo?: {
    tamanio?: number;
    negrita?: boolean;
    color?: string;
  };
}

export interface ReemplazoDiapositiva {
  textoBuscar: string;
  textoReemplazar: string;
}

export interface Presentacion {
  presentationId: string;
  titulo: string;
  diapositivas: VistaPreviaDiapositiva[];
}

export interface ElementoSlide {
  id: string;
  tipo: 'TITLE' | 'SUBTITLE' | 'TABLE' | 'CHART' | 'FOOTER' | 'NOTES';
  texto?: string;
  indice?: number;
  datos?: any[][];
  tipoGrafico?: 'barras' | 'lineas' | 'circular';
}

export interface ActualizacionSlide {
  slideId: string;
  elementos: ElementoSlide[];
}

export interface CacheVistaPrevia {
  base64Image: string;
  timestamp: number;
}

export type GoogleSlideResponse = slides_v1.Schema$Presentation; 