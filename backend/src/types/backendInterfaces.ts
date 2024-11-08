// Auth 관련 타입
export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthSession {
  userId: string;
  campus: '신촌' | '원주';
  permissions: string[];
  expiresAt: Date;
}

// Chat 관련 타입
export type ChatRole = 'user' | 'assistant';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'error';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  metadata?: {
    sourceSystem?: string;
    confidence?: number;
    processingTime?: number;
  }
}

export interface ChatResponse {
  content: string;
  metadata?: {
    source?: string;
    confidence?: number;
    context?: any;
    suggestedActions?: string[];
    relatedTopics?: string[];
  }
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  context: ChatContext;
  metadata: {
    createdAt: Date;
    lastActive: Date;
    messageCount: number;
    platform: string;
    deviceInfo?: string;
  }
}


export interface ScrapingError {
  code: string;
  message: string;
  source: string;
  timestamp: Date;
  details?: {
    url?: string;
    statusCode?: number;
    responseBody?: string;
    headers?: Record<string, string>;
  };
  retryCount?: number;
  critical?: boolean;
}

// 시스템 에러 타입들
export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeout: number,
    public readonly operation: string
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly system: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ScrapingTimeoutError extends TimeoutError {
  constructor(
    message: string,
    timeout: number,
    public readonly source: string,
    public readonly url: string
  ) {
    super(message, timeout, 'scraping');
    this.name = 'ScrapingTimeoutError';
  }
}

// 플랫폼 특화 타입들
export interface PortalNotification {
  id: string;
  title: string;
  content: string;
  category: string;
  publishedAt: Date;
  importance: 'high' | 'medium' | 'low';
  attachments?: {
    name: string;
    url: string;
    size?: number;
  }[];
}

export interface LearnUsAssignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: Date;
  submissionStatus: 'pending' | 'submitted' | 'graded' | 'late';
  grade?: {
    score?: number;
    feedback?: string;
    gradedAt?: Date;
  };
}

export interface LibraryResource {
  id: string;
  title: string;
  author: string;
  publisher: string;
  year: number;
  location: string;
  status: 'available' | 'borrowed' | 'reserved';
  dueDate?: Date;
  campus: '신촌' | '원주';
  category: string;
  callNumber: string;
}

// API Response 타입들
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: Date;
    requestId: string;
    processingTime: number;
  };
}

// 설정 및 환경 타입들
export interface SystemConfig {
  environment: 'development' | 'production' | 'test';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  timeout: {
    default: number;
    scraping: number;
    ai: number;
  };
  retryPolicy: {
    maxAttempts: number;
    backoffMs: number;
  };
  cache: {
    ttl: number;
    checkPeriod: number;
  };
}

// 모니터링 및 로깅 타입들
export interface SystemMetrics {
  timestamp: Date;
  service: string;
  metrics: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    cpuUsage: number;
    memoryUsage: number;
  };
  alerts?: {
    level: 'warning' | 'critical';
    message: string;
    timestamp: Date;
  }[];
}

export interface ScrapedData {
  id: string;
  type: string;
  content: any;
  title?: string;  // 추가
  timestamp: Date; // 추가
  metadata: {
    source: string;
    timestamp: Date;
    campus?: '신촌' | '원주';
    category?: string;
    confidence?: number;
  };
  meta?: {  // 추가
    [key: string]: any;
  }
}

export interface Intent {
  requiresDataFetch: boolean;
  dataSources: string[];
  confidence: number;
  suggestedActions: string[];
  metadata?: {
    category?: string;
    priority?: number;
  }
}

export interface ScrapingResult {
  source: string;
  data: any;
  timestamp: Date;
  metadata?: {
    campus?: '신촌' | '원주';
    updateFrequency?: string;
    reliability?: number;
  }
}

export interface OpenAIResponse {
  content: string;
  metadata?: {
    confidence?: number;
    context?: any;
    suggestedActions?: string[];
    source?: string;
    processingTime?: number;
    relatedTopics?: string[];  // 추가
  }
}
export interface ChatContext {
  campus?: '신촌' | '원주';
  lastUpdate?: Date;
  preferences?: Record<string, any>;
  currentTopic?: string;
  activeServices?: string[];
  lastAccessedSystems?: string[];
}

// OpenAI 서비스의 컨텍스트 타입 정의
export interface OpenAIServiceContext {
  campus?: '신촌' | '원주';
  lastUpdate?: Date;
  preferences?: Record<string, any>;
  currentTopic?: string;
  activeServices?: string[];
  lastAccessedSystems?: string[];
  scrapingResults: ScrapingResult[];
  intent: Intent;
  messageHistory: ChatMessage[];
}
// 서비스 인터페이스 정의
export interface IBackendOpenAIService {
  analyzeIntent(message: string, context: ChatContext): Promise<Intent>;
  generateResponse(message: string, context: OpenAIServiceContext): Promise<OpenAIResponse>;
}

export interface IBackendWebScrapingService {
  fetchData(source: string, campus?: '신촌' | '원주'): Promise<ScrapingResult>;
  validateSource(source: string): boolean;
}