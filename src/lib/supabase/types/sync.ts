/**
 * Tipos y definiciones para el servicio de sincronización
 */

import { ElementPosition } from './slides';
import { CellType } from './sheets';

/**
 * Estado de las tablas de la base de datos
 */
export interface TablesStatus {
  [key: string]: boolean;
}

/**
 * Estado de las funciones RPC
 */
export interface RPCFunctionsStatus {
  [key: string]: boolean;
}

/**
 * Resultado de la inicialización de la base de datos
 */
export interface DatabaseInitResult {
  tables: TablesStatus;
  rpcFunctions: RPCFunctionsStatus;
}

/**
 * Datos de celda para sincronización
 */
export interface SyncSheetCell {
  row: number;
  column: string;
  reference: string;
  content: string;
  type?: CellType;
  format?: Record<string, any>;
}

/**
 * Datos de elemento para sincronización
 */
export interface SyncSlideElement {
  elementId: string;
  type: string;
  content?: string;
  position?: ElementPosition;
  style?: Record<string, any>;
}

/**
 * Datos de hoja de cálculo para sincronización
 */
export interface SyncSheet {
  googleId: string;
  title: string;
  cells: SyncSheetCell[];
}

/**
 * Datos de presentación para sincronización
 */
export interface SyncSlide {
  googleId: string;
  title: string;
  elements: SyncSlideElement[];
}

/**
 * Parámetros para sincronización de proyecto
 */
export interface SyncProjectParams {
  projectId: string;
  sheets: SyncSheet[];
  slides: SyncSlide[];
}

/**
 * Resultado de sincronización de proyecto
 */
export interface SyncProjectResult {
  sheets: { [googleId: string]: string };
  slides: { [googleId: string]: string };
  cells: number;
  elements: number;
  associations: number;
}

/**
 * Parámetros para sincronización de asociaciones
 */
export interface SyncAssociationsParams {
  sheetId: string;
  elements: Array<{
    elementId: string;
    cellId?: string;
    type?: string;
    config?: Record<string, any>;
  }>;
  rowId?: string;
  deleteExisting?: boolean;
}

/**
 * Resultado de sincronización de asociaciones
 */
export interface SyncAssociationsResult {
  created: number;
  updated: number;
  deleted: number;
  errors: Array<{
    message: string;
    details: string;
  }>;
}

/**
 * Estado de sincronización
 */
export interface SyncStatus {
  in_progress: boolean;
  last_sync?: string;
  pending_items: number;
  failed_items: number;
  cancelled_at?: string;
}

/**
 * Historial de sincronización
 */
export interface SyncHistory {
  id: string;
  project_id: string;
  type: 'sheets' | 'slides';
  status: 'success' | 'failed' | 'cancelled';
  details: Record<string, any>;
  created_at: string;
  updated_at?: string;
} 