export interface Posicion {
  x: number;
  y: number;
  unidad: 'PT' | 'EMU';
}

export interface Tamaño {
  ancho: number;
  alto: number;
  unidad: 'PT' | 'EMU';
}

export interface ElementoDiapositiva {
  id: string;
  idDiapositiva?: string;
  tipo: 'TEXTO' | 'IMAGEN' | 'VIDEO' | 'TABLA' | 'FORMA' | 'texto' | 'forma' | 'tabla' | 'imagen' | 'titulo' | 'subtitulo' | 'lista';
  texto?: string;
  contenido: ContenidoElemento | string | { texto: string } | any;
  posicion?: Posicion;
  tamaño?: Tamaño;
  estilo?: {
    color?: string;
    tamanoFuente?: number;
    alineacion?: 'left' | 'center' | 'right';
    negrita?: boolean;
    cursiva?: boolean;
    subrayado?: boolean;
  };
  celda?: string;
  columnaAsociada?: string;
  tipoAsociacion?: 'manual' | 'automatica' | 'plantilla';
  modificado?: boolean;
  _filaId?: string;
}

export interface ContenidoElementoBase {
  tipo: string;
}

export interface ContenidoTextoBase extends ContenidoElementoBase {
  tipo: 'TEXTO';
  texto: string;
}

export interface ContenidoImagenBase extends ContenidoElementoBase {
  tipo: 'IMAGEN';
  url: string;
}

export interface ContenidoVideoBase extends ContenidoElementoBase {
  tipo: 'VIDEO';
  url: string;
}

export interface ContenidoTablaBase extends ContenidoElementoBase {
  tipo: 'TABLA';
  tabla: {
    filas: number;
    columnas: number;
    datos: string[][];
  };
}

export type ContenidoElemento = 
  | ContenidoTextoBase 
  | ContenidoImagenBase 
  | ContenidoVideoBase 
  | ContenidoTablaBase; 