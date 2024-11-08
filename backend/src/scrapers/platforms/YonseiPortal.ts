// src/scrapers/platforms/YonseiPortal.ts

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { 
  CourseInfo, 
  NoticeInfo, 
  AssignmentInfo,
  ScrapingResult,
  ScrapingOptions 
} from '../../types/backendInterfaces';
import { 
  NetworkError, 
  ParseError, 
  AuthenticationError 
} from '../../errors/ScrapingError';
import { getErrorMessage } from '../../utils/typeGuards';
import { ContentExplorer } from '../components/ContentExplorer';
import { AdaptiveParser } from '../components/AdaptiveParser';
import { URLManager } from '../components/URLManager';
import { CacheManager } from '../components/CacheManager';
import { CoursePlatform, PlatformCredentials } from '../../types/scraping/platforms';

interface PortalCredentials {
  username: string;
  password: string;
}

export class YonseiPortal implements CoursePlatform {
  private readonly baseUrl: string = 'https://portal.yonsei.ac.kr';
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

  async authenticate(credentials: PortalCredentials): Promise<boolean> {
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
      throw new AuthenticationError(`포털 로그인 실패: ${getErrorMessage(error)}`);
    }
  }

  async getCourses(options?: ScrapingOptions): Promise<ScrapingResult<CourseInfo[]>> {
    try {
      if (!this.isAuthenticated) {
        throw new AuthenticationError('인증이 필요합니다');
      }

      const response = await this.axiosInstance.get('/courses');
      const $ = cheerio.load(response.data);
      const courses = this.parseCourseList($);

      return {
        success: true,
        data: courses,
        timestamp: new Date(),
        source: 'YonseiPortal'
      };
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      if (axios.isAxiosError(error)) {
        throw new NetworkError(
          `강좌 정보 가져오기 실패: ${error.message}`,
          'request',
          error.response?.headers['retry-after'] ? 
            parseInt(error.response.headers['retry-after']) : undefined,
          error.response?.status
        );
      }
      throw new ParseError(`강좌 정보 파싱 실패: ${getErrorMessage(error)}`);
    }
  }

  async getCourseDetails(courseId: string, options?: ScrapingOptions): Promise<ScrapingResult<CourseInfo>> {
    try {
      if (!this.isAuthenticated) {
        throw new AuthenticationError('인증이 필요합니다');
      }

      const response = await this.axiosInstance.get(`/courses/${courseId}`);
      const $ = cheerio.load(response.data);
      const course = this.parseCourseDetails($);

      return {
        success: true,
        data: course,
        timestamp: new Date(),
        source: 'YonseiPortal'
      };
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      if (axios.isAxiosError(error)) {
        throw new NetworkError(
          `강좌 상세 정보 가져오기 실패: ${error.message}`,
          'request',
          error.response?.headers['retry-after'] ? 
            parseInt(error.response.headers['retry-after']) : undefined,
          error.response?.status
        );
      }
      throw new ParseError(`강좌 상세 정보 파싱 실패: ${getErrorMessage(error)}`);
    }
  }

  async scrapeNotices(options?: ScrapingOptions): Promise<ScrapingResult<NoticeInfo[]>> {
    try {
      if (!this.isAuthenticated) {
        throw new AuthenticationError('인증이 필요합니다');
      }

      const response = await this.axiosInstance.get('/notices');
      const $ = cheerio.load(response.data);
      const notices = this.parseNotices($);

      return {
        success: true,
        data: notices,
        timestamp: new Date(),
        source: 'YonseiPortal'
      };
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      if (axios.isAxiosError(error)) {
        throw new NetworkError(
          `공지사항 가져오기 실패: ${error.message}`,
          'request',
          error.response?.headers['retry-after'] ? 
            parseInt(error.response.headers['retry-after']) : undefined,
          error.response?.status
        );
      }
      throw new ParseError(`공지사항 파싱 실패: ${getErrorMessage(error)}`);
    }
  }

  async scrapeCourseNotices(courseId: string): Promise<ScrapingResult<NoticeInfo[]>> {
    try {
      if (!this.isAuthenticated) {
        throw new AuthenticationError('인증이 필요합니다');
      }

      const response = await this.axiosInstance.get(`/courses/${courseId}/notices`);
      const $ = cheerio.load(response.data);
      const notices = this.parseNotices($);

      return {
        success: true,
        data: notices,
        timestamp: new Date(),
        source: 'YonseiPortal'
      };
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      if (axios.isAxiosError(error)) {
        throw new NetworkError(
          `강좌 공지사항 가져오기 실패: ${error.message}`,
          'request',
          error.response?.headers['retry-after'] ? 
            parseInt(error.response.headers['retry-after']) : undefined,
          error.response?.status
        );
      }
      throw new ParseError(`강좌 공지사항 파싱 실패: ${getErrorMessage(error)}`);
    }
  }

  async getAssignments(courseId: string): Promise<ScrapingResult<AssignmentInfo[]>> {
    try {
      if (!this.isAuthenticated) {
        throw new AuthenticationError('인증이 필요합니다');
      }

      const response = await this.axiosInstance.get(`/courses/${courseId}/assignments`);
      const $ = cheerio.load(response.data);
      const assignments = this.parseAssignments($);

      return {
        success: true,
        data: assignments,
        timestamp: new Date(),
        source: 'YonseiPortal'
      };
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      if (axios.isAxiosError(error)) {
        throw new NetworkError(
          `과제 정보 가져오기 실패: ${error.message}`,
          'request',
          error.response?.headers['retry-after'] ? 
            parseInt(error.response.headers['retry-after']) : undefined,
          error.response?.status
        );
      }
      throw new ParseError(`과제 정보 파싱 실패: ${getErrorMessage(error)}`);
    }
  }

  private parseCourseList($: CheerioAPI): CourseInfo[] {
    return $('.course-item').map((_, element): CourseInfo => {
      const $course = $(element);
      return {
        id: $course.attr('data-course-id') || '',
        name: $course.find('.course-name').text().trim(),
        professor: $course.find('.professor-name').text().trim(),
        semester: $course.find('.semester').text().trim(),
        url: $course.find('.course-link').attr('href') || '',
        description: $course.find('.description').text().trim(),
        credits: parseInt($course.find('.credits').text()) || 0,
        schedule: $course.find('.schedule li').map((_, el) => $(el).text().trim()).get(),
        department: $course.find('.department').text().trim(),
        platform: 'portal'
      };
    }).get();
  }

  private parseCourseDetails($: CheerioAPI): CourseInfo {
    const $course = $('.course-details');
    return {
      id: $course.attr('data-course-id') || '',
      name: $course.find('.course-name').text().trim(),
      professor: $course.find('.professor-name').text().trim(),
      semester: $course.find('.semester').text().trim(),
      url: $course.find('.course-link').attr('href') || '',
      description: $course.find('.description').text().trim(),
      credits: parseInt($course.find('.credits').text()) || 0,
      schedule: $course.find('.schedule li').map((_, el) => $(el).text().trim()).get(),
      department: $course.find('.department').text().trim(),
      platform: 'portal'
    };
  }

  private parseNotices($: CheerioAPI): NoticeInfo[] {
    return $('.notice-item').map((_, element): NoticeInfo => {
      const $notice = $(element);
      return {
        id: $notice.attr('data-notice-id') || '',
        title: $notice.find('.notice-title').text().trim(),
        content: $notice.find('.notice-content').text().trim(),
        author: $notice.find('.author').text().trim(),
        date: new Date($notice.find('.date').text().trim()),
        important: $notice.hasClass('important'),
        views: parseInt($notice.find('.views').text()) || 0,
        attachments: this.parseAttachments($, $notice),
        platform: 'portal'
      };
    }).get();
  }

  private parseAssignments($: CheerioAPI): AssignmentInfo[] {
    return $('.assignment-item').map((_, element): AssignmentInfo => {
      const $assignment = $(element);
      return {
        id: $assignment.attr('data-assignment-id') || '',
        title: $assignment.find('.assignment-title').text().trim(),
        description: $assignment.find('.description').text().trim(),
        dueDate: new Date($assignment.find('.due-date').text().trim()),
        startDate: new Date($assignment.find('.start-date').text().trim()),
        status: this.parseAssignmentStatus($assignment.find('.status').text().trim()),
        maxScore: parseInt($assignment.find('.max-score').text()) || 0,
        attachments: this.parseAttachments($, $assignment),
        platform: 'portal'
      };
    }).get();
  }

  private parseAttachments($: CheerioAPI, $parent: cheerio.Cheerio<any>) {
    return $parent.find('.attachment').map((_, element) => {
      const $attachment = $(element);
      return {
        id: $attachment.attr('data-attachment-id') || '',
        name: $attachment.find('.filename').text().trim(),
        url: $attachment.find('.download-link').attr('href') || '',
        type: $attachment.find('.filetype').text().trim(),
        size: parseInt($attachment.find('.filesize').attr('data-size') || '0')
      };
    }).get();
  }

  private parseAssignmentStatus(status: string): 'not_submitted' | 'submitted' | 'graded' {
    status = status.toLowerCase();
    if (status.includes('제출완료') || status.includes('submitted')) {
      return 'submitted';
    } else if (status.includes('채점완료') || status.includes('graded')) {
      return 'graded';
    }
    return 'not_submitted';
  }

  async logout(): Promise<void> {
    try {
      await this.axiosInstance.get('/logout');
      this.isAuthenticated = false;
    } catch (error) {
      // 로그아웃 실패는 조용히 처리
      this.isAuthenticated = false;
    }
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }
}