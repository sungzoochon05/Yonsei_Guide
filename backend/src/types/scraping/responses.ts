import { 
    ContentMetadata, 
    ScrapingStats, 
    Campus,
    ContentCategory,
    PaginatedResult,
    Author
  } from './common';
  
  // 기본 응답 인터페이스
  export interface BaseResponse {
    success: boolean;
    timestamp: Date;
    duration: number;
    source: string;
    campus: Campus;
  }
  
  // 공지사항 응답
  export interface NoticeResponse extends BaseResponse {
    data: {
      notices: ContentMetadata[];
      total: number;
      fixed: ContentMetadata[];
      categories: string[];
      stats: {
        byCategory: Record<string, number>;
        byImportance: Record<string, number>;
      };
    };
  }
  
  // 학사 정보 응답
  export interface AcademicResponse extends BaseResponse {
    data: {
      academic: ContentMetadata[];
      total: number;
      departments: string[];
      semesters: string[];
      stats: {
        byDepartment: Record<string, number>;
        bySemester: Record<string, number>;
      };
    };
  }
  
  // 장학금 응답
  export interface ScholarshipResponse extends BaseResponse {
    data: {
      scholarships: ContentMetadata[];
      total: number;
      types: string[];
      deadlines: Array<{
        id: string;
        title: string;
        deadline: Date;
        type: string;
      }>;
      stats: {
        byType: Record<string, number>;
        byStatus: Record<string, number>;
      };
    };
  }
  
  // 도서관 응답
  export interface LibraryResponse extends BaseResponse {
    data: {
      notices: ContentMetadata[];
      facilities: Array<{
        id: string;
        name: string;
        type: string;
        capacity: number;
        available: number;
        status: 'open' | 'closed' | 'maintenance';
        reservable: boolean;
      }>;
      hours: Array<{
        facility: string;
        weekday: { open: string; close: string };
        weekend: { open: string; close: string };
        holiday: { open: string; close: string };
      }>;
      stats: {
        totalSeats: number;
        availableSeats: number;
        utilizationRate: number;
      };
    };
  }
  
  // 통합 검색 응답
  export interface SearchResponse extends BaseResponse {
    data: {
      query: string;
      results: Array<ContentMetadata & {
        relevance: number;
        highlights: {
          title?: string[];
          content?: string[];
        };
      }>;
      facets: {
        categories: Record<ContentCategory, number>;
        dates: Record<string, number>;
        authors: Record<string, number>;
      };
      stats: {
        total: number;
        took: number;
        maxScore: number;
      };
    };
  }
  
  // 에러 응답
  export interface ErrorResponse extends BaseResponse {
    error: {
      code: string;
      message: string;
      details?: any;
      stack?: string;
    };
  }
  
  // 스크래핑 결과 응답
  export interface ScrapingResponse<T> extends BaseResponse {
    data: T;
    stats: ScrapingStats;
    warnings?: string[];
    metadata?: {
      nextUpdate?: Date;
      lastSuccessfulUpdate?: Date;
      coverage?: {
        start: Date;
        end: Date;
      };
    };
  }
  
  // 통계 응답
  export interface StatsResponse extends BaseResponse {
    data: {
      requests: {
        total: number;
        successful: number;
        failed: number;
        cached: number;
      };
      performance: {
        averageResponseTime: number;
        maxResponseTime: number;
        minResponseTime: number;
      };
      coverage: {
        categories: Record<ContentCategory, number>;
        campuses: Record<Campus, number>;
        dates: Record<string, number>;
      };
      errors: {
        byType: Record<string, number>;
        byEndpoint: Record<string, number>;
      };
      cache: {
        hits: number;
        misses: number;
        size: number;
      };
    };
  }
  
  // 상태 모니터링 응답
  export interface HealthResponse extends BaseResponse {
    data: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      uptime: number;
      endpoints: Record<string, {
        status: 'up' | 'down';
        lastCheck: Date;
        responseTime: number;
      }>;
      system: {
        cpu: number;
        memory: number;
        activeConnections: number;
      };
    };
  }