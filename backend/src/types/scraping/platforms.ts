// src/types/scraping/platform.ts

import { 
  CourseInfo, 
  NoticeInfo, 
  AssignmentInfo, 
  RoomInfo,
  ScrapingResult, 
  ScrapingOptions,
  AttachmentInfo
} from '../backendInterfaces';

export interface PlatformCredentials {
  username: string;
  password: string;
}

export interface Platform {
  authenticate(credentials: PlatformCredentials): Promise<boolean>;
  isLoggedIn(): boolean;
  logout(): Promise<void>;
}

export interface CoursePlatform extends Platform {
  getCourses(options?: ScrapingOptions): Promise<ScrapingResult<CourseInfo[]>>;
  getCourseDetails(courseId: string, options?: ScrapingOptions): Promise<ScrapingResult<CourseInfo>>;
  getAssignments(courseId: string, options?: ScrapingOptions): Promise<ScrapingResult<AssignmentInfo[]>>;
  scrapeCourseNotices(courseId: string, options?: ScrapingOptions): Promise<ScrapingResult<NoticeInfo[]>>;
}

export interface LibraryPlatform extends Platform {
  getRooms(options?: ScrapingOptions): Promise<ScrapingResult<RoomInfo[]>>;
  reserveRoom(roomId: string, timeSlot: string): Promise<ScrapingResult<boolean>>;
  cancelReservation(reservationId: string): Promise<ScrapingResult<boolean>>;
}

export interface AttachmentPlatform {
  getAttachments(id: string): Promise<ScrapingResult<AttachmentInfo[]>>;
  downloadAttachment(attachmentId: string): Promise<Buffer>;
}

export interface PlatformError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  retryable: boolean;
  retryAfter?: number;
}

export interface PlatformResponse<T> {
  success: boolean;
  data?: T;
  error?: PlatformError;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface PaginatedResponse<T> extends PlatformResponse<T[]> {
  page: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
}

export interface PlatformConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  headers?: Record<string, string>;
  cacheEnabled?: boolean;
  cacheDuration?: number;
}

export interface PlatformMetrics {
  requestCount: number;
  successCount: number;
  failureCount: number;
  averageResponseTime: number;
  lastRequestTime?: Date;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
}

export interface PlatformSession {
  id: string;
  platform: string;
  startTime: Date;
  lastActivity: Date;
  authenticated: boolean;
  metrics: PlatformMetrics;
}