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
  text: string;           // 추가: AI 응답 텍스트
  content: string;        // 기존 content 유지
  error?: string;
  source?: string;
  timestamp: Date;
  data?: ScrapedData[];
  intent?: {
    category: string;
    action: string;
    keywords: string[];
    confidence: number;
    campus?: '신촌' | '원주';
  };
  metadata?: {
    source?: string;
    confidence?: number;
    context?: any;
    suggestedActions?: string[];
    relatedTopics?: string[];
  };
  campus?: '신촌' | '원주';
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
    category: string;      // 추가: 'notice' | 'academic' | 'scholarship' | 'library' | 'facility' | 'lecture' | 'event' | 'career' | 'general'
    priority?: number;
  };
  category: string;        // 추가: 메인 category 속성
  action: string;         // 추가: 'query' | 'request' | 'complaint' | 'suggestion'
  keywords: string[];     // 추가: 주요 키워드 배열
}
export interface ScrapingResultMetadata {
  campus?: '신촌' | '원주';
  updateFrequency?: string;
  reliability?: number;
  reservationId?: string;  // 추가
  message?: string;        // 추가
  learnUsCount?: number;   // 추가
  portalCount?: number;    // 추가
  totalCount?: number;     // 추가
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
  scrapingResults: ScrapingResult<ScrapedData>;
  intent: Intent;
  messageHistory: ChatMessage[];
}
// 서비스 인터페이스 정의
export interface IBackendOpenAIService {
  analyzeIntent(message: string, context: ChatContext): Promise<Intent>;
  generateResponse(message: string, context: OpenAIServiceContext): Promise<OpenAIResponse>;
}

export interface IBackendWebScrapingService {
  fetchData(source: string, campus?: '신촌' | '원주'): Promise<ScrapingResult<ScrapedData>>;
  validateSource(source: string): boolean;
}

// 재사용될 공통 인터페이스들
interface BaseInfo {
  id: string;
  title: string;
  content?: string;
  timestamp: Date;
  campus: '신촌' | '원주';
}

// 강좌 정보 인터페이스
export interface CourseInfo extends BaseInfo {
  name: string;  // name 속성 추가
  professor: string;
  semester: string;
  url: string;
  description?: string;
  credits: number;
  department: string;
  schedule: string[];
  platform: 'learnus' | 'portal';
  timestamp: Date;
  campus: '신촌' | '원주';
}

// 공지사항 인터페이스
export interface NoticeInfo extends BaseInfo {
  author: string;
  date: Date;
  important: boolean;
  views: number;
  attachments: AttachmentInfo[];
  platform: string;
}

// 과제 정보 인터페이스
export interface AssignmentInfo extends BaseInfo {
  description: string;
  dueDate: Date;
  startDate: Date;
  status: AssignmentStatus;
  maxScore: number;
  attachments: AttachmentInfo[];
  platform: string;
}

// 첨부파일 인터페이스
export interface AttachmentInfo {
  id: string;
  name: string;
  url: string;
  size?: number;
  type: string;
}

// 강의실/열람실 정보 인터페이스
export interface RoomInfo {
  id: string;
  name: string;
  capacity: number;
  available: boolean;
  location: string;
  facilities: string[];
  schedule: RoomSchedule[];
}

// 강의실/열람실 스케줄 인터페이스
export interface RoomSchedule {
  day: string;
  startTime: string;
  endTime: string;
  purpose: string;
  organizer?: string;
}

// 과제 상태 타입
export type AssignmentStatus = 'not_submitted' | 'submitted' | 'graded';

// 스크래핑 옵션 인터페이스
export interface ScrapingOptions {
  campus?: '신촌' | '원주';
  count?: number;
  useCache?: boolean;
  forceRefresh?: boolean;
}

// 도서관 응답 인터페이스
export interface LibraryResponse {
  notices: NoticeInfo[];
  status: LibraryStatus[];
  hours: LibraryHours[];
}

interface LibraryStatus {
  id: string;
  type: string;
  capacity: number;
  available: number;
  status: 'open' | 'closed' | 'maintenance';
}

interface LibraryHours {
  facility: string;
  weekday: TimeRange;
  weekend: TimeRange;
  holiday: TimeRange;
}

interface TimeRange {
  open: string;
  close: string;
}

// ScrapingResult를 제네릭 타입으로 수정
export interface ScrapingResult<T> {
  success: boolean;
  data: T;
  timestamp: Date;
  source: string;
  metadata?: ScrapingResultMetadata;
}
export interface PlatformCredentials {
  username: string;
  password: string;
  platform?: string;
}
export interface LibraryPlatform extends CoursePlatform {
  getLibraryResourceStatus(): Promise<LibraryResource>;
}

// BackendWebScrapingService에 필요한 속성과 메서드 추가
export interface IBackendWebScrapingService {
  learnUs: any;
  portalService: any;
  libraryService: any;
  clearCache(): void;
  getStats(): any;
}
export interface NoticeInfo extends BaseInfo {
  author: string;
  date: Date;
  important: boolean;
  views: number;
  attachments: AttachmentInfo[];
  platform: string;
  timestamp: Date;
  campus: '신촌' | '원주';
}

export interface AssignmentInfo extends BaseInfo {
  description: string;
  dueDate: Date;
  startDate: Date;
  status: AssignmentStatus;
  maxScore: number;
  attachments: AttachmentInfo[];
  platform: string;
  timestamp: Date;
  campus: '신촌' | '원주';
}
// ScrapedData 인터페이스에 누락된 필드 추가
export interface ScrapedData {
  id: string;
  type: string;
  content: any;
  timestamp: Date;
  metadata: {
    source: string;
    campus?: '신촌' | '원주';
    category?: string;
    confidence?: number;
  };
}
// Platform 인터페이스들 추가
export interface CoursePlatform {
  authenticate(credentials: PlatformCredentials): Promise<boolean>;
  isAuthenticated(): boolean;
  logout(): Promise<void>;
}
// 서버 응답 인터페이스
export interface ServerResponse<T> {
  success: boolean;
  data: T;
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

// 채팅 응답 데이터 인터페이스
export interface ChatResponseData {
  response: string;
  intent: Intent;
  scrapedData: ScrapedData[];
  timestamp: Date;
  campus: '신촌' | '원주';
}

export interface IBackendWebScrapingService {
  fetchData(source: string, campus?: '신촌' | '원주'): Promise<ScrapingResult<ScrapedData>>;
  validateSource(source: string): boolean;
  scrapeByCategory(category: string, options?: { campus?: '신촌' | '원주'; count?: number }): Promise<ScrapingResult<ScrapedData[]>>;
}

export interface Config {
  baseUrl: string;
  endpoints: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
  retryCount?: number;
}

// ScrapingConfig 인터페이스 추가
export interface ScrapingConfig {
  baseUrl: string;
  endpoints: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
  retryCount?: number;
  campus?: '신촌' | '원주';
  type?: string;
  limit?: number;
}