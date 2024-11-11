import { 
  LibraryResource,
  ScrapedData 
 } from '../types/backendInterfaces';
 import { ScrapingConfig } from '../types/scraping/platforms';
 import { ScrapingService } from './ScrapingService';
 import { LearnUs } from '../scrapers/platforms/LearnUs';
 import { YonseiPortal } from '../scrapers/platforms/YonseiPortal';
 import { LibrarySystem } from '../scrapers/platforms/LibrarySystem';
 import { ContentExplorer } from '../scrapers/components/ContentExplorer';
 import { CacheManager } from '../scrapers/components/CacheManager';
 import { AdaptiveParser } from '../scrapers/components/AdaptiveParser';
 import { URLManager } from '../scrapers/components/URLManager';
 
 /**
 * 연세대학교의 모든 웹 스크래핑 기능을 통합 관리하는 서비스
 * 싱글톤 패턴을 사용하여 단일 인스턴스만 유지
 */
 export class BackendWebScrapingService {
  private static instance: BackendWebScrapingService;
  private scrapingService: ScrapingService;
  private scraping: Map<string, Promise<ScrapedData[] | LibraryResource>>;
 
  private constructor() {
    // 공통으로 사용될 컴포넌트들 초기화
    const contentExplorer = new ContentExplorer();
    const cacheManager = new CacheManager();
    const adaptiveParser = new AdaptiveParser();
    const urlManager = new URLManager();
 
    this.scrapingService = this.initializeScrapingService(
      contentExplorer,
      cacheManager,
      adaptiveParser,
      urlManager
    );
    this.scraping = new Map();
  }
 
  /**
   * 싱글톤 인스턴스 반환
   */
  public static getInstance(): BackendWebScrapingService {
    if (!BackendWebScrapingService.instance) {
      BackendWebScrapingService.instance = new BackendWebScrapingService();
    }
    return BackendWebScrapingService.instance;
  }
 
  /**
   * 통합 스크래핑 서비스 초기화
   */
  private initializeScrapingService(
    contentExplorer: ContentExplorer,
    cacheManager: CacheManager,
    adaptiveParser: AdaptiveParser,
    urlManager: URLManager
  ): ScrapingService {
    const learnUsService = new LearnUs(
      contentExplorer,
      cacheManager,
      adaptiveParser,
      urlManager
    );
    const portalService = new YonseiPortal(
      contentExplorer,
      cacheManager,
      adaptiveParser,
      urlManager
    );
    const libraryService = new LibrarySystem(
      contentExplorer,
      cacheManager,
      adaptiveParser,
      urlManager
    );
 
    return {
      async scrape(url: string, config: ScrapingConfig): Promise<ScrapedData> {
        const { campus, platform, target } = config;
        
        switch(target) {
          case 'learnus':
          case 'course':
          case 'assignment':
          case 'notice':
            return learnUsService.getContent(url, config);
            
          case 'portal':
          case 'academic':
          case 'scholarship':
          case 'career':
            return portalService.getContent(url, config);
            
          case 'library':
          case 'books':
          case 'studyroom':
          case 'facilities':
            return libraryService.getContent(url, config);
            
          default:
            throw new Error(`Unknown target: ${target}`);
        }
      },
 
      async getLibraryStatus(): Promise<LibraryResource> {
        return libraryService.getStatus();
      }
    };
  }
 
  /**
   * 기본 스크래핑 함수 - 내부적으로 사용
   */
  private async scrapeByCategory(
    category: string,
    options: { campus?: '신촌' | '원주'; count?: number } = {}
  ): Promise<ScrapedData[] | LibraryResource> {
    const { campus = '신촌', count = 20 } = options;
    const config: ScrapingConfig = {
      campus,
      platform: this.getPlatformForCategory(category),
      target: category,
      maxCount: count
    };
  
    try {
      const result = await this.scrapingService.scrape(category, config);
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      console.error(`Error in scrapeByCategory(${category}):`, error);
      throw error;
    }
  }
 
  /**
   * 카테고리에 따른 플랫폼 결정
   */
  private getPlatformForCategory(category: string): string {
    switch(category) {
      case 'course':
      case 'assignment':
      case 'notice':
        return 'learnus';
      case 'academic':
      case 'scholarship':
      case 'career':
        return 'portal';
      case 'library':
      case 'books':
      case 'studyroom':
        return 'library';
      default:
        return 'portal';
    }
  }
 
  // =========== LearnUs 관련 메서드 ===========
  
  /**
   * LearnUs 강의 정보 조회
   */
  public async getCourseInfo(options: { campus?: '신촌' | '원주'; count?: number } = {}) {
    return this.scrapeByCategory('course', options);
  }
 
  /**
   * LearnUs 과제 정보 조회
   */
  public async getAssignments(options: { campus?: '신촌' | '원주'; count?: number } = {}) {
    return this.scrapeByCategory('assignment', options);
  }
 
  /**
   * LearnUs 공지사항 조회
   */
  public async getLearnUsNotices(options: { campus?: '신촌' | '원주'; count?: number } = {}) {
    return this.scrapeByCategory('notice', options);
  }
 
  // =========== 포털 관련 메서드 ===========
 
  /**
   * 장학금 정보 조회
   */
  public async getScholarships(options: { campus?: '신촌' | '원주'; count?: number } = {}) {
    return this.scrapeByCategory('scholarship', options);
  }
 
  /**
   * 학사 정보 조회
   */
  public async getAcademicInfo(options: { campus?: '신촌' | '원주'; count?: number } = {}) {
    return this.scrapeByCategory('academic', options);
  }
 
  /**
   * 취업/진로 정보 조회
   */
  public async getCareerInfo(options: { campus?: '신촌' | '원주'; count?: number } = {}) {
    return this.scrapeByCategory('career', options);
  }
 
  // =========== 도서관 관련 메서드 ===========
 
  /**
   * 도서관 일반 정보 조회
   */
  public async getLibraryInfo(options: { count?: number } = {}) {
    return this.scrapeByCategory('library', options);
  }
 
  /**
   * 열람실 현황 조회
   */
  public async getStudyRoomStatus(options: { campus?: '신촌' | '원주' } = {}) {
    return this.scrapeByCategory('studyroom', options);
  }
 
  /**
   * 도서관 시설 정보 조회
   */
  public async getLibraryFacilities(options: { campus?: '신촌' | '원주' } = {}) {
    return this.scrapeByCategory('facilities', options);
  }
 
  /**
   * 도서관 실시간 현황 조회
   */
  public async getLibraryStatus(): Promise<LibraryResource> {
    return await this.scrapingService.getLibraryStatus();
  }
 }
 
 export default BackendWebScrapingService;