// src/scrapers/platforms/LearnUs.ts

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { 
  ScrapedData,
  ScrapingResult,
  ScrapingConfig,
  AuthCredentials,
  CourseInfo,
  NoticeInfo,
  AssignmentInfo,
  Platform
} from '../../types/backendInterfaces';
import { NetworkError, ParseError, AuthenticationError } from '../../errors/ScrapingError';
import { getErrorMessage } from '../../utils/typeGuards';
import { ContentExplorer } from '../components/ContentExplorer';
import { AdaptiveParser } from '../components/AdaptiveParser';
import { URLManager } from '../components/URLManager';
import { CacheManager } from '../components/CacheManager';
interface CacheKeyData {
  category: string;
  campus: string;
  timestamp: number;
}
export class LearnUs {
  private readonly baseUrl: string = 'https://learnus.yonsei.ac.kr';
  private axiosInstance: AxiosInstance;
  private authenticated: boolean = false;
  
  constructor(
    private readonly contentExplorer: ContentExplorer,
    private readonly adaptiveParser: AdaptiveParser,
    private readonly urlManager: URLManager,
    private readonly cacheManager: CacheManager
  ) {
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      withCredentials: true
    });
  }

  public async authenticate(credentials: AuthCredentials): Promise<boolean> {
    try {
      const loginPage = await this.axiosInstance.get('/login');
      const $ = cheerio.load(loginPage.data);
      const csrfToken = $('input[name="_csrf"]').val();

      const response = await this.axiosInstance.post('/login', {
        username: credentials.username,
        password: credentials.password,
        _csrf: csrfToken
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.authenticated = response.data.includes('로그아웃');
      return this.authenticated;
    } catch (error) {
      throw new AuthenticationError(
        `러너스 로그인 실패: ${getErrorMessage(error)}`,
        'learnus'
      );
    }
  }

  public async getScrapeData(category: string, config: ScrapingConfig): Promise<ScrapingResult<ScrapedData>> {
    if (!this.authenticated) {
      throw new AuthenticationError('인증이 필요합니다', 'learnus');
    }

    try {

      const cacheKey = `learnus_${category}_${config.campus || '신촌'}`;
      
      // 캐시 확인 - 결과가 ScrapedData인지 확인
      const cachedData = this.cacheManager.get<ScrapedData>(cacheKey);
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
          timestamp: new Date(),
          source: 'learnus',
          metadata: {
            campus: config.campus,
            updateFrequency: '5m',
            reliability: 0.95
          }
        };
      }

      let data: any;
      switch (category) {
        case 'course':
          data = await this.getCourses(config);
          break;
        case 'notice':
          data = await this.getCourseNotices(config);
          break;
        case 'assignment':
          data = await this.getAssignments(config);
          break;
        default:
          throw new Error(`Unsupported category: ${category}`);
      }

      const scrapedData = this.convertToScrapedData(data, category);

      const result: ScrapingResult<ScrapedData> = {
        success: true,
        data: scrapedData,
        timestamp: new Date(),
        source: 'learnus',
        metadata: {
          campus: config.campus,
          updateFrequency: '5m',
          reliability: 0.95
        }
      };

      // 결과 캐싱
      this.cacheManager.set(cacheKey, scrapedData);

      return result;
    } catch (error) {
      throw this.handleError(error, `Failed to scrape ${category}`);
  }
}

  private convertToScrapedData(data: any, category: string): ScrapedData {
    return {
      id: `learnus_${Date.now()}`,
      type: category,
      content: data,
      timestamp: new Date(),
      metadata: {
        source: 'learnus',
        category: category,
        confidence: 1.0
      }
    };
  }

  private async getCourses(config: ScrapingConfig): Promise<CourseInfo[]> {
    const response = await this.axiosInstance.get('/my/');
    return this.adaptiveParser.parseCourseList(response.data, 'learnus', config.campus || '신촌');
  }

  private async getCourseNotices(config: ScrapingConfig): Promise<NoticeInfo[]> {
    const response = await this.axiosInstance.get('/notices');
    return this.adaptiveParser.parseNotices(response.data, 'learnus', config.campus || '신촌');
  }

  private async getAssignments(config: ScrapingConfig): Promise<AssignmentInfo[]> {
    const response = await this.axiosInstance.get('/assignments');
    return this.adaptiveParser.parseAssignments(response.data, 'learnus', config.campus || '신촌');
  }

  private handleError(error: unknown, message: string): Error {
    if (error instanceof AuthenticationError) {
      return error;
    }
    if (axios.isAxiosError(error)) {
      return new NetworkError(
        `${message}: ${error.message}`,
        {
          type: 'connection',
          statusCode: error.response?.status,
          retryAfter: error.response?.headers['retry-after'] ? 
            parseInt(error.response.headers['retry-after']) : undefined
        }
      );
    }
    return new ParseError(`${message}: ${getErrorMessage(error)}`);
  }

  public async logout(): Promise<void> {
    try {
      await this.axiosInstance.get('/login/logout.php');
      this.authenticated = false;
    } catch (error) {
      // 로그아웃 실패는 조용히 처리
      this.authenticated = false;
    }
  }

  public getAuthStatus(): boolean {
    return this.authenticated;
  }
}