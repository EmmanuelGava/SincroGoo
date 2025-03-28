const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

interface CacheItem<T> {
  data: T
  timestamp: number
}

const cache: { [key: string]: CacheItem<any> } = {}

export const getCacheKey = (type: string, id: string): string => {
  return `${type}_${id}`
}

export const getCacheItem = <T>(key: string): T | null => {
  const item = cache[key]
  if (!item) return null

  if (Date.now() - item.timestamp > CACHE_DURATION) {
    delete cache[key]
    return null
  }

  return item.data as T
}

export const setCacheItem = <T>(key: string, data: T): void => {
  cache[key] = {
    data,
    timestamp: Date.now()
  }
}

export const shouldRefreshCache = (key: string): boolean => {
  const item = cache[key]
  if (!item) return true
  return Date.now() - item.timestamp > CACHE_DURATION
}

export const clearCache = (): void => {
  Object.keys(cache).forEach(key => delete cache[key])
} 