import { slides_v1 } from 'googleapis';
import { ResultadoServicio } from '../core/types';

export type GooglePresentation = slides_v1.Schema$Presentation;
export type GoogleSlide = slides_v1.Schema$Page;
export type GoogleElement = slides_v1.Schema$PageElement;
export type GoogleShape = slides_v1.Schema$Shape;
export type GoogleImage = slides_v1.Schema$Image;
export type GoogleVideo = slides_v1.Schema$Video;
export type GoogleTable = slides_v1.Schema$Table;

export interface Presentacion {
  id: string;
  nombre: string;
  slides: slides_v1.Schema$Page[];
  diapositivas: Diapositiva[];
  propietarios: string[];
  fechaCreacion: Date;
  fechaModificacion?: string;
  urlEdicion: string;
  urlVisualizacion: string;
  urlMiniaturas: string[];
}

export interface Diapositiva {
  id: string;
  indice: number;
  titulo: string;
  elementos: ElementoDiapositiva[];
  layout: TipoLayout;
  urlImagen: string;
  notas: string;
}

export type TipoElemento = 'TEXTO' | 'IMAGEN' | 'VIDEO' | 'TABLA' | 'FORMA' | 'LINEA';

export interface Posicion {
  x: number;
  y: number;
  unidad: 'PT';
}

export interface Tamaño {
  ancho: number;
  alto: number;
  unidad: 'PT';
}

export type TipoLayout =
  | 'TITULO'
  | 'TITULO_Y_CUERPO'
  | 'TITULO_Y_DOS_COLUMNAS'
  | 'SOLO_TITULO'
  | 'SECCION'
  | 'DOS_COLUMNAS'
  | 'EN_BLANCO';

export interface FormatoTexto {
  fuente?: string;
  tamaño?: number;
  color?: string;
  colorFondo?: string;
  negrita?: boolean;
  cursiva?: boolean;
  subrayado?: boolean;
}

export interface ContenidoBase {
  tipo: TipoElemento;
  formato?: FormatoTexto;
}

export interface ContenidoTextoBase extends ContenidoBase {
  tipo: 'TEXTO';
  texto: string;
}

export interface ContenidoImagenBase extends ContenidoBase {
  tipo: 'IMAGEN';
  url: string;
}

export interface ContenidoVideoBase extends ContenidoBase {
  tipo: 'VIDEO';
  url: string;
}

export interface TablaElemento {
  filas: number;
  columnas: number;
  datos: string[][];
  estilos?: {
    colorBorde?: string;
    anchoBorde?: number;
    colorFondo?: string;
  };
}

export interface ContenidoTablaBase extends ContenidoBase {
  tipo: 'TABLA';
  tabla: TablaElemento;
}

export type ContenidoElemento = 
  | ContenidoTextoBase 
  | ContenidoImagenBase 
  | ContenidoVideoBase 
  | ContenidoTablaBase;

export interface ElementoDiapositiva {
  id: string;
  tipo: string;
  contenido: ContenidoElemento;
  posicion?: Posicion;
  tamaño?: Tamaño;
}

export interface OpcionesCreacion {
  titulo: string;
}

export interface OpcionesActualizacion {
  titulo?: string;
  layout?: string;
  notas?: string;
  elementos?: ElementoDiapositiva[];
}

export interface OpcionesElemento {
  presentacionId: string;
  diapositivaId: string;
  elemento: ElementoDiapositiva;
}

export interface OpcionesActualizacionElemento extends OpcionesElemento {
  actualizarContenido?: boolean;
  actualizarPosicion?: boolean;
  actualizarEstilo?: boolean;
}

// Tipos de respuesta
export type ResultadoPresentacion = ResultadoServicio<Presentacion>;
export type ResultadoDiapositiva = ResultadoServicio<Diapositiva>;
export type ResultadoElemento = ResultadoServicio<ElementoDiapositiva>;
export type ResultadoActualizacion = ResultadoServicio<{
  elementosActualizados: number;
  diapositivasActualizadas: number;
}>;

export interface VistaPreviaDiapositiva {
  id: string;
  indice: number;
  urlImagen: string;
}

export interface PresentacionResponse {
  presentacion: {
    id: string;
    titulo: string;
  };
  hojas: VistaPreviaDiapositiva[];
}

export interface GoogleSlideResponse {
  presentationId: string;
  title: string;
  slides?: slides_v1.Schema$Page[];
}

// Tipos específicos para la API de Google Slides
export interface GoogleSlidesVideoProperties extends slides_v1.Schema$VideoProperties {
  source?: 'YOUTUBE';
  id?: string;
} 