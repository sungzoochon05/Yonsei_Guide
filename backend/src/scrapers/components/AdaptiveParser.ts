import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { ParseError } from '../../errors/ScrapingError';
import { 
  CourseInfo, 
  NoticeInfo, 
  AssignmentInfo,
  AttachmentInfo,
  AssignmentStatus,
  ScrapedData,
  LibraryResource,
  LibraryStatus,
  LibraryHours,
  TimeRange,
  Platform,
  Campus
} from '../../types/backendInterfaces';

export class AdaptiveParser {
  // 일반 페이지 파싱
  parsePage(html: string, platform: Platform = 'portal'): ScrapedData {
    try {
      const $ = cheerio.load(html);
      const title = $('h1').first().text().trim() || '제목 없음';
      const content = $('main, .content, #content').first().text().trim() || $('body').text().trim();

      return {
        id: `page_${Date.now()}`,
        type: 'general',
        title,
        content,
        timestamp: new Date(),
        metadata: {
          source: platform,
          category: 'general',
          confidence: 1.0
        }
      };
    } catch (error) {
      throw new ParseError('페이지 파싱 실패: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  // 강좌 목록 파싱
  parseCourseList(html: string, platform: 'learnus' | 'portal', campus: Campus): CourseInfo[] {
    try {
      const $ = cheerio.load(html);
      return $('.course-item').map((_, element): CourseInfo => {
        const $element = $(element);
        return {
          id: $element.attr('data-course-id') || `course_${Date.now()}_${_}`,
          title: $element.find('.course-title').text().trim(),
          content: $element.find('.course-description').text().trim(),
          name: $element.find('.course-name').text().trim(),
          professor: $element.find('.professor-name').text().trim(),
          semester: $element.find('.semester').text().trim(),
          url: $element.find('.course-link').attr('href') || '',
          description: $element.find('.course-description').text().trim(),
          credits: parseInt($element.find('.credits').text()) || 0,
          department: $element.find('.department').text().trim(),
          schedule: $element.find('.schedule li').map((_, el) => $(el).text().trim()).get(),
          platform,
          timestamp: new Date(),
          campus
        };
      }).get();
    } catch (error) {
      throw new ParseError('강좌 목록 파싱 실패: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  // 공지사항 파싱
  parseNotices(html: string, platform: Platform, campus: Campus): NoticeInfo[] {
    try {
      const $ = cheerio.load(html);
      return $('.notice-item').map((_, element): NoticeInfo => {
        const $element = $(element);
        const attachments = this.parseAttachments($, $element.find('.attachments'));

        return {
          id: $element.attr('data-id') || `notice_${Date.now()}_${_}`,
          title: $element.find('.notice-title').text().trim(),
          content: $element.find('.notice-content').text().trim(),
          author: $element.find('.notice-author').text().trim(),
          date: new Date($element.find('.notice-date').text().trim()),
          important: $element.hasClass('important-notice'),
          views: parseInt($element.find('.notice-views').text().trim()) || 0,
          attachments,
          platform,
          timestamp: new Date(),
          campus
        };
      }).get();
    } catch (error) {
      throw new ParseError('공지사항 파싱 실패: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  // 과제 파싱
  parseAssignments(html: string, platform: Platform, campus: Campus): AssignmentInfo[] {
    try {
      const $ = cheerio.load(html);
      return $('.assignment-item').map((_, element): AssignmentInfo => {
        const $element = $(element);
        const attachments = this.parseAttachments($, $element.find('.attachments'));
        
        return {
          id: $element.attr('data-id') || `assignment_${Date.now()}_${_}`,
          title: $element.find('.assignment-title').text().trim(),
          content: $element.find('.assignment-content').text().trim(),
          description: $element.find('.assignment-description').text().trim(),
          dueDate: new Date($element.find('.due-date').text().trim()),
          startDate: new Date($element.find('.start-date').text().trim()),
          status: this.parseAssignmentStatus($element.find('.status').text().trim()),
          maxScore: parseInt($element.find('.max-score').text()) || 0,
          attachments,
          platform,
          timestamp: new Date(),
          campus
        };
      }).get();
    } catch (error) {
      throw new ParseError('과제 파싱 실패: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  // 도서관 상태 파싱
  parseLibraryStatus(html: string): LibraryResource {
    try {
      const $ = cheerio.load(html);
      
      const status = $('.room-status').map((_, element): LibraryStatus => {
        const $status = $(element);
        return {
          id: $status.attr('data-id') || `status_${Date.now()}_${_}`,
          type: $status.find('.room-type').text().trim(),
          capacity: parseInt($status.find('.capacity').text()) || 0,
          available: parseInt($status.find('.available').text()) || 0,
          status: this.parseLibraryStatusType($status.find('.status').text().trim())
        };
      }).get();

      const hours = $('.operation-hours').map((_, element): LibraryHours => {
        const $hours = $(element);
        return {
          facility: $hours.find('.facility-name').text().trim(),
          weekday: this.parseTimeRange($hours.find('.weekday').text().trim()),
          weekend: this.parseTimeRange($hours.find('.weekend').text().trim()),
          holiday: this.parseTimeRange($hours.find('.holiday').text().trim())
        };
      }).get();

      const notices = this.parseNotices($('.library-notices').html() || '', 'library', '신촌');

      return { status, hours, notices };
    } catch (error) {
      throw new ParseError('도서관 상태 파싱 실패: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  // 첨부파일 파싱
  private parseAttachments($: CheerioAPI, $container: cheerio.Cheerio<any>): AttachmentInfo[] {
    return $container.find('.attachment-item').map((_, attachment): AttachmentInfo => {
      const $attachment = $(attachment);
      
      return {
        id: $attachment.attr('data-id') || `attachment_${Date.now()}_${_}`,
        name: $attachment.find('.attachment-name').text().trim(),
        url: $attachment.find('.attachment-link').attr('href') || '',
        type: $attachment.find('.attachment-type').text().trim() || this.guessFileType($attachment.find('.attachment-name').text().trim()),
        size: this.parseFileSize($attachment.find('.attachment-size').text().trim())
      };
    }).get();
  }

  // 과제 상태 파싱
  private parseAssignmentStatus(status: string): AssignmentStatus {
    status = status.toLowerCase();
    if (status.includes('제출완료') || status.includes('submitted')) {
      return 'submitted';
    } else if (status.includes('채점완료') || status.includes('graded')) {
      return 'graded';
    }
    return 'not_submitted';
  }

  // 도서관 상태 타입 파싱
  private parseLibraryStatusType(status: string): 'open' | 'closed' | 'maintenance' {
    status = status.toLowerCase();
    if (status.includes('운영중') || status.includes('open')) return 'open';
    if (status.includes('점검중') || status.includes('maintenance')) return 'maintenance';
    return 'closed';
  }

  // 시간 범위 파싱
  private parseTimeRange(timeString: string): TimeRange {
    const [open = '', close = ''] = timeString.split('~').map(t => t.trim());
    return { open, close };
  }

  // 파일 크기 파싱
  private parseFileSize(sizeString: string): number {
    const match = sizeString.match(/^([\d.]+)\s*(KB|MB|GB|B)?$/i);
    if (!match) return 0;

    const [, size, unit = 'B'] = match;
    const multipliers = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024
    };

    return Math.round(parseFloat(size) * multipliers[unit.toUpperCase() as keyof typeof multipliers]);
  }

  // 파일 타입 추측
  private guessFileType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      zip: 'application/zip',
      txt: 'text/plain'
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }
}