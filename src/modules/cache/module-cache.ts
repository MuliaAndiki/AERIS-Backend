interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class ModuleCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: Timer | null = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup() {
    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let removed = 0;

      for (const [key, entry] of this.store.entries()) {
        if (now > entry.expiresAt) {
          this.store.delete(key);
          removed++;
        }
      }

      if (removed > 0) {
        console.log(`[ModuleCache] Cleaned up ${removed} expired entries`);
      }
    }, 5 * 60 * 1000);
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): T {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });

    return value;
  }

  async getOrSet<T>(
    key: string,
    ttlMs: number,
    producer: () => Promise<T>,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const value = await producer();
    return this.set(key, value, ttlMs);
  }

  deleteByPrefix(prefix: string): number {
    let removed = 0;

    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        removed += 1;
      }
    }

    return removed;
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }

  getStats() {
    return {
      size: this.store.size,
      entries: Array.from(this.store.entries()).map(([key, entry]) => ({
        key,
        expiresIn: Math.max(0, entry.expiresAt - Date.now()),
      })),
    };
  }
}

export const moduleCache = new ModuleCache();

// Cleanup on process exit
process.on('SIGTERM', () => {
  moduleCache.destroy();
});

process.on('SIGINT', () => {
  moduleCache.destroy();
});
