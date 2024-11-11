import axios, { AxiosInstance } from 'axios';
import { 
  ScrapedData,
  LibraryResource,
  ScrapingResult,
  ScrapingConfig,
  Campus,
  Config,
  NoticeInfo
} from '../types/backendInterfaces';
import { LearnUs } from '../scrapers/platforms/LearnUs';
import { YonseiPortal } from '../scrapers/platforms/YonseiPortal';
import { LibrarySystem } from '../scrapers/platforms/LibrarySystem';
import { ContentExplorer } from '../scrapers/components/ContentExplorer';
import { CacheManager } from '../scrapers/components/CacheManager';
import { AdaptiveParser } from '../scrapers/components/AdaptiveParser';
import { URLManager } from '../scrapers/components/URLManager';
import { NetworkError, ParseError } from '../errors/ScrapingError';

export class BackendWebScrapingService {
  private static instance: BackendWebScrapingService;
  private readonly learnUs: LearnUs;
  private readonly portalService: YonseiPortal;
  private readonly libraryService: LibrarySystem;
  private readonly cacheManager: CacheManager;
  private readonly axiosInstance: AxiosInstance;

  private constructor() {
    this.axiosInstance = axios.create({
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.cacheManager = new CacheManager(60);
    const contentExplorer = new ContentExplorer(this.axiosInstance);
    const adaptiveParser = new AdaptiveParser();

    const learnUsUrlManager = new URLManager('https://learnus.yonsei.ac.kr');
    const portalUrlManager = new URLManager('https://portal.yonsei.ac.kr');
    const libraryUrlManager = new URLManager('https://library.yonsei.ac.kr');

    this.learnUs = new LearnUs(
      contentExplorer,
      adaptiveParser,
      learnUsUrlManager,
      this.cacheManager
    );

    this.portalService = new YonseiPortal(
      contentExplorer,
      adaptiveParser,
      portalUrlManager,
      this.cacheManager
    );

    this.libraryService = new LibrarySystem(
      contentExplorer,
      adaptiveParser,
      libraryUrlManager,
      this.cacheManager
    );
  }

  public static getInstance(): BackendWebScrapingService {
    if (!BackendWebScrapingService.instance) {
      BackendWebScrapingService.instance = new BackendWebScrapingService();
    }
    return BackendWebScrapingService.instance;
  }

  public async scrapeByCategory(
    category: string,
    options: { campus?: Campus; count?: number } = {}
  ): Promise<ScrapingResult<ScrapedData[]>> {
    try {
      const { campus = '신촌', count = 20 } = options;
      const config: ScrapingConfig = {
        baseUrl: '',
        endpoints: {},
        campus,
        limit: count
      };

      let scrapedDataArray: ScrapedData[] = [];

      switch (category) {
        case 'notices':
        case 'academic':
        case 'scholarship': {
          const response = await this.portalService.getScrapeData(category, config);
          scrapedDataArray = this.convertToScrapedDataArray(response.data);
          break;
        }
        case 'course':
        case 'assignment': {
          const response = await this.learnUs.getScrapeData(category, config);
          scrapedDataArray = this.convertToScrapedDataArray(response.data);
          break;
        }
        case 'library': {
          const response = await this.libraryService.getScrapeData(category, config);
          const libraryData = response.data as unknown as LibraryResource;
          scrapedDataArray = this.convertLibraryDataToScrapedData(libraryData);
          break;
        }
        default:
          throw new Error(`Unknown category: ${category}`);
      }
      

      return {
        success: true,
        data: scrapedDataArray,
        timestamp: new Date(),
        source: category,
        metadata: {
          campus,
          updateFrequency: '5m',
          reliability: 0.95
        }
      };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ParseError) {
        throw error;
      }
      throw new Error(`Failed to scrape ${category}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private convertToScrapedDataArray(data: any): ScrapedData[] {
    if (Array.isArray(data)) {
      return data.map(item => ({
        id: item.id,
        type: item.type || 'unknown',
        content: item,
        timestamp: new Date(),
        metadata: {
          source: item.platform || 'unknown',
          category: item.category || 'general',
          confidence: 1.0
        }
      }));
    }
    return [];
  }

  private convertLibraryDataToScrapedData(libraryData: LibraryResource): ScrapedData[] {
    const result: ScrapedData[] = [];

    // 상태 정보 변환
    libraryData.status.forEach(status => {
      result.push({
        id: status.id,
        type: 'library_status',
        content: status,
        timestamp: new Date(),
        metadata: {
          source: 'library',
          category: 'facility',
          confidence: 1.0
        }
      });
    });

    // 운영시간 정보 변환
    libraryData.hours.forEach((hour, index) => {
      result.push({
        id: `hours_${index}`,
        type: 'library_hours',
        content: hour,
        timestamp: new Date(),
        metadata: {
          source: 'library',
          category: 'operation',
          confidence: 1.0
        }
      });
    });

    // 공지사항 변환
    libraryData.notices.forEach(notice => {
      result.push({
        id: notice.id,
        type: 'library_notice',
        content: notice,
        timestamp: notice.timestamp,
        metadata: {
          source: 'library',
          category: 'notice',
          confidence: 1.0
        }
      });
    });

    return result;
  }

  public clearCache(): void {
    this.cacheManager.clear();
  }

  public getStats(): any {
    return {
      cacheInfo: {
        active: true,
        lastCleared: new Date()
      },
      lastUpdate: new Date(),
      availablePlatforms: {
        learnUs: true,
        portal: true,
        library: true
      }
    };
  }

  public async scrapeLibrary(options: { campus?: Campus }): Promise<ScrapingResult<LibraryResource>> {
    try {
      const response = await this.libraryService.getScrapeData('library', {
        baseUrl: '',
        endpoints: {},
        campus: options.campus || '신촌'
      });

      const libraryData = response.data as unknown as LibraryResource;

      return {
        success: true,
        data: libraryData,
        timestamp: new Date(),
        source: 'library',
        metadata: {
          campus: options.campus || '신촌',
          updateFrequency: '1m',
          reliability: 0.99
        }
      };
    } catch (error) {
      throw new Error(`Failed to scrape library info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export default BackendWebScrapingService;