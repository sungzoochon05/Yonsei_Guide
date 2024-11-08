// src/scrapers/platforms/LearnUs.ts

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { 
  CourseInfo, 
  NoticeInfo, 
  AssignmentInfo,
  ScrapingResult,
  ScrapingOptions 
} from '../../types/backendInterfaces';
import { PlatformCredentials, CoursePlatform } from '../../types/scraping/platforms';
import { NetworkError, ParseError, AuthenticationError } from '../../errors/ScrapingError';
import { getErrorMessage } from '../../utils/typeGuards';
import { ContentExplorer } from '../components/ContentExplorer';
import { AdaptiveParser } from '../components/AdaptiveParser';
import { URLManager } from '../components/URLManager';
import { CacheManager } from '../components/CacheManager';

export class LearnUs implements CoursePlatform {
  private readonly baseUrl: string = 'https://learnus.yonsei.ac.kr';
  private axiosInstance: AxiosInstance;
  private isAuthenticated: boolean = false;
  
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

  async authenticate(credentials: PlatformCredentials): Promise<boolean> {
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

      this.isAuthenticated = response.data.includes('로그아웃');
      return this.isAuthenticated;
    } catch (error) {
      throw new AuthenticationError(`러너스 로그인 실패: ${getErrorMessage(error)}`);
    }
  }

  async getCourses(options?: ScrapingOptions): Promise<ScrapingResult<CourseInfo[]>> {
    try {
      if (!this.isAuthenticated) {
        throw new AuthenticationError('인증이 필요합니다');
      }

      const response = await this.axiosInstance.get('/my/');
      const courses = this.adaptiveParser.parseCourseList(response.data, 'learnus');

      return {
        success: true,
        data: courses,
        timestamp: new Date(),
        source: 'LearnUs'
      };
    } catch (error) {
      throw this.handleError(error, '강좌 목록 가져오기 실패');
    }
  }

  async getCourseDetails(courseId: string, options?: ScrapingOptions): Promise<ScrapingResult<CourseInfo>> {
    try {
      if (!this.isAuthenticated) {
        throw new AuthenticationError('인증이 필요합니다');
      }

      const response = await this.axiosInstance.get(`/course/view.php?id=${courseId}`);
      const course = this.adaptiveParser.parseCourseDetails(response.data, 'learnus');

      return {
        success: true,
        data: course,
        timestamp: new Date(),
        source: 'LearnUs'
      };
    } catch (error) {
      throw this.handleError(error, '강좌 상세 정보 가져오기 실패');
    }
  }

  async getAssignments(courseId: string, options?: ScrapingOptions): Promise<ScrapingResult<AssignmentInfo[]>> {
    try {
      if (!this.isAuthenticated) {
        throw new AuthenticationError('인증이 필요합니다');
      }

      const response = await this.axiosInstance.get(`/mod/assign/index.php?id=${courseId}`);
      const assignments = this.adaptiveParser.parseAssignments(response.data, 'learnus');

      return {
        success: true,
        data: assignments,
        timestamp: new Date(),
        source: 'LearnUs'
      };
    } catch (error) {
      throw this.handleError(error, '과제 목록 가져오기 실패');
    }
  }

  async scrapeCourseNotices(courseId: string, options?: ScrapingOptions): Promise<ScrapingResult<NoticeInfo[]>> {
    try {
      if (!this.isAuthenticated) {
        throw new AuthenticationError('인증이 필요합니다');
      }

      const response = await this.axiosInstance.get(`/course/notices.php?id=${courseId}`);
      const notices = this.adaptiveParser.parseNotices(response.data, 'learnus');

      return {
        success: true,
        data: notices,
        timestamp: new Date(),
        source: 'LearnUs'
      };
    } catch (error) {
      throw this.handleError(error, '공지사항 가져오기 실패');
    }
  }

  private handleError(error: unknown, message: string): Error {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    if (axios.isAxiosError(error)) {
      throw new NetworkError(
        `${message}: ${error.message}`,
        'request',
        error.response?.headers['retry-after'] ? 
          parseInt(error.response.headers['retry-after']) : undefined,
        error.response?.status
      );
    }
    throw new ParseError(`${message}: ${getErrorMessage(error)}`);
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  async logout(): Promise<void> {
    try {
      await this.axiosInstance.get('/login/logout.php');
      this.isAuthenticated = false;
    } catch (error) {
      // 로그아웃 실패는 조용히 처리
      this.isAuthenticated = false;
    }
  }
}