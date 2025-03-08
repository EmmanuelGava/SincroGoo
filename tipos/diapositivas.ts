// Tipos para diapositivas
export interface Diapositiva {
  id: string;
  titulo: string;
  urlImagen: string;
  indice: number;
  elementos: ElementoDiapositiva[];
}

// Tipos para elementos de diapositivas
export interface ElementoDiapositiva {
  id: string;
  tipo: 'texto' | 'imagen' | 'forma' | 'titulo' | 'subtitulo' | 'lista' | 'tabla';
  contenido: string;
  idDiapositiva: string;
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
  urlImagen: string;
  indice: number;
}

// Tipos para actualizaciones de elementos
export interface ActualizacionElemento {
  idDiapositiva: string;
  idElemento: string;
  contenidoNuevo: string;
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
  elementos: ElementoDiapositiva[];
  idDiapositiva: string;
}

export interface ReemplazoDiapositiva {
  textoBuscar: string;
  textoReemplazar: string;
}

export interface ResultadoServicio<T> {
  exito: boolean;
  datos?: T;
  error?: string;
  timestamp: Date;
} 