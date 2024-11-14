interface CacheItem<T> {
  data: T;
  timestamp: number;
}

interface Cache {
  [key: string]: CacheItem<any>;
}

const TWO_DAYS_MS = 1000 * 60 * 60 * 48; // 48 hours in milliseconds
const cache: Cache = {};

export function getCachedData<T>(key: string, duration: number = TWO_DAYS_MS): T | null {
  const item = cache[key];
  if (!item) return null;

  const isExpired = Date.now() - item.timestamp > duration;
  if (isExpired) {
    delete cache[key];
    return null;
  }

  return item.data;
}

export function setCachedData<T>(key: string, data: T): void {
  cache[key] = {
    data,
    timestamp: Date.now()
  };
}