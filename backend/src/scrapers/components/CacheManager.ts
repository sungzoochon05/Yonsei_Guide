// src/scrapers/components/CacheManager.ts

import { ScrapingResult } from '../../types/backendInterfaces';

interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiry: Date;
}

export class CacheManager {
  private cache: Map<string, any> = new Map();
  private readonly defaultExpiryMinutes: number;
  private readonly maxSize: number;
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(
    defaultExpiryMinutes: number = 30,
    maxSize: number = 1000,
    cleanupIntervalMinutes: number = 5
  ) {
    this.defaultExpiryMinutes = defaultExpiryMinutes;
    this.maxSize = maxSize;
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMinutes * 60 * 1000);
  }

  set<T>(key: string, value: T): void {
    this.cache.set(key, value);
  }

  get<T>(key: string): T | null {
    return this.cache.get(key) || null;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (entry.expiry < new Date()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = new Date();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }

  getStats(): CacheStats {
    const now = new Date();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.cache.values()) {
      if (entry.expiry > now) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      maxSize: this.maxSize,
      defaultExpiryMinutes: this.defaultExpiryMinutes
    };
  }
}

interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  maxSize: number;
  defaultExpiryMinutes: number;
}