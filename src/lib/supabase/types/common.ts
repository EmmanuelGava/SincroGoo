// Tipos de error personalizados
export interface ServiceError {
  message: string;
  originalError?: unknown;
  code?: string;
  status?: number;
}

// Resultado genérico para servicios
export interface ServiceResult<T> {
  data?: T;
  error?: ServiceError;
  status: 'success' | 'error';
}

// Tipos de respuesta paginada
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Opciones de paginación
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

// Opciones de filtrado
export interface FilterOptions {
  [key: string]: any;
}

// Opciones para consulta
export interface QueryOptions extends PaginationOptions {
  filters?: FilterOptions;
  search?: string;
  includeDeleted?: boolean;
}

// Tipos comunes para campos de base de datos
export type UUID = string;
export type Timestamp = string;

// Campos base para todas las entidades
export interface BaseEntity {
  id: UUID;
  fecha_creacion?: Timestamp;
  fecha_actualizacion?: Timestamp;
}

// Tipo para configuraciones JSON
export type JsonConfig = {
  [key: string]: any;
}

// Tipo para metadatos
export type Metadata = {
  [key: string]: any;
} 