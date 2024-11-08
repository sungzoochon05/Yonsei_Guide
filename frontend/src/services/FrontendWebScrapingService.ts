import { ScrapedData } from '../types/frontendTypes';
import { ENV } from '../config/env';
import axios from 'axios';
import type { AxiosError } from 'axios';

interface CacheItem {
  data: ScrapedData[];
  timestamp: number;
}

class FrontendWebScrapingService {
  private static instance: FrontendWebScrapingService;
  private cache: Map<string, CacheItem>;
  private readonly API_URL: string;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5분
  private readonly MAX_RETRIES = 3;

  private constructor() {
    this.API_URL = `${ENV.apiBaseUrl}/api`;
    this.cache = new Map();
    setInterval(() => this.cleanCache(), 60 * 1000); // 1분마다 캐시 정리
  }

  public static getInstance(): FrontendWebScrapingService {
    if (!FrontendWebScrapingService.instance) {
      FrontendWebScrapingService.instance = new FrontendWebScrapingService();
    }
    return FrontendWebScrapingService.instance;
  }

  private isCacheValid(item: CacheItem): boolean {
    return Date.now() - item.timestamp < this.CACHE_TTL;
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error('Maximum retries exceeded');
  }

  public async scrapeByCategory(
    category: string,
    campus: '신촌' | '원주' = '신촌',
    forceRefresh: boolean = false
  ): Promise<ScrapedData[]> {
    try {
      const cacheKey = this.generateCacheKey(category, campus);
      const cached = this.cache.get(cacheKey);

      if (!forceRefresh && cached && this.isCacheValid(cached)) {
        return cached.data;
      }

      const response = await this.withRetry(() => 
        axios.get<{ data: ScrapedData[] }>(
          `${this.API_URL}/${category}`,
          {
            params: { campus }  // 요청 파라미터에 campus 추가
          }
        )
      );

      const scrapedData = response.data.data;
      
      this.cache.set(cacheKey, {
        data: scrapedData,
        timestamp: Date.now()
      });

      return scrapedData;

    } catch (error) {
      if (error instanceof Error) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          throw new Error(`스크래핑 실패: ${axiosError.response.status}`);
        }
        throw new Error(`스크래핑 실패: ${error.message}`);
      }
      throw new Error('알 수 없는 스크래핑 오류가 발생했습니다.');
    }
  }
  private generateCacheKey(category: string, campus: '신촌' | '원주'): string {
    return `scrape:${category}:${campus}`;
  }
  
  public async scrapeNotices(forceRefresh: boolean = false, campus: '신촌' | '원주' = '신촌'): Promise<ScrapedData[]> {
    return this.scrapeByCategory('notices', campus, forceRefresh);
  }
  
  public async scrapeScholarships(forceRefresh: boolean = false, campus: '신촌' | '원주' = '신촌'): Promise<ScrapedData[]> {
    return this.scrapeByCategory('scholarships', campus, forceRefresh);
  }
  
  public async scrapeAcademicInfo(forceRefresh: boolean = false, campus: '신촌' | '원주' = '신촌'): Promise<ScrapedData[]> {
    return this.scrapeByCategory('academic', campus, forceRefresh);
  }
  
  public async scrapeLibraryInfo(forceRefresh: boolean = false, campus: '신촌' | '원주' = '신촌'): Promise<ScrapedData[]> {
    return this.scrapeByCategory('library', campus, forceRefresh);
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheStats(): {
    size: number;
    categories: string[];
    lastUpdated: { [key: string]: Date };
  } {
    const lastUpdated: { [key: string]: Date } = {};
    const categories = new Set<string>();

    for (const [key, value] of this.cache.entries()) {
      const category = key.split(':')[1];
      categories.add(category);
      lastUpdated[category] = new Date(value.timestamp);
    }

    return {
      size: this.cache.size,
      categories: Array.from(categories),
      lastUpdated
    };
  }

  private cleanCache(): void {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (!this.isCacheValid(value)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      console.log(`Cleaned ${cleared} old cache entries`);
    }
  }
}

export default FrontendWebScrapingService;