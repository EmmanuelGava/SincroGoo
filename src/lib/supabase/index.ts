/**
 * Punto de entrada unificado para la capa de Supabase
 * Exporta todos los clientes, servicios, tipos y utilidades necesarios
 */

// Exportar clientes
import { supabase, getSupabaseClient } from './client';

// Importar servicios
import { authService } from './services/auth';
import { projectsService } from './services/projects';
import { slidesService } from './services/slides';
import { sheetsService } from './services/sheets';
import { syncService } from './services/sync';

// Exportar todo
export {
  // Clientes
  supabase,
  getSupabaseClient,
  
  // Servicios
  authService,
  projectsService,
  slidesService,
  sheetsService,
  syncService
};

// Exportar tipos
export * from './types/common';
export * from './types/auth';
export * from './types/projects';
export * from './types/sheets';
export * from './types/slides';
export * from './types/sync';

// Exportar utilidades
export { handleError, handleErrorFormatted, formatErrorResponse } from './utils/error-handler';
export { 
  getCacheKey,
  getCacheItem,
  setCacheItem,
  shouldRefreshCache,
  invalidateByTags,
  cleanupCache,
  getCacheStats,
  CACHE_TIMES
} from './utils/cache';
export { 
  applyQueryOptions,
  applyPagination,
  applyOrder,
  getCount,
  selectFields,
  type FilterOperator,
  type FilterValue,
  type FilterCondition
} from './utils/queries';

// Mensaje de depuración (eliminar en producción)
if (process.env.NODE_ENV === 'development') {
  console.log('🔄 Cargando módulo @/lib/supabase');
  console.log('✅ Servicios disponibles:', [
    'authService',
    'projectsService',
    'sheetsService',
    'slidesService',
    'syncService'
  ]);
  console.log('✅ Utilidades disponibles:', [
    'handleError',
    'handleErrorFormatted',
    'formatErrorResponse',
    'getCacheKey',
    'getCacheItem',
    'setCacheItem',
    'shouldRefreshCache',
    'invalidateByTags',
    'cleanupCache',
    'getCacheStats',
    'applyQueryOptions',
    'applyPagination',
    'applyOrder',
    'getCount',
    'selectFields'
  ]);
} 