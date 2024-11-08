// 공통적으로 사용되는 기본 타입 정의
export type Campus = '신촌' | '원주';

export type ContentCategory = 
  | 'notice' 
  | 'academic' 
  | 'scholarship' 
  | 'library' 
  | 'facility' 
  | 'lecture' 
  | 'event' 
  | 'career'
  | 'general';

export type ContentSubCategory = {
  notice: 'general' | 'academic' | 'event' | 'administrative';
  academic: 'registration' | 'exam' | 'grade' | 'graduation' | 'course';
  scholarship: 'national' | 'school' | 'external' | 'work';
  library: 'general' | 'facility' | 'service' | 'collection';
  facility: 'classroom' | 'laboratory' | 'amenity' | 'sports';
  lecture: 'undergraduate' | 'graduate' | 'online' | 'special';
  event: 'academic' | 'cultural' | 'sports' | 'career';
  career: 'recruitment' | 'internship' | 'competition' | 'seminar';
  general: 'announcement' | 'news' | 'other';
};

export type ImportanceLevel = 'high' | 'medium' | 'low';

export type ContentStatus = 'active' | 'inactive' | 'archived' | 'deleted';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface Author {
  id?: string;
  name: string;
  department?: string;
  role?: string;
  contact?: string;
}

export interface ContentMetadata {
  id: string;
  category: ContentCategory;
  subcategory?: string;
  title: string;
  content: string;
  url: string;
  timestamp: Date;
  modifiedAt?: Date;
  author?: Author;
  attachments?: Attachment[];
  tags?: string[];
  views?: number;
  isFixed?: boolean;
  importance: ImportanceLevel;
  status: ContentStatus;
  campus: Campus;
  source: string;
}

export interface ScrapingStats {
  lastUpdate: Date;
  totalItems: number;
  newItems: number;
  updatedItems: number;
  errors: number;
  duration: number;
}

export interface ScrapingResult<T> {
  success: boolean;
  data: T;
  stats: ScrapingStats;
  error?: Error;
  warnings?: string[];
}

// 페이지네이션 관련 타입
export interface PaginationOptions {
  page: number;
  limit: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// 캐시 관련 타입
export interface CacheOptions {
  ttl: number;
  key?: string;
  forceRefresh?: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

// 필터링 관련 타입
export interface FilterOptions {
  category?: ContentCategory;
  subcategory?: string;
  startDate?: Date;
  endDate?: Date;
  importance?: ImportanceLevel;
  status?: ContentStatus;
  campus?: Campus;
  search?: string;
}
