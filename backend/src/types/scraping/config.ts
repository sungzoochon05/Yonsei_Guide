import { Campus, ContentCategory, CacheOptions } from './common';

// 스크래핑 설정 관련 타입 정의
export interface ScrapingConfig {
  // 기본 설정
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  userAgent: string;
  campus: Campus;
  
  // 캐시 설정
  cache: CacheOptions & {
    enabled: boolean;
    storage: 'memory' | 'redis' | 'file';
    prefix?: string;
  };

  // 로깅 설정
  logging: {
    enabled: boolean;
    level: 'error' | 'warn' | 'info' | 'debug';
    format: 'json' | 'text';
    destination: 'console' | 'file';
    filename?: string;
  };

  // HTTP 클라이언트 설정
  http: {
    headers: Record<string, string>;
    followRedirects: boolean;
    maxRedirects: number;
    validateStatus: (status: number) => boolean;
    decompress: boolean;
  };

  // 프록시 설정
  proxy?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };

  // 인증 설정
  auth?: {
    type: 'basic' | 'token' | 'sso';
    credentials?: {
      username?: string;
      password?: string;
      token?: string;
    };
    endpoints?: {
      login: string;
      logout: string;
      refresh: string;
    };
  };

  // 리소스 제한 설정
  limits: {
    maxConcurrentRequests: number;
    maxRequestsPerSecond: number;
    maxContentLength: number;
    maxRedirects: number;
  };

  // 카테고리별 설정
  categoryConfig: {
    [K in ContentCategory]?: {
      enabled: boolean;
      endpoint: string;
      priority: number;
      cacheOptions?: Partial<CacheOptions>;
    };
  };

  // 에러 처리 설정
  errorHandling: {
    retryableErrors: string[];
    retryStrategy: 'linear' | 'exponential';
    fallbackBehavior: 'cache' | 'empty' | 'error';
    silentFail: boolean;
  };

  // 파서 설정
  parser: {
    encoding: string;
    removeScripts: boolean;
    removeStyles: boolean;
    decodeEntities: boolean;
    normalizeWhitespace: boolean;
  };

  // 필터 설정
  filters: {
    excludePatterns: RegExp[];
    includePatterns: RegExp[];
    minContentLength: number;
    maxContentLength: number;
  };

  // 캠퍼스별 설정
  campusConfig: {
    [K in Campus]: {
      baseUrl: string;
      endpoints: Record<string, string>;
      headers?: Record<string, string>;
    };
  };
}

// 설정 유효성 검사 인터페이스
export interface ConfigValidation {
  validate(config: Partial<ScrapingConfig>): boolean;
  getErrors(): string[];
  getWarnings(): string[];
}

// 기본 설정 값
export const DEFAULT_CONFIG: Partial<ScrapingConfig> = {
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  userAgent: 'YonseiScraper/1.0',
  
  cache: {
    enabled: true,
    storage: 'memory',
    ttl: 300000, // 5분
  },

  logging: {
    enabled: true,
    level: 'info',
    format: 'json',
    destination: 'console',
  },

  limits: {
    maxConcurrentRequests: 5,
    maxRequestsPerSecond: 10,
    maxContentLength: 5242880, // 5MB
    maxRedirects: 5,
  },

  parser: {
    encoding: 'utf-8',
    removeScripts: true,
    removeStyles: true,
    decodeEntities: true,
    normalizeWhitespace: true,
  }
};