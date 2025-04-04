// Caché en memoria simple
const cache = new Map<string, { data: any; timestamp: number }>();

// Tiempo de expiración del caché (5 minutos)
const CACHE_EXPIRY = 5 * 60 * 1000;

export function getCacheKey(key: string): string {
  return `cache_${key}`;
}

export function getCacheItem<T>(key: string): T | null {
  const cacheKey = getCacheKey(key);
  const item = cache.get(cacheKey);
  
  if (!item) return null;
  
  // Verificar si el ítem ha expirado
  if (Date.now() - item.timestamp > CACHE_EXPIRY) {
    cache.delete(cacheKey);
    return null;
  }
  
  return item.data as T;
}

export function setCacheItem<T>(key: string, data: T): void {
  const cacheKey = getCacheKey(key);
  cache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
}

export function shouldRefreshCache(key: string): boolean {
  const item = cache.get(getCacheKey(key));
  if (!item) return true;
  
  return Date.now() - item.timestamp > CACHE_EXPIRY;
} 