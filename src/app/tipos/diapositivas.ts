import { ResultadoServicio } from './servicios';

// Tipos para diapositivas
export interface Diapositiva {
  id?: string;
  slides_id: string;
  titulo: string;
  orden?: number;
  diapositiva_id: string;
  google_presentation_id: string;
  configuracion?: any;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  urlImagen: string;
  indice: number;
  elementos: ElementoDiapositiva[];
}

// Tipos para elementos de diapositivas
export interface ElementoDiapositiva {
  id: string;
  tipo: 'texto' | 'tabla' | 'imagen' | 'forma' | 'titulo' | 'subtitulo' | 'lista' | 'celda';
  contenido?: string;
  idDiapositiva: string;
  idOriginal?: string;
  posicion?: {
    x: number;
    y: number;
    ancho: number;
    alto: number;
  };
  estilo?: {
    negrita?: boolean;
    cursiva?: boolean;
    subrayado?: boolean;
    tamanio?: number;
    color?: string;
    alineacion?: 'izquierda' | 'centro' | 'derecha';
  };
  columnaAsociada?: string;
  tipoAsociacion?: string;
  modificado?: boolean;
  marcadoParaAsociar?: boolean;
  _filaId?: string;
  celdaId?: string;
}

// Tipos para cambios previos a aplicar
export interface CambioPrevio {
  idDiapositiva: string;
  idElemento: string;
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
  elementos: ElementoDiapositiva[];
  indice: number;
  urlImagen?: string;
  urlImagenCached?: string;
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
    negrita?: boolean;
    cursiva?: boolean;
    subrayado?: boolean;
    tamanio?: number;
    color?: string;
    alineacion?: 'izquierda' | 'centro' | 'derecha';
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