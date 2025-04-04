/**
 * Tipos y definiciones para proyectos
 */

/**
 * Tipo base para proyectos
 */
export interface Project {
  id: string;
  nombre: string;
  descripcion?: string;
  usuario_id: string;
  presentacion_id?: string;  // slides_id en la versión antigua
  hoja_calculo_id?: string;  // sheets_id en la versión antigua
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

/**
 * Parámetros para crear un proyecto
 */
export interface ProjectCreateParams {
  nombre: string;
  descripcion?: string;
  usuario_id: string;
  presentacion_id?: string;
  hoja_calculo_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Parámetros para actualizar un proyecto
 */
export interface ProjectUpdateParams {
  nombre?: string;
  descripcion?: string;
  presentacion_id?: string;
  hoja_calculo_id?: string;
  metadata?: Record<string, any>;
  last_sync?: string;
}

/**
 * Proyecto con relaciones cargadas
 */
export interface ProjectWithRelations extends Project {
  presentacion?: {
    id: string;
    nombre: string;
    url?: string;
    thumbnail_url?: string;
  };
  hoja_calculo?: {
    id: string;
    nombre: string;
    url?: string;
  };
}

/**
 * Opciones para listar proyectos
 */
export interface ProjectListOptions {
  usuario_id?: string;
  busqueda?: string;
  ordenPor?: 'created_at' | 'updated_at' | 'nombre';
  orden?: 'asc' | 'desc';
  pagina?: number;
  porPagina?: number;
} 