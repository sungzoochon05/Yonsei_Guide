// src/scrapers/components/CacheManager.ts

import { ScrapingResult } from '../../types/backendInterfaces';

interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiry: Date;
}

export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
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

  set<T>(
    key: string,
    data: T,
    expiryMinutes: number = this.defaultExpiryMinutes
  ): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime())[0][0];
      this.cache.delete(oldestKey);
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + expiryMinutes * 60 * 1000);
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiry
    });
  }

  get<T>(key: string): ScrapingResult<T> | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (entry.expiry < new Date()) {
      this.cache.delete(key);
      return null;
    }

    return {
      success: true,
      data: entry.data,
      timestamp: entry.timestamp,
      source: 'cache'
    };
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