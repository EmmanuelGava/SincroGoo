import { CacheEntry } from '@/types/servicios';

export class APICache {
  private static instance: APICache;
  private cache: Map<string, { data: any; expiry: number }>;

  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): APICache {
    if (!this.instance) {
      this.instance = new APICache();
    }
    return this.instance;
  }

  public get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  public set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs
    });
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }
}
