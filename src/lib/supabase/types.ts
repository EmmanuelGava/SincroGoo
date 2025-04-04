/**
 * Definiciones de tipos centralizadas para la capa de Supabase
 * Este archivo contiene todos los tipos e interfaces utilizados en los servicios de Supabase
 */

// Tipos de Authentication
export interface User {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Session {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: User;
}

export interface AuthSignUpParams {
  email: string;
  password: string;
  name?: string;
}

export interface AuthSignInParams {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  session: Session;
}

// Tipos de Projects
export interface Project {
  id: string;
  nombre?: string;
  titulo?: string;
  descripcion?: string;
  usuario_id: string;
  slides_id?: string;
  sheets_id?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface ProjectCreateParams {
  nombre: string;
  descripcion?: string;
  usuario_id: string;
}

export interface ProjectUpdateParams {
  nombre?: string;
  descripcion?: string;
  slides_id?: string;
  sheets_id?: string;
}

// Tipos de Sheets
export interface Sheet {
  id: string;
  nombre: string;
  proyecto_id?: string;
  googleId?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface SheetCreateParams {
  nombre: string;
  proyecto_id: string;
  googleId?: string;
}

export interface SheetUpdateParams {
  nombre?: string;
  googleId?: string;
}

export interface Cell {
  id: string;
  sheet_id: string;
  fila: number;
  columna: string;
  valor: any;
  tipo?: string;
  formato?: any;
}

export interface CellCreateParams {
  sheet_id: string;
  fila: number;
  columna: string;
  valor: any;
  tipo?: string;
  formato?: any;
}

export interface CellUpdateParams {
  valor?: any;
  tipo?: string;
  formato?: any;
}

// Tipos de Slides
export interface Slide {
  id: string;
  nombre: string;
  proyecto_id?: string;
  googleId?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface SlideCreateParams {
  nombre: string;
  proyecto_id: string;
  googleId?: string;
}

export interface SlideUpdateParams {
  nombre?: string;
  googleId?: string;
}

export interface Element {
  id: string;
  diapositiva_id: string;
  tipo: string;
  contenido: string;
  posicion?: Record<string, any>;
  estilo?: Record<string, any>;
}

export interface ElementCreateParams {
  diapositiva_id: string;
  tipo: string;
  contenido: string;
  posicion?: Record<string, any>;
  estilo?: Record<string, any>;
}

export interface ElementUpdateParams {
  tipo?: string;
  contenido?: string;
  posicion?: Record<string, any>;
  estilo?: Record<string, any>;
}

// Tipos para el editor
export interface ElementoDiapositiva {
  id: string;
  idDiapositiva?: string;
  tipo: string;
  contenido: string;
  posicion?: any;
  estilo?: any;
  columnaAsociada?: string;
  tipoAsociacion?: string;
  modificado?: boolean;
}

export interface VistaPreviaDiapositiva {
  id: string;
  titulo: string;
  thumbnailUrl?: string;
  elementos?: ElementoDiapositiva[];
}

export interface FilaSeleccionada {
  id: string;
  indice?: number;
  numeroFila?: number;
  valores: { [key: string]: any };
}

export interface FilaHoja {
  id: string;
  numeroFila: number;
  valores: { [key: string]: any };
  ultimaActualizacion: Date;
}

export interface CambioPrevio {
  id: string;
  tipoElemento: string;
  contenidoAnterior: string;
  contenidoNuevo: string;
  timestamp: Date;
}

// Tipos de Sync
export interface Association {
  id: string;
  elemento_id: string;
  diapositiva_id: string;
  presentacion_id: string;
  sheet_id: string;
  columna: string;
  tipo: string;
  fecha_creacion?: string;
}

export interface AssociationCreateParams {
  elemento_id: string;
  diapositiva_id: string;
  presentacion_id: string;
  sheet_id: string;
  columna: string;
  tipo: string;
}

export interface SyncElementsParams {
  slideId: string;
  sheetId: string;
  elements: ElementoDiapositiva[];
}

export interface SyncResult {
  success: boolean;
  createdAssociations: number;
  updatedAssociations: number;
  deletedAssociations: number;
  errors?: string[];
}

// Tipos de servicios
export interface ResultadoServicio<T> {
  exito: boolean;
  datos?: T;
  error?: string;
  advertencia?: string;
  codigo?: number;
  timestamp?: Date;
} 