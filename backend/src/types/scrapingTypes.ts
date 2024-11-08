// src/types/scrapingTypes.ts

export interface ScrapingResult<T> {
    success: boolean;
    data: T | null;
    error?: string;
    timestamp: Date;
    source: string;
    metadata?: Record<string, any>;
  }
  
  export interface ScrapingPlatform {
    authenticate(credentials: Credentials): Promise<boolean>;
    isAuthenticated(): boolean;
    logout(): Promise<void>;
  }
  
  export interface Credentials {
    username: string;
    password: string;
  }
  
  export interface ScrapeOptions {
    useCache?: boolean;
    forceRefresh?: boolean;
    timeout?: number;
    retryAttempts?: number;
  }
  
  export interface ScrapingResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    timestamp: Date;
  }
  
  export interface ScrapingError {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
    retryAfter?: number;
  }
  
  export interface ScrapingMetrics {
    requestCount: number;
    successCount: number;
    failureCount: number;
    averageResponseTime: number;
    cacheHitRate: number;
  }
  
  export interface ScrapingSession {
    sessionId: string;
    platform: string;
    authenticated: boolean;
    startTime: Date;
    lastActivity: Date;
    metrics: ScrapingMetrics;
  }