import { APICache } from './cache';

const cacheManagerInstance = APICache.getInstance();
export { cacheManagerInstance as cacheManager };
export type CacheManager = APICache; 