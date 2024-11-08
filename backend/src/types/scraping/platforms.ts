import { AuthCredentials } from '../backendInterfaces';

export interface ScrapingConfig {
  baseUrl: string;
  endpoints: {
    [key: string]: string;
  };
  headers?: Record<string, string>;
  timeout?: number;
  retryCount?: number;
  campus?: '신촌' | '원주';
  auth?: {
    required: boolean;
    type: 'cookie' | 'token' | 'basic';
    endpoint?: string;
  };
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  caching?: {
    enabled: boolean;
    ttl: number;
  };
}

export interface PlatformConfig {
  portal: ScrapingConfig;
  learnUs: ScrapingConfig;
  library: ScrapingConfig;
}

export interface ScrapingCredentials extends AuthCredentials {
  platform: keyof PlatformConfig;
  campus?: '신촌' | '원주';
}

export const defaultConfig: PlatformConfig = {
  portal: {
    baseUrl: 'https://portal.yonsei.ac.kr',
    endpoints: {
      login: '/login',
      notices: '/notices',
      academic: '/academic',
      schedule: '/schedule',
      grades: '/grades',
      registration: '/course-registration',
      personal: '/personal-info',
      certificates: '/certificates'
    },
    timeout: 10000,
    retryCount: 3,
    auth: {
      required: true,
      type: 'cookie',
      endpoint: '/auth/login'
    },
    rateLimit: {
      maxRequests: 100,
      windowMs: 60000
    },
    caching: {
      enabled: true,
      ttl: 300000 // 5 minutes
    }
  },
  learnUs: {
    baseUrl: 'https://learn.yonsei.ac.kr',
    endpoints: {
      courses: '/courses',
      assignments: '/assignments',
      announcements: '/announcements',
      materials: '/materials',
      discussions: '/discussions',
      grades: '/grades',
      attendance: '/attendance',
      zoom: '/zoom-meetings'
    },
    timeout: 10000,
    retryCount: 3,
    auth: {
      required: true,
      type: 'token',
      endpoint: '/api/auth/login'
    },
    rateLimit: {
      maxRequests: 150,
      windowMs: 60000
    },
    caching: {
      enabled: true,
      ttl: 600000 // 10 minutes
    }
  },
  library: {
    baseUrl: 'https://library.yonsei.ac.kr',
    endpoints: {
      search: '/search',
      myLibrary: '/my-library',
      loans: '/loans',
      availability: '/availability',
      databases: '/databases',
      rooms: '/study-rooms',
      holdings: '/holdings',
      reservations: '/book-reservations'
    },
    timeout: 10000,
    retryCount: 3,
    auth: {
      required: true,
      type: 'token',
      endpoint: '/api/auth'
    },
    rateLimit: {
      maxRequests: 200,
      windowMs: 60000
    },
    caching: {
      enabled: true,
      ttl: 1800000 // 30 minutes
    }
  }
};

export interface ScrapingSession {
  platform: keyof PlatformConfig;
  authToken?: string;
  cookies?: string[];
  lastAccess: Date;
  requestCount: number;
  campus: '신촌' | '원주';
}

export interface ScrapingOptions {
  timeout?: number;
  retryCount?: number;
  force?: boolean; // Force refresh cache
  priority?: 'high' | 'normal' | 'low';
  campus?: '신촌' | '원주';
}

export type ScrapingEndpoint = keyof typeof defaultConfig.portal.endpoints | 
                              keyof typeof defaultConfig.learnUs.endpoints |
                              keyof typeof defaultConfig.library.endpoints;