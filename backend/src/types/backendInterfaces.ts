// 기본 타입 정의
export type Campus = '신촌' | '원주';
export type Platform = 'learnus' | 'portal' | 'library';
export type DataCategory = 'notice' | 'academic' | 'scholarship' | 'library' | 'facility' | 'lecture' | 'event' | 'career' | 'general';
export type AssignmentStatus = 'not_submitted' | 'submitted' | 'graded';

// 기본 인터페이스
export interface BaseInfo {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  campus: Campus;
}

// 설정 관련 인터페이스
export interface Config {
  baseUrl: string;
  endpoints: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
  retryCount?: number;
  campus?: Campus;
}

export interface ScrapingConfig extends Config {
  type?: string;
  limit?: number;
}

// 인증 관련 인터페이스
export interface AuthCredentials {
  username: string;
  password: string;
  platform?: Platform;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// 첨부파일 인터페이스
export interface AttachmentInfo {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

// 강좌 관련 인터페이스
export interface CourseInfo extends BaseInfo {
  name: string;
  professor: string;
  semester: string;
  url: string;
  description?: string;
  credits: number;
  department: string;
  schedule: string[];
  platform: 'learnus' | 'portal';
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

// 과제 인터페이스
export interface AssignmentInfo extends BaseInfo {
  description: string;
  dueDate: Date;
  startDate: Date;
  status: AssignmentStatus;
  maxScore: number;
  attachments: AttachmentInfo[];
  platform: string;
}

// 도서관 관련 인터페이스
export interface LibraryStatus {
  id: string;
  type: string;
  capacity: number;
  available: number;
  status: 'open' | 'closed' | 'maintenance';
}

export interface TimeRange {
  open: string;
  close: string;
}

export interface LibraryHours {
  facility: string;
  weekday: TimeRange;
  weekend: TimeRange;
  holiday: TimeRange;
}

export interface LibraryResource {
  status: LibraryStatus[];
  hours: LibraryHours[];
  notices: NoticeInfo[];
}

// 스크래핑 결과 인터페이스
export interface ScrapingResultMetadata {
  campus?: Campus;
  updateFrequency?: string;
  reliability?: number;
  reservationId?: string;
  message?: string;
  learnUsCount?: number;
  portalCount?: number;
  totalCount?: number;
}

export interface ScrapingResult<T> {
  success: boolean;
  data: T;
  timestamp: Date;
  source: string;
  metadata?: ScrapingResultMetadata;
}

// 플랫폼 인터페이스
export interface CoursePlatform {
  authenticate(credentials: AuthCredentials): Promise<boolean>;
  isAuthenticated(): boolean;
  logout(): Promise<void>;
}

export interface LibraryPlatform extends CoursePlatform {
  getLibraryResourceStatus(): Promise<LibraryResource>;
}

// AI 응답 관련 인터페이스
export interface Intent {
  requiresDataFetch: boolean;
  dataSources: string[];
  confidence: number;
  suggestedActions: string[];
  metadata?: {
    category: DataCategory;
    priority: number;
  };
  category: DataCategory;
  action: 'query' | 'request' | 'complaint' | 'suggestion';
  keywords: string[];
}

export interface ChatResponse {
  text: string;
  content: string;
  error?: string;
  source?: string;
  timestamp: Date;
  data?: ScrapedData[];
  intent?: Intent;
  metadata?: {
    source?: string;
    confidence?: number;
    context?: any;
    suggestedActions?: string[];
    relatedTopics?: string[];
  };
  campus?: Campus;
}

// 스크래핑 데이터 인터페이스
export interface ScrapedData {
  id: string;
  type: string;
  content: any;
  title?: string;
  timestamp: Date;
  metadata: {
    source: string;
    campus?: Campus;
    category?: string;
    confidence?: number;
  };
}

// API 응답 인터페이스
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

export interface ChatResponseData {
  response: string;
  intent: Intent;
  scrapedData: ScrapedData[];
  timestamp: Date;
  campus: Campus;
}

// 서비스 인터페이스
export interface IBackendWebScrapingService {
  scrapeByCategory(category: string, options: { campus?: Campus; count?: number }): Promise<ScrapingResult<ScrapedData[]>>;
  clearCache(): void;
  getStats(): any;
}