// src/scrapers/components/URLManager.ts

export class URLManager {
    constructor(private readonly baseUrl: string) {}
  
    private joinUrl(...parts: string[]): string {
      return parts
        .map(part => part.replace(/^\/+|\/+$/g, ''))
        .filter(Boolean)
        .join('/');
    }
  
    getFullUrl(path: string): string {
      return this.joinUrl(this.baseUrl, path);
    }
  
    getCourseListUrl(): string {
      return this.getFullUrl('/my/');
    }
  
    getCourseUrl(courseId: string): string {
      return this.getFullUrl(`/course/view.php?id=${courseId}`);
    }
  
    getCourseNoticesUrl(courseId: string): string {
      return this.getFullUrl(`/course/notices.php?id=${courseId}`);
    }
  
    getCourseAssignmentsUrl(courseId: string): string {
      return this.getFullUrl(`/mod/assign/index.php?id=${courseId}`);
    }
  
    getCourseResourcesUrl(courseId: string): string {
      return this.getFullUrl(`/course/resources.php?id=${courseId}`);
    }
  
    getCourseGradeUrl(courseId: string): string {
      return this.getFullUrl(`/grade/report/user/index.php?id=${courseId}`);
    }
  
    getCourseAttendanceUrl(courseId: string): string {
      return this.getFullUrl(`/mod/attendance/view.php?id=${courseId}`);
    }
  
    getCourseSyllabusUrl(courseId: string): string {
      return this.getFullUrl(`/course/syllabus.php?id=${courseId}`);
    }
  
    getProfileUrl(userId: string): string {
      return this.getFullUrl(`/user/profile.php?id=${userId}`);
    }
  
    getLoginUrl(): string {
      return this.getFullUrl('/login.php');
    }
  
    getLogoutUrl(): string {
      return this.getFullUrl('/login/logout.php');
    }
  
    getNotificationUrl(): string {
      return this.getFullUrl('/local/ubnotification/index.php');
    }
  
    getCalendarUrl(): string {
      return this.getFullUrl('/calendar/view.php');
    }
  
    formatQueryParams(params: Record<string, string | number | boolean>): string {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        queryParams.append(key, String(value));
      });
      return queryParams.toString();
    }
  
    getUrlWithParams(baseUrl: string, params: Record<string, string | number | boolean>): string {
      const queryString = this.formatQueryParams(params);
      return queryString ? `${baseUrl}?${queryString}` : baseUrl;
    }
  }