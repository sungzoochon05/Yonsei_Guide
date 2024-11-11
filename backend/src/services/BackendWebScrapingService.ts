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
import axios, { AxiosInstance } from 'axios';

export class BackendWebScrapingService {
  private static instance: BackendWebScrapingService;
  private scrapingService: ScrapingService;
  private scraping: Map<string, Promise<ScrapedData[] | LibraryResource>>;
  private readonly axiosInstance: AxiosInstance;

  private constructor() {
    // axios 인스턴스 생성
    this.axiosInstance = axios.create({
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 컴포넌트 초기화 - 각각의 플랫폼에 맞는 URL Manager 인스턴스 생성
    const learnUsUrlManager = new URLManager('https://learnus.yonsei.ac.kr');
    const portalUrlManager = new URLManager('https://portal.yonsei.ac.kr');
    const libraryUrlManager = new URLManager('https://library.yonsei.ac.kr');

    // 공통 컴포넌트 초기화
    const contentExplorer = new ContentExplorer(this.axiosInstance);
    const cacheManager = new CacheManager(60);
    const adaptiveParser = new AdaptiveParser();

    this.learnUs = new LearnUs(
      contentExplorer,
      adaptiveParser,
      learnUsUrlManager,  // CacheManager 대신 URLManager 전달
      cacheManager
    );
    
    this.portalService = new YonseiPortal(
      contentExplorer,
      adaptiveParser,
      portalUrlManager,  // CacheManager 대신 URLManager 전달
      cacheManager
    );
    
    this.libraryService = new LibrarySystem(
      contentExplorer,
      adaptiveParser,
      libraryUrlManager,  // CacheManager 대신 URLManager 전달
      cacheManager
    );
    
    this.scrapingService = this.initializeScrapingService(
      contentExplorer,
      adaptiveParser,
      cacheManager,
      { learnUsUrlManager, portalUrlManager, libraryUrlManager }
    );
    this.scraping = new Map();
  }

  public static getInstance(): BackendWebScrapingService {
    if (!BackendWebScrapingService.instance) {
      BackendWebScrapingService.instance = new BackendWebScrapingService();
    }
    return BackendWebScrapingService.instance;
  }

  private initializeScrapingService(
    contentExplorer: ContentExplorer,
    adaptiveParser: AdaptiveParser,
    cacheManager: CacheManager,
    urlManagers: {
      learnUsUrlManager: URLManager;
      portalUrlManager: URLManager;
      libraryUrlManager: URLManager;
    }
  ): ScrapingService {
    const learnUsService = new LearnUs(
      contentExplorer,
      adaptiveParser,
      cacheManager,
      urlManagers.learnUsUrlManager
    );
    const portalService = new YonseiPortal(
      contentExplorer,
      adaptiveParser,
      cacheManager,
      urlManagers.portalUrlManager
    );
    const libraryService = new LibrarySystem(
      contentExplorer,
      adaptiveParser,
      cacheManager,
      urlManagers.libraryUrlManager
    );

    return {
      async scrape(url: string, config: ScrapingConfig): Promise<ScrapedData> {
        const { type } = config;
        
        switch(type) {
          case 'learnus':
          case 'course':
          case 'assignment':
          case 'notice':
            return learnUsService.getScrapeData(url, config);
            
          case 'portal':
          case 'academic':
          case 'scholarship':
          case 'career':
            return portalService.getScrapeData(url, config);
            
          case 'library':
          case 'books':
          case 'studyroom':
          case 'facilities':
            return libraryService.getScrapeData(url, config);
            
          default:
            throw new Error(`Unknown scraping type: ${type}`);
        }
      },

      async getLibraryStatus(): Promise<LibraryResource> {
        return libraryService.getLibraryResourceStatus();
      }
    };
  }

  public async scrapeByCategory(
    category: string,
    options: { campus?: '신촌' | '원주'; count?: number } = {}
  ): Promise<ScrapingResult<ScrapedData[]>> {
    try {
      const config: ScrapingConfig = {
        campus: options.campus || '신촌',
        limit: options.count || 20
      };
  
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