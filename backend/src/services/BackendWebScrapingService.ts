import { 
  LibraryResource,
  ScrapedData 
} from '../types/backendInterfaces';
import { ScrapingConfig } from '../types/scraping/platforms';
import { ScrapingService } from './ScrapingService';

export class BackendWebScrapingService {
  private static instance: BackendWebScrapingService;
  private scrapingService: ScrapingService;
  private scraping: Map<string, Promise<ScrapedData[] | LibraryResource>>;

  private constructor() {
    this.scrapingService = ScrapingService.getInstance();
    this.scraping = new Map();
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
      count,
      params: { category }
    };
  
    try {
      const result = await this.scrapingService.scrapeContent(category, config);
      return result.data;
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
      count,
      params: { category }
    };
  
    const result = await this.scrapingService.scrapeContent(category, config);
    return result.data;
  }

  public getStats() {
    return this.scrapingService.getStats();
  }

  public clearCache(): void {
    this.scrapingService.clearCache();
  }
}

export default BackendWebScrapingService;