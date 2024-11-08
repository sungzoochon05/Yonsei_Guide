// src/scrapers/components/ContentExplorer.ts

import { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { NetworkError, ParseError } from '../../errors/ScrapingError';
import { 
  NoticeInfo, 
  AttachmentInfo,
  CourseInfo,
  AssignmentInfo,
  RoomInfo
} from '../../types/backendInterfaces';
import { 
  isAxiosError, 
  getErrorMessage, 
  parseFileSizeToBytes,
  parseDateString 
} from '../../utils/typeGuards';

export class ContentExplorer {
  constructor(private readonly axiosInstance: AxiosInstance) {}

  async fetchPage(url: string): Promise<{ data: string; statusCode: number }> {
    try {
      const response = await this.axiosInstance.get(url);
      return {
        data: response.data,
        statusCode: response.status
      };
    } catch (error) {
      if (isAxiosError(error)) {
        throw new NetworkError(
          `페이지 가져오기 실패: ${error.message}`,
          'request',
          error.response?.headers['retry-after'] ? 
            parseInt(error.response.headers['retry-after']) : undefined,
          error.response?.status
        );
      }
      throw new NetworkError(`알 수 없는 오류: ${getErrorMessage(error)}`, 'unknown');
    }
  }

  async fetchCourses(url: string): Promise<CourseInfo[]> {
    try {
      const response = await this.fetchPage(url);
      const $ = cheerio.load(response.data);
      
      return $('.course-item').map((_, element): CourseInfo => {
        const $element = $(element);
        return {
          id: $element.attr('data-id') || '',
          name: $element.find('.course-name').text().trim(),
          professor: $element.find('.professor').text().trim(),
          semester: $element.find('.semester').text().trim(),
          url: $element.find('.course-link').attr('href') || '',
          description: $element.find('.description').text().trim(),
          credits: parseInt($element.find('.credits').text()) || 0,
          schedule: $element.find('.schedule li').map((_, el) => $(el).text().trim()).get(),
          department: $element.find('.department').text().trim(),
          platform: 'learnus' // or 'portal' depending on context
        };
      }).get();
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new ParseError(`강좌 정보 파싱 실패: ${getErrorMessage(error)}`);
    }
  }

  async fetchNotices(url: string): Promise<NoticeInfo[]> {
    try {
      const response = await this.fetchPage(url);
      const $ = cheerio.load(response.data);
      
      return $('.notice-item').map((_, element): NoticeInfo => {
        const $element = $(element);
        const attachments = this.parseAttachments($, $element);

        return {
          id: $element.attr('data-id') || '',
          title: $element.find('.notice-title').text().trim(),
          content: $element.find('.notice-content').text().trim(),
          author: $element.find('.notice-author').text().trim(),
          date: new Date($element.find('.notice-date').text().trim()),
          important: $element.hasClass('important-notice'),
          views: parseInt($element.find('.notice-views').text().trim()) || 0,
          attachments,
          platform: 'learnus' // or other platform identifier
        };
      }).get();
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new ParseError(`공지사항 파싱 실패: ${getErrorMessage(error)}`);
    }
  }

  async fetchAssignments(url: string): Promise<AssignmentInfo[]> {
    try {
      const response = await this.fetchPage(url);
      const $ = cheerio.load(response.data);
      
      return $('.assignment-item').map((_, element): AssignmentInfo => {
        const $element = $(element);
        const attachments = this.parseAttachments($, $element);
        
        return {
          id: $element.attr('data-id') || '',
          title: $element.find('.assignment-title').text().trim(),
          description: $element.find('.assignment-desc').text().trim(),
          dueDate: new Date($element.find('.due-date').text().trim()),
          startDate: new Date($element.find('.start-date').text().trim()),
          status: this.parseAssignmentStatus($element.find('.status').text().trim()),
          maxScore: parseInt($element.find('.max-score').text()) || 0,
          attachments,
          platform: 'learnus' // or other platform identifier
        };
      }).get();
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new ParseError(`과제 정보 파싱 실패: ${getErrorMessage(error)}`);
    }
  }

  async fetchRooms(url: string): Promise<RoomInfo[]> {
    try {
      const response = await this.fetchPage(url);
      const $ = cheerio.load(response.data);
      
      return $('.room-item').map((_, element): RoomInfo => {
        const $element = $(element);
        
        return {
          id: $element.attr('data-id') || '',
          name: $element.find('.room-name').text().trim(),
          capacity: parseInt($element.find('.capacity').text()) || 0,
          available: $element.find('.status').hasClass('available'),
          location: $element.find('.location').text().trim(),
          facilities: $element.find('.facilities li').map((_, el) => $(el).text().trim()).get(),
          schedule: this.parseRoomSchedule($, $element)
        };
      }).get();
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new ParseError(`열람실 정보 파싱 실패: ${getErrorMessage(error)}`);
    }
  }

  async downloadFile(url: string): Promise<Buffer> {
    try {
      const response = await this.axiosInstance.get(url, {
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data);
    } catch (error) {
      if (isAxiosError(error)) {
        throw new NetworkError(
          `파일 다운로드 실패: ${error.message}`,
          'download',
          error.response?.headers['retry-after'] ? 
            parseInt(error.response.headers['retry-after']) : undefined,
          error.response?.status
        );
      }
      throw new NetworkError(`파일 다운로드 실패: ${getErrorMessage(error)}`, 'unknown');
    }
  }

  private parseAttachments($: cheerio.CheerioAPI, $element: cheerio.Cheerio<any>): AttachmentInfo[] {
    return $element.find('.attachment-item').map((_, attachment): AttachmentInfo => {
      const $attachment = $(attachment);
      const sizeText = $attachment.find('.attachment-size').text().trim();
      
      return {
        id: $attachment.attr('data-id') || '',
        name: $attachment.find('.attachment-name').text().trim(),
        url: $attachment.find('.attachment-link').attr('href') || '',
        size: parseFileSizeToBytes(sizeText),
        type: $attachment.find('.attachment-type').text().trim()
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

  private parseRoomSchedule($: cheerio.CheerioAPI, $element: cheerio.Cheerio<any>) {
    return $element.find('.schedule-item').map((_, schedule) => {
      const $schedule = $(schedule);
      return {
        day: $schedule.find('.day').text().trim(),
        startTime: $schedule.find('.start-time').text().trim(),
        endTime: $schedule.find('.end-time').text().trim(),
        purpose: $schedule.find('.purpose').text().trim(),
        organizer: $schedule.find('.organizer').text().trim() || undefined
      };
    }).get();
  }
}