// src/types/backendInterfaces.ts

export interface ScrapingResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
}

export interface ScrapingConfig {
  retryAttempts: number;
  timeout: number;
  cacheExpiry: number;
  concurrent: boolean;
  userAgent: string;
  maxParallelRequests: number;
  rateLimitDelay: number;
  headers: Record<string, string>;
}

export interface ScrapingOptions {
  useCache?: boolean;
  forceRefresh?: boolean;
  timeout?: number;
  retryAttempts?: number;
  headers?: Record<string, string>;
}

export interface CourseInfo {
  id: string;
  name: string;
  professor: string;
  semester: string;
  url: string;
  description?: string;
  credits?: number;
  schedule?: string[];
  department?: string;
  platform: 'learnus' | 'portal';
}

export interface NoticeInfo {
  id: string;
  title: string;
  content: string;
  author: string;
  date: Date;
  attachments?: AttachmentInfo[];
  important: boolean;
  views: number;
  platform: string;
}

export interface AssignmentInfo {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  startDate: Date;
  status: AssignmentStatus;
  maxScore: number;
  attachments?: AttachmentInfo[];
  platform: string;
}

export type AssignmentStatus = 'not_submitted' | 'submitted' | 'graded';

export interface AttachmentInfo {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  capacity: number;
  available: boolean;
  location: string;
  facilities?: string[];
  schedule?: RoomSchedule[];
}

export interface RoomSchedule {
  day: string;
  startTime: string;
  endTime: string;
  purpose: string;
  organizer?: string;
}

export interface Config {
  scrapingConfig: ScrapingConfig;
  apiConfig: {
    baseURL: string;
    timeout: number;
    retryAttempts: number;
    rateLimitDelay: number;
    maxConcurrentRequests: number;
  };
  cacheConfig: {
    enabled: boolean;
    duration: number;
    maxSize: number;
    cleanupInterval: number;
  };
  authConfig: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
}

export interface ScrapedData {
  courseInfo?: CourseInfo[];
  notices?: NoticeInfo[];
  assignments?: AssignmentInfo[];
  roomInfo?: RoomInfo[];
  error?: string;
  timestamp: Date;
  source: string;
  title?: string;
  content?: string;
  meta?: Record<string, any>;
}

export interface IntentAnalysis {
  category: string;
  action: string;
  keywords: string[];
  confidence: number;
  parameters: Record<string, any>;
  priority: 'high' | 'medium' | 'low';
  requiredData: string[];
  context?: string;
}

export interface ChatResponse {
  message: string;
  timestamp: Date;
  confidence: number;
  source: string;
  intent?: IntentAnalysis;
  data?: unknown;
}

export interface LibraryResponse {
  rooms: RoomInfo[];
  timestamp: Date;
  totalAvailable: number;
  peakHours?: {
    start: string;
    end: string;
    occupancyRate: number;
  }[];
}

export interface NetworkErrorOptions {
  type: 'timeout' | 'rateLimit' | 'connection' | 'unknown';
  retryAfter?: number;
  statusCode?: number;
  details?: Record<string, any>;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: Date;
  metadata?: {
    source?: string;
    confidence?: number;
    context?: string;
  };
}

export interface ChatResponse {
  message: string;  // text 대신 message 사용
  intent?: IntentAnalysis;
  context?: string;
  confidence: number;
  timestamp: Date;
  source?: string;
  data?: unknown;
  metadata?: Record<string, any>;
}

export interface IntentAnalysis {
  category: string;
  action: string;
  keywords: string[];
  confidence: number;
  parameters: Record<string, any>;
  priority: 'high' | 'medium' | 'low';
  requiredData: string[];
  context?: string;
}