import { BaseEntity, UUID, Timestamp, JsonConfig, Metadata } from './common';

/**
 * Tipos y definiciones para presentaciones (slides)
 */

/**
 * Tipo base para presentaciones
 */
export interface Slide extends BaseEntity {
  proyecto_id: string;
  google_presentation_id: string;
  google_id?: string;
  titulo: string;
  nombre?: string;
  url?: string;
  ultima_sincronizacion?: string;
  metadata?: Metadata;
  created_at?: string;
  updated_at?: string;
}

/**
 * Tipo para diapositivas
 */
export interface SlideItem extends BaseEntity {
  slides_id: UUID;
  orden?: number;
  titulo?: string;
  configuracion?: JsonConfig;
  diapositiva_id?: string;
  google_presentation_id?: string;
  thumbnail_url?: string;
}

/**
 * Tipo para posición de elementos
 */
export interface ElementPosition {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  rotacion?: number;
}

/**
 * Tipo para elementos de diapositivas
 */
export interface SlideElement extends BaseEntity {
  diapositiva_id: UUID;
  elemento_id: string;
  tipo: string;
  contenido?: string;
  posicion?: ElementPosition;
  estilo?: JsonConfig;
  celda_asociada?: UUID;
  tipo_asociacion?: string;
}

/**
 * Tipo para asociaciones elemento-celda
 */
export interface SlideElementAssociation extends BaseEntity {
  elemento_id: UUID;
  sheets_id: UUID;
  columna: string;
  tipo?: string;
}

/**
 * Parámetros para crear una presentación
 */
export interface SlideCreateParams {
  proyecto_id: UUID;
  google_presentation_id: string;
  google_id?: string;
  slides_id?: string;
  titulo: string;
  nombre?: string;
  url?: string;
  metadata?: Metadata;
}

/**
 * Parámetros para actualizar una presentación
 */
export interface SlideUpdateParams {
  titulo?: string;
  nombre?: string;
  url?: string;
  ultima_sincronizacion?: Timestamp;
  google_id?: string;
  metadata?: Metadata;
}

/**
 * Parámetros para crear una diapositiva
 */
export interface SlideItemCreateParams {
  slides_id: UUID;
  orden?: number;
  titulo?: string;
  configuracion?: JsonConfig;
  diapositiva_id?: string;
  google_presentation_id?: string;
  thumbnail_url?: string;
}

/**
 * Parámetros para actualizar una diapositiva
 */
export interface SlideItemUpdateParams {
  orden?: number;
  titulo?: string;
  configuracion?: JsonConfig;
  diapositiva_id?: string;
  google_presentation_id?: string;
  thumbnail_url?: string;
}

/**
 * Parámetros para crear un elemento de diapositiva
 */
export interface SlideElementCreateParams {
  diapositiva_id: UUID;
  elemento_id: string;
  tipo: string;
  contenido?: string;
  posicion?: ElementPosition;
  estilo?: JsonConfig;
  celda_asociada?: UUID;
  tipo_asociacion?: string;
}

/**
 * Parámetros para actualizar un elemento de diapositiva
 */
export interface SlideElementUpdateParams {
  tipo?: string;
  contenido?: string;
  posicion?: ElementPosition;
  estilo?: JsonConfig;
  celda_asociada?: UUID;
  tipo_asociacion?: string;
}

/**
 * Parámetros para crear una asociación elemento-celda
 */
export interface SlideElementAssociationCreateParams {
  elemento_id: UUID;
  sheets_id: UUID;
  columna: string;
  tipo?: string;
}

/**
 * Opciones para listar presentaciones
 */
export interface SlideListOptions {
  proyecto_id?: string;
  busqueda?: string;
  ordenPor?: 'created_at' | 'updated_at' | 'titulo';
  orden?: 'asc' | 'desc';
  pagina?: number;
  porPagina?: number;
}

/**
 * Opciones para listar diapositivas
 */
export interface SlideItemListOptions {
  slides_id: UUID;
  ordenarPor?: 'orden' | 'titulo';
  orden?: 'asc' | 'desc';
} 