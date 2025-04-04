import { APICache } from './cache';

declare const cacheManagerInstance: APICache;
export { cacheManagerInstance as cacheManager };
export type CacheManager = APICache; 