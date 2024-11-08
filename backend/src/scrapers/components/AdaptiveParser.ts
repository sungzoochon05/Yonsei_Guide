// src/scrapers/components/AdaptiveParser.ts

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { ParseError } from '../../errors/ScrapingError';
import { 
  CourseInfo, 
  NoticeInfo, 
  AssignmentInfo,
  AttachmentInfo,
  AssignmentStatus 
} from '../../types/backendInterfaces';
import { parseFileSizeToBytes } from '../../utils/typeGuards';

export class AdaptiveParser {
  parseCourseList(html: string, platform: 'learnus' | 'portal'): CourseInfo[] {
    try {
      const $ = cheerio.load(html);
      return $('.course-list-item').map((_, element): CourseInfo => {
        const $element = $(element);
        return {
          id: $element.attr('data-courseid') || '',
          name: $element.find('.course-title').text().trim(),
          professor: $element.find('.professor-name').text().trim(),
          semester: $element.find('.semester-info').text().trim(),
          url: $element.find('a').attr('href') || '',
          description: $element.find('.course-description').text().trim(),
          credits: parseInt($element.find('.course-credits').text().trim()) || 0,
          department: $element.find('.department-name').text().trim(),
          schedule: $element.find('.course-schedule li').map((_, schedule) => 
            $(schedule).text().trim()
          ).get(),
          platform
        };
      }).get();
    } catch (error) {
      throw new ParseError('강좌 목록 파싱 실패');
    }
  }

  parseCourseDetails(html: string, platform: 'learnus' | 'portal'): CourseInfo {
    try {
      const $ = cheerio.load(html);
      const $course = $('.course-details');

      if (!$course.length) {
        throw new ParseError('강좌 상세 정보를 찾을 수 없습니다');
      }

      return {
        id: $course.attr('data-course-id') || '',
        name: $course.find('.course-name').text().trim(),
        professor: $course.find('.professor-name').text().trim(),
        semester: $course.find('.semester-info').text().trim(),
        url: $course.find('.course-link').attr('href') || '',
        description: this.parseDescription($, $course),
        credits: parseInt($course.find('.credits').text().trim()) || 0,
        schedule: this.parseSchedule($, $course),
        department: $course.find('.department').text().trim(),
        platform
      };
    } catch (error) {
      throw new ParseError('강좌 상세 정보 파싱 실패');
    }
  }

  parseNotices(html: string, platform: string): NoticeInfo[] {
    try {
      const $ = cheerio.load(html);
      return $('.notice-item').map((_, element): NoticeInfo => {
        const $element = $(element);
        const attachments = this.parseAttachments($, $element.find('.attachments'));

        return {
          id: $element.attr('data-id') || '',
          title: $element.find('.notice-title').text().trim(),
          content: $element.find('.notice-content').text().trim(),
          author: $element.find('.notice-author').text().trim(),
          date: new Date($element.find('.notice-date').text().trim()),
          important: $element.hasClass('important-notice'),
          views: parseInt($element.find('.notice-views').text().trim()) || 0,
          attachments,
          platform
        };
      }).get();
    } catch (error) {
      throw new ParseError('공지사항 파싱 실패');
    }
  }

  parseAssignments(html: string, platform: string): AssignmentInfo[] {
    try {
      const $ = cheerio.load(html);
      return $('.assignment-item').map((_, element): AssignmentInfo => {
        const $element = $(element);
        const attachments = this.parseAttachments($, $element.find('.attachments'));
        
        return {
          id: $element.attr('data-id') || '',
          title: $element.find('.assignment-title').text().trim(),
          description: $element.find('.assignment-description').text().trim(),
          dueDate: new Date($element.find('.due-date').text().trim()),
          startDate: new Date($element.find('.start-date').text().trim()),
          status: this.parseAssignmentStatus($element.find('.status').text().trim()),
          maxScore: parseInt($element.find('.max-score').text().trim()) || 0,
          attachments,
          platform
        };
      }).get();
    } catch (error) {
      throw new ParseError('과제 파싱 실패');
    }
  }

  private parseAttachments($: CheerioAPI, $container: cheerio.Cheerio<any>): AttachmentInfo[] {
    return $container.find('.attachment-item').map((_: number, attachment: any): AttachmentInfo => {
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

  private parseDescription($: CheerioAPI, $course: cheerio.Cheerio<any>): string {
    let description = $course.find('.course-description').text().trim();
    const objectives = $course.find('.course-objectives li').map((_, el) => 
      $(el).text().trim()
    ).get();

    if (objectives.length) {
      description += '\n\n강의 목표:\n' + objectives.map(obj => `- ${obj}`).join('\n');
    }

    const syllabus = $course.find('.course-syllabus').html();
    if (syllabus) {
      description += '\n\n강의계획서:\n' + cheerio.load(syllabus).text().trim();
    }

    return description;
  }

  private parseSchedule($: CheerioAPI, $course: cheerio.Cheerio<any>): string[] {
    return $course.find('.schedule li').map((_, element): string => {
      const $schedule = $(element);
      const day = $schedule.find('.day').text().trim();
      const time = $schedule.find('.time').text().trim();
      const location = $schedule.find('.location').text().trim();
      return `${day} ${time} (${location})`;
    }).get();
  }

  private parseAssignmentStatus(status: string): AssignmentStatus {
    status = status.toLowerCase();
    if (status.includes('제출완료') || status.includes('submitted')) {
      return 'submitted';
    } else if (status.includes('채점완료') || status.includes('graded')) {
      return 'graded';
    }
    return 'not_submitted';
  }
}