/**
 * Bounded in-memory cache with time-to-live (TTL) expiration and capacity capping.
 */

export const AQI_CACHE_TTL_MS = 15 * 60 * 1000;
export const DEFAULT_MAX_CACHE_ENTRIES = 200;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * In-memory TTL cache with FIFO eviction when maxEntries threshold is reached.
 */
export class TtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;

  constructor(
    defaultTtlMs: number = AQI_CACHE_TTL_MS,
    maxEntries: number = DEFAULT_MAX_CACHE_ENTRIES
  ) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number = this.defaultTtlMs): void {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
