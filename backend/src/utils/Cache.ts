interface CacheConfig {
    ttl: number;      // Time to live in milliseconds
    checkPeriod: number; // Cleanup check interval in milliseconds
  }
  
  interface CacheEntry<T> {
    value: T;
    expiry: number;
  }
  
  export class Cache {
    private store: Map<string, CacheEntry<any>>;
    private config: CacheConfig;
    private cleanupInterval: NodeJS.Timeout;
  
    constructor(config: CacheConfig) {
      this.store = new Map();
      this.config = config;
      this.cleanupInterval = setInterval(() => this.cleanup(), this.config.checkPeriod);
    }
  
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
      const expiry = Date.now() + (ttl || this.config.ttl);
      this.store.set(key, { value, expiry });
    }
  
    async get<T>(key: string): Promise<T | undefined> {
      const entry = this.store.get(key);
      if (!entry) {
        return undefined;
      }
  
      if (entry.expiry < Date.now()) {
        this.store.delete(key);
        return undefined;
      }
  
      return entry.value as T;
    }
  
    async delete(key: string): Promise<boolean> {
      return this.store.delete(key);
    }
  
    async clear(): Promise<void> {
      this.store.clear();
    }
  
    private cleanup(): void {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.expiry < now) {
          this.store.delete(key);
        }
      }
    }
  
    destroy(): void {
      clearInterval(this.cleanupInterval);
      this.store.clear();
    }
  }