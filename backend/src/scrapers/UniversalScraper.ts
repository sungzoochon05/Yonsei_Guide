// src/scrapers/UniversalScraper.ts

import axios from 'axios';
import { 
  Config, 
  CourseInfo, 
  NoticeInfo, 
  AssignmentInfo, 
  RoomInfo,
  ScrapingResult,
  ScrapingOptions
} from '../types/backendInterfaces';
import { LearnUs } from './platforms/LearnUs';
import { YonseiPortal } from './platforms/YonseiPortal';
import { LibrarySystem } from './platforms/LibrarySystem';
import { NetworkError, ParseError, AuthenticationError } from '../errors/ScrapingError';
import { CacheManager } from './components/CacheManager';
import { ContentExplorer } from './components/ContentExplorer';
import { AdaptiveParser } from './components/AdaptiveParser';
import { URLManager } from './components/URLManager';
import { getErrorMessage } from '../utils/typeGuards';

interface PlatformCredentials {
  username: string;
  password: string;
}

export class UniversalScraper {
  private readonly learnUs: LearnUs;
  private readonly yonseiPortal: YonseiPortal;
  private readonly librarySystem: LibrarySystem;
  private readonly cacheManager: CacheManager;
  private readonly contentExplorer: ContentExplorer;
  private readonly adaptiveParser: AdaptiveParser;
  private readonly urlManager: URLManager;

  constructor(
    private readonly config: Config,
    private readonly credentials: PlatformCredentials
  ) {
    // Initialize cache manager
    this.cacheManager = new CacheManager(
      config.cacheConfig.duration,
      config.cacheConfig.maxSize,
      config.cacheConfig.cleanupInterval
    );

    // Initialize URL manager
    this.urlManager = new URLManager(config.apiConfig.baseURL);

    // Initialize content explorer with axios instance
    const axiosInstance = axios.create({
      timeout: config.apiConfig.timeout,
      headers: config.scrapingConfig.headers,
      maxRedirects: 5,
      withCredentials: true
    });

    this.contentExplorer = new ContentExplorer(axiosInstance);
    this.adaptiveParser = new AdaptiveParser();

    // Initialize platform-specific scrapers with dependencies
    this.learnUs = new LearnUs(
      this.contentExplorer,
      this.adaptiveParser,
      this.urlManager,
      this.cacheManager
    );

    this.yonseiPortal = new YonseiPortal(
      this.contentExplorer,
      this.adaptiveParser,
      this.urlManager,
      this.cacheManager
    );

    this.librarySystem = new LibrarySystem(
      this.contentExplorer,
      this.adaptiveParser,
      this.urlManager,
      this.cacheManager
    );
  }

  async initialize(): Promise<void> {
    try {
      const credentials = {
        username: this.credentials.username,
        password: this.credentials.password
      };

      // 동시 인증이 활성화된 경우 모든 플랫폼에 동시 인증
      if (this.config.scrapingConfig.concurrent) {
        await Promise.all([
          this.learnUs.authenticate(credentials),
          this.yonseiPortal.authenticate(credentials),
          this.librarySystem.authenticate(credentials)
        ]);
      } else {
        // 순차적 인증
        await this.learnUs.authenticate(credentials);
        await this.yonseiPortal.authenticate(credentials);
        await this.librarySystem.authenticate(credentials);
      }
    } catch (error) {
      throw new AuthenticationError(
        `스크래퍼 초기화 실패: ${getErrorMessage(error)}`
      );
    }
  }

  private async withErrorHandling<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      if (axios.isAxiosError(error)) {
        throw new NetworkError(
          `${errorMessage}: ${error.message}`,
          'request',
          error.response?.headers['retry-after'] ? 
            parseInt(error.response.headers['retry-after']) : undefined,
          error.response?.status
        );
      }
      throw new ParseError(`${errorMessage}: ${getErrorMessage(error)}`);
    }
  }
  // src/scrapers/UniversalScraper.ts (continued)

  async getAllCourses(options?: ScrapingOptions): Promise<ScrapingResult<CourseInfo[]>> {
    const cacheKey = 'all_courses';
    
    try {
      // 캐시 확인
      if (options?.useCache && !options?.forceRefresh) {
        const cached = this.cacheManager.get<CourseInfo[]>(cacheKey);
        if (cached) return cached;
      }

      // 모든 플랫폼에서 강좌 정보 가져오기
      const [learnUsResult, portalResult] = await Promise.all([
        this.learnUs.getCourses(options),
        this.yonseiPortal.getCourses(options)
      ]);

      if (!learnUsResult.success && !portalResult.success) {
        throw new Error('모든 플랫폼에서 강좌 정보를 가져오는데 실패했습니다');
      }

      // 강좌 정보 병합
      const learnUsCourses = learnUsResult.success && learnUsResult.data ? learnUsResult.data : [];
      const portalCourses = portalResult.success && portalResult.data ? portalResult.data : [];
      const allCourses = this.mergeCourses(learnUsCourses, portalCourses);

      const result: ScrapingResult<CourseInfo[]> = {
        success: true,
        data: allCourses,
        timestamp: new Date(),
        source: 'UniversalScraper',
        metadata: {
          learnUsCount: learnUsCourses.length,
          portalCount: portalCourses.length,
          totalCount: allCourses.length,
          platforms: {
            learnus: learnUsResult.success,
            portal: portalResult.success
          }
        }
      };

      // 결과 캐싱
      if (options?.useCache) {
        this.cacheManager.set(cacheKey, result, this.config.cacheConfig.duration);
      }

      return result;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      if (error instanceof NetworkError) {
        throw error;
      }
      throw new ParseError(`강좌 정보 처리 실패: ${getErrorMessage(error)}`);
    }
  }

  async getCourseNotices(courseId: string, options?: ScrapingOptions): Promise<ScrapingResult<NoticeInfo[]>> {
    const cacheKey = `course_notices_${courseId}`;

    try {
      // 캐시 확인
      if (options?.useCache && !options?.forceRefresh) {
        const cached = this.cacheManager.get<NoticeInfo[]>(cacheKey);
        if (cached) return cached;
      }

      // 강좌 상세 정보를 통해 플랫폼 확인
      const courseDetails = await this.getCourseDetails(courseId, options);
      if (!courseDetails.success || !courseDetails.data) {
        throw new Error('강좌를 찾을 수 없습니다');
      }

      // 플랫폼별 공지사항 가져오기
      const notices = courseDetails.data.platform === 'learnus' ?
        await this.learnUs.scrapeCourseNotices(courseId) :
        await this.yonseiPortal.scrapeCourseNotices(courseId);

      // 결과 캐싱
      if (options?.useCache) {
        this.cacheManager.set(cacheKey, notices, this.config.cacheConfig.duration);
      }

      return notices;
    } catch (error) {
      throw error instanceof NetworkError || error instanceof AuthenticationError ?
        error : new ParseError(`공지사항 처리 실패: ${getErrorMessage(error)}`);
    }
  }

  async getAssignments(courseId: string, options?: ScrapingOptions): Promise<ScrapingResult<AssignmentInfo[]>> {
    const cacheKey = `assignments_${courseId}`;

    try {
      // 캐시 확인
      if (options?.useCache && !options?.forceRefresh) {
        const cached = this.cacheManager.get<AssignmentInfo[]>(cacheKey);
        if (cached) return cached;
      }

      const courseDetails = await this.getCourseDetails(courseId, options);
      if (!courseDetails.success || !courseDetails.data) {
        throw new Error('강좌를 찾을 수 없습니다');
      }

      let assignments: ScrapingResult<AssignmentInfo[]>;
      if (courseDetails.data.platform === 'learnus') {
        assignments = await this.learnUs.getAssignments(courseId);
      } else {
        assignments = await this.yonseiPortal.getAssignments(courseId);
      }

      // 결과 캐싱
      if (options?.useCache) {
        this.cacheManager.set(cacheKey, assignments, this.config.cacheConfig.duration);
      }

      return assignments;
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new ParseError(`과제 정보 처리 실패: ${getErrorMessage(error)}`);
    }
  }

  async getLibraryRooms(options?: ScrapingOptions): Promise<ScrapingResult<RoomInfo[]>> {
    const cacheKey = 'library_rooms';

    try {
      // 캐시 확인
      if (options?.useCache && !options?.forceRefresh) {
        const cached = this.cacheManager.get<RoomInfo[]>(cacheKey);
        if (cached) return cached;
      }

      const rooms = await this.librarySystem.getRooms(options);

      // 결과 캐싱
      if (options?.useCache) {
        this.cacheManager.set(cacheKey, rooms, this.config.cacheConfig.duration);
      }

      return rooms;
    } catch (error) {
      throw error instanceof NetworkError || error instanceof AuthenticationError ?
        error : new ParseError(`열람실 정보 처리 실패: ${getErrorMessage(error)}`);
    }
  }

  async getCourseDetails(courseId: string, options?: ScrapingOptions): Promise<ScrapingResult<CourseInfo>> {
    const cacheKey = `course_details_${courseId}`;

    try {
      // 캐시 확인
      if (options?.useCache && !options?.forceRefresh) {
        const cached = this.cacheManager.get<CourseInfo>(cacheKey);
        if (cached) return cached;
      }

      // 양쪽 플랫폼에서 강좌 상세 정보 가져오기 시도
      const [learnUsDetails, portalDetails] = await Promise.all([
        this.learnUs.getCourseDetails(courseId).catch(() => null),
        this.yonseiPortal.getCourseDetails(courseId).catch(() => null)
      ]);

      // 있는 쪽의 데이터 사용
      const details = learnUsDetails || portalDetails;
      if (!details?.success || !details.data) {
        throw new Error('어느 플랫폼에서도 강좌를 찾을 수 없습니다');
      }

      // 결과 캐싱
      if (options?.useCache) {
        this.cacheManager.set(cacheKey, details, this.config.cacheConfig.duration);
      }

      return details;
    } catch (error) {
      throw error instanceof NetworkError || error instanceof AuthenticationError ?
        error : new ParseError(`강좌 상세 정보 처리 실패: ${getErrorMessage(error)}`);
    }
  }

  private mergeCourses(courses1: CourseInfo[] = [], courses2: CourseInfo[] = []): CourseInfo[] {
    const courseMap = new Map<string, CourseInfo>();
    
    // 모든 강좌를 맵에 추가
    [...courses1, ...courses2].forEach(course => {
      if (!courseMap.has(course.id)) {
        courseMap.set(course.id, course);
      } else {
        const existing = courseMap.get(course.id)!;
        const merged = this.mergeCoursesInfo(existing, course);
        courseMap.set(course.id, merged);
      }
    });

    return Array.from(courseMap.values());
  }

  private mergeCoursesInfo(course1: CourseInfo, course2: CourseInfo): CourseInfo {
    return {
      ...course1,
      ...course2,
      // 배열인 경우 합치기
      schedule: [...new Set([...(course1.schedule || []), ...(course2.schedule || [])])],
      // 더 많은 정보를 가진 설명 사용
      description: this.getMoreDetailedDescription(course1.description, course2.description)
    };
  }

  private getMoreDetailedDescription(desc1?: string, desc2?: string): string | undefined {
    if (!desc1) return desc2;
    if (!desc2) return desc1;
    return desc1.length >= desc2.length ? desc1 : desc2;
  }

  destroy(): void {
    this.cacheManager.clear();
    clearInterval(this.cacheManager['cleanupInterval']);
  }

  // Utility method for clearing cache
  clearCache(pattern?: string): void {
    if (pattern) {
      const keys = Array.from(this.cacheManager['cache'].keys());
      keys.forEach(key => {
        if (key.includes(pattern)) {
          this.cacheManager.delete(key);
        }
      });
    } else {
      this.cacheManager.clear();
    }
  }
}