import { BaseEntity, UUID, Timestamp, JsonConfig, Metadata, PaginationOptions } from './common';

/**
 * Tipos y definiciones para hojas de cálculo (sheets)
 */

// Tipos de celda válidos
export type CellType = 'texto' | 'numero' | 'formula' | 'fecha' | 'boolean' | 'imagen';

// Tipos de alineación
export type TextAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';

/**
 * Tipo base para hojas de cálculo
 */
export interface Sheet extends BaseEntity {
  proyecto_id: UUID;
  sheets_id: string;      // ID de Google Sheets
  nombre?: string;
  titulo?: string;
  google_id?: string;
  url?: string;
  ultima_sincronizacion?: Timestamp;
  columnas?: number;
  filas?: number;
  activa?: boolean;
  metadata?: Metadata;
  created_at: Timestamp;
  updated_at?: Timestamp;
}

/**
 * Tipo para el estilo de una celda
 */
export interface CeldaEstilo {
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: TextAlign;
  verticalAlign?: VerticalAlign;
  fontSize?: string;
  fontFamily?: string;
  border?: string;
}

/**
 * Tipo para celdas de hojas de cálculo
 */
export interface SheetCell extends BaseEntity {
  sheet_id: UUID;
  fila: number;
  columna: string;
  referencia_celda: string;  // A1, B2, etc.
  contenido?: string;
  tipo?: CellType;
  formato?: JsonConfig;
  estilo?: CeldaEstilo;
  valor?: string | number | null;
  formula?: string;
  created_at: Timestamp;
  updated_at?: Timestamp;
}

/**
 * Tipo para columnas
 */
export interface Columna extends BaseEntity {
  sheet_id: UUID;
  indice: number;
  nombre: string;
  tipo: CellType | 'otro';
  ancho?: number;
  visible?: boolean;
  formato?: JsonConfig;
}

/**
 * Tipo para configuración de proyecto
 */
export interface ConfiguracionProyecto extends BaseEntity {
  configuracion?: JsonConfig;
  proyecto_id?: UUID;
}

/**
 * Tipo para las asociaciones entre celdas y elementos
 */
export interface Asociacion extends BaseEntity {
  elemento_id: UUID;
  celda_id: UUID;
  tipo_asociacion: 'texto' | 'imagen' | 'grafico' | 'otro';
}

/**
 * Parámetros para crear una hoja de cálculo
 */
export interface SheetCreateParams {
  proyecto_id: UUID;
  sheets_id: string;      // ID de Google Sheets
  nombre?: string;
  titulo?: string;
  google_id?: string;
  url?: string;
  metadata?: Metadata;
}

/**
 * Parámetros para actualizar una hoja de cálculo
 */
export interface SheetUpdateParams {
  nombre?: string;
  titulo?: string;
  ultima_sincronizacion?: Timestamp;
  google_id?: string;
  url?: string;
  metadata?: Metadata;
  last_sync?: string;
}

/**
 * Parámetros para crear una celda
 */
export interface SheetCellCreateParams {
  sheet_id: UUID;
  fila: number;
  columna: string;
  referencia_celda: string;
  contenido?: string;
  tipo?: CellType;
  formato?: JsonConfig;
  estilo?: CeldaEstilo;
  valor?: string | number | null;
  formula?: string;
}

/**
 * Parámetros para actualizar una celda
 */
export interface SheetCellUpdateParams {
  contenido?: string;
  tipo?: CellType;
  formato?: JsonConfig;
  estilo?: CeldaEstilo;
  valor?: string | number | null;
  formula?: string;
}

/**
 * Opciones para listar hojas de cálculo
 */
export interface SheetListOptions extends PaginationOptions {
  proyecto_id?: UUID;
  busqueda?: string;
  ordenPor?: 'created_at' | 'updated_at' | 'titulo';
  orden?: 'asc' | 'desc';
  pagina?: number;
  porPagina?: number;
}

/**
 * Opciones para listar celdas
 */
export interface SheetCellListOptions {
  sheet_id: UUID;
  filaInicio?: number;
  filaFin?: number;
  columnas?: string[];
} 