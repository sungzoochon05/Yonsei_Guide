import { 
  LibraryResource,
  ScrapedData 
} from '../types/backendInterfaces';
import { ScrapingConfig } from '../types/scraping/platforms';
import { ScrapingService } from './ScrapingService';

// 실제 스크래핑 서비스 구현체를 가져오기
import { LearnUs } from '../scrapers/platforms/LearnUs';
import { YonseiPortal } from '../scrapers/platforms/YonseiPortal';
import { LibrarySystem } from '../scrapers/platforms/LibrarySystem';

export class BackendWebScrapingService {
  private static instance: BackendWebScrapingService;
  private scrapingService: ScrapingService;
  private scraping: Map<string, Promise<ScrapedData[] | LibraryResource>>;

  private constructor() {
    // 실제 플랫폼에 맞는 스크래핑 서비스 사용
    this.scrapingService = this.initializeScrapingService();
    this.scraping = new Map();
  }

  private initializeScrapingService(): ScrapingService {
    // 여기서 적절한 스크래핑 서비스를 초기화하고 반환
    // 예: LearnUs, YonseiPortal, LibrarySystem 중 하나 또는 조합
    return new LearnUs(); // 예시 - 실제 구현에 맞게 수정 필요
  }

  public static getInstance(): BackendWebScrapingService {
    if (!BackendWebScrapingService.instance) {
      BackendWebScrapingService.instance = new BackendWebScrapingService();
    }
    return BackendWebScrapingService.instance;
  }

  public async scrapeByCategory(
    category: string,
    options: { campus?: '신촌' | '원주'; count?: number } = {}
  ): Promise<ScrapedData[] | LibraryResource> {
    const { campus = '신촌', count = 20 } = options;
    const config: ScrapingConfig = {
      campus,
      count, // maxItems 대신 count 사용
      params: { category }
    };
  
    try {
      const result = await this.scrapingService.scrape(category, config);
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      console.error(`Error in scrapeByCategory(${category}):`, error);
      throw error;
    }
  }

  private async handleScraping(
    category: string,
    campus: '신촌' | '원주',
    count: number
  ): Promise<ScrapedData[] | LibraryResource> {
    const config: ScrapingConfig = {
      campus,
      count, // maxItems 대신 count 사용
      params: { category }
    };
  
    const result = await this.scrapingService.scrape(category, config);
    return Array.isArray(result) ? result : [result];
  }

  public async getLibraryStatus(): Promise<LibraryResource> {
    return await this.scrapingService.getLibraryStatus();
  }
}

export default BackendWebScrapingService;