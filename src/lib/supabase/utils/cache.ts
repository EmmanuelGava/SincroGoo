import { createServiceError, ErrorType } from './error-handler';

/**
 * Tiempos de caché predeterminados (en segundos)
 */
export const CACHE_TIMES = {
  SHORT: 60, // 1 minuto
  MEDIUM: 300, // 5 minutos
  LONG: 3600, // 1 hora
  DAY: 86400 // 1 día
} as const;

export type CacheTime = keyof typeof CACHE_TIMES;

/**
 * Estructura para los items del caché
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number; // Tiempo en segundos
  tags?: string[]; // Tags para agrupar items relacionados
}

/**
 * Opciones para el caché
 */
interface CacheOptions {
  expiry?: number;
  tags?: string[];
  forceRefresh?: boolean;
}

/**
 * Almacén local para el caché
 */
const cacheStore = new Map<string, CacheItem<any>>();

/**
 * Genera una clave de caché estandarizada
 * @param prefix Prefijo para categorizar el item
 * @param id Identificador único
 * @param params Parámetros adicionales
 * @returns Clave formateada
 */
export function getCacheKey(prefix: string, id?: string | number, params?: Record<string, any>): string {
  const parts = [prefix];
  
  if (id !== undefined) {
    parts.push(String(id));
  }
  
  if (params) {
    const paramsStr = Object.entries(params)
      .filter(([_, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join('&');
    
    if (paramsStr) {
      parts.push(paramsStr);
    }
  }
  
  return parts.join(':');
}

/**
 * Obtiene un elemento del caché
 * @param key Clave del elemento
 * @param options Opciones de caché
 * @returns Elemento del caché o undefined si no existe o expiró
 */
export function getCacheItem<T>(key: string, options: CacheOptions = {}): T | undefined {
  if (options.forceRefresh) {
    cacheStore.delete(key);
    return undefined;
  }

  const item = cacheStore.get(key);
  
  if (!item) return undefined;
  
  const now = Date.now();
  const expireTime = item.timestamp + (item.expiry * 1000);
  
  if (now > expireTime) {
    cacheStore.delete(key);
    return undefined;
  }
  
  return item.data;
}

/**
 * Almacena un elemento en el caché
 * @param key Clave del elemento
 * @param data Datos a almacenar
 * @param options Opciones de caché
 */
export function setCacheItem<T>(
  key: string,
  data: T,
  options: CacheOptions = {}
): void {
  const { expiry = CACHE_TIMES.MEDIUM, tags = [] } = options;

  if (expiry <= 0) {
    throw createServiceError(
      'El tiempo de expiración debe ser mayor a 0',
      ErrorType.VALIDATION
    );
  }

  cacheStore.set(key, {
    data,
    timestamp: Date.now(),
    expiry,
    tags
  });
}

/**
 * Verifica si se debe refrescar un item basado en su tiempo en caché
 * @param key Clave del elemento
 * @param threshold Umbral en segundos (tiempo mínimo para considerar refrescar)
 * @returns true si se debe refrescar, false en caso contrario
 */
export function shouldRefreshCache(key: string, threshold = CACHE_TIMES.MEDIUM / 2): boolean {
  const item = cacheStore.get(key);
  
  if (!item) return true;
  
  const now = Date.now();
  const itemAge = (now - item.timestamp) / 1000;
  
  return itemAge > threshold;
}

/**
 * Invalida elementos del caché por tags
 * @param tags Tags a invalidar
 */
export function invalidateByTags(tags: string[]): void {
  if (!tags.length) return;

  Array.from(cacheStore.entries()).forEach(([key, item]) => {
    if (item.tags?.some(tag => tags.includes(tag))) {
      cacheStore.delete(key);
    }
  });
}

/**
 * Limpia elementos expirados del caché
 */
export function cleanupCache(): void {
  const now = Date.now();
  
  Array.from(cacheStore.entries()).forEach(([key, item]) => {
    const expireTime = item.timestamp + (item.expiry * 1000);
    if (now > expireTime) {
      cacheStore.delete(key);
    }
  });
}

/**
 * Obtiene estadísticas del caché
 */
export function getCacheStats() {
  const now = Date.now();
  const stats = {
    total: cacheStore.size,
    expired: 0,
    active: 0,
    byTag: new Map<string, number>()
  };

  cacheStore.forEach(item => {
    const isExpired = now > item.timestamp + (item.expiry * 1000);
    if (isExpired) {
      stats.expired++;
    } else {
      stats.active++;
      item.tags?.forEach(tag => {
        stats.byTag.set(tag, (stats.byTag.get(tag) || 0) + 1);
      });
    }
  });

  return stats;
}

// Limpieza automática del caché cada 15 minutos
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, 15 * 60 * 1000);
} 