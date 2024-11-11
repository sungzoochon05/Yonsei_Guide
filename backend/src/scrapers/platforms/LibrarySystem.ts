// src/scrapers/platforms/LibrarySystem.ts

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import {
  RoomInfo,
  ScrapingResult,
  ScrapingOptions, // 추가
  ScrapingConfig,   // 추가
  RoomSchedule
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
import { 
  LibraryPlatform, 
  PlatformCredentials 
} from '../../types/scraping/platforms';

interface RoomTimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
}

interface LibrarySystemCredentials {
  username: string;
  password: string;
}

interface RoomReservationRequest {
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
}

export class LibrarySystem implements LibraryPlatform {
  private readonly baseUrl: string = 'https://library.yonsei.ac.kr';
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
  async getLibraryResourceStatus(): Promise<LibraryResource> {
    try {
      const url = this.urlManager.getFullUrl('/status');
      const response = await this.contentExplorer.fetchPage(url);
      const data = this.adaptiveParser.parseLibraryStatus(response.data);
      return data;
    } catch (error) {
      throw error;
    }
  }
  async getScrapeData(url: string, config: ScrapingConfig): Promise<ScrapingResult<ScrapedData>> {
    try {
      const response = await this.contentExplorer.fetchPage(url);
      const data = this.adaptiveParser.parsePage(response.data);
      return {
        success: true,
        data,
        timestamp: new Date(),
        source: this.constructor.name
      };
    } catch (error) {
      throw error;
    }
  }
  async authenticate(credentials: LibrarySystemCredentials): Promise<boolean> {
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
      throw new AuthenticationError(`로그인 실패: ${getErrorMessage(error)}`);
    }
  }

  async getRooms(options?: ScrapingOptions): Promise<ScrapingResult<RoomInfo[]>> {
    try {
      if (!this.isAuthenticated) {
        throw new AuthenticationError('인증이 필요합니다');
      }

      const response = await this.axiosInstance.get('/rooms');
      const $ = cheerio.load(response.data);
      const rooms: RoomInfo[] = [];

      $('.room-item').each((_, element) => {
        const $room = $(element);
        const id = $room.attr('data-room-id');
        
        if (!id) {
          throw new ParseError('방 ID를 찾을 수 없습니다');
        }

        const schedule = this.parseRoomSchedule($, $room);
        const room: RoomInfo = {
          id,
          name: $room.find('.room-name').text().trim(),
          capacity: parseInt($room.find('.capacity').text()) || 0,
          available: $room.hasClass('available'),
          location: $room.find('.location').text().trim(),
          facilities: $room.find('.facilities li').map((_, li) => $(li).text().trim()).get(),
          schedule: schedule
        };

        rooms.push(room);
      });

      return {
        success: true,
        data: rooms,
        timestamp: new Date(),
        source: 'LibrarySystem'
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        throw new NetworkError(
          `열람실 정보 가져오기 실패: ${error.message}`,
          'request',
          error.response?.headers['retry-after'] ? 
            parseInt(error.response.headers['retry-after']) : undefined,
          error.response?.status
        );
      }
      throw new ParseError(`열람실 정보 파싱 실패: ${getErrorMessage(error)}`);
    }
  }

  async reserveRoom(roomId: string, timeSlot: string): Promise<ScrapingResult<boolean>> {
    try {
      if (!this.isAuthenticated) {
        throw new AuthenticationError('인증이 필요합니다');
      }

      // timeSlot 문자열 파싱 (예: "2024-03-20 14:00-16:00 스터디")
      const [date, time, purpose = '학습'] = timeSlot.split(' ');
      const [startTime, endTime] = time.split('-');

      // 예약 요청
      const response = await this.axiosInstance.post('/rooms/reserve', {
        roomId,
        date,
        startTime,
        endTime,
        purpose
      });

      const success = response.data.success === true;

      return {
        success,
        data: success,
        timestamp: new Date(),
        source: 'LibrarySystem',
        metadata: {
          reservationId: response.data.reservationId,
          message: response.data.message
        }
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        throw new NetworkError(
          `열람실 예약 실패: ${error.message}`,
          'request',
          error.response?.headers['retry-after'] ? 
            parseInt(error.response.headers['retry-after']) : undefined,
          error.response?.status
        );
      }
      throw new ParseError(`예약 처리 실패: ${getErrorMessage(error)}`);
    }
  }

  async cancelReservation(reservationId: string): Promise<ScrapingResult<boolean>> {
    try {
      if (!this.isAuthenticated) {
        throw new AuthenticationError('인증이 필요합니다');
      }

      const response = await this.axiosInstance.post(`/rooms/cancel/${reservationId}`);
      const success = response.data.success === true;

      return {
        success,
        data: success,
        timestamp: new Date(),
        source: 'LibrarySystem',
        metadata: {
          message: response.data.message
        }
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        throw new NetworkError(
          `예약 취소 실패: ${error.message}`,
          'request',
          error.response?.headers['retry-after'] ? 
            parseInt(error.response.headers['retry-after']) : undefined,
          error.response?.status
        );
      }
      throw new ParseError(`취소 처리 실패: ${getErrorMessage(error)}`);
    }
  }
  async getRoomSchedule(roomId: string): Promise<ScrapingResult<RoomSchedule[]>> {
    try {
      if (!this.isAuthenticated) {
        throw new AuthenticationError('인증이 필요합니다');
      }

      const response = await this.axiosInstance.get(`/rooms/${roomId}/schedule`);
      const $ = cheerio.load(response.data);
      
      const schedules: RoomSchedule[] = $('.schedule-row').map((_, element): RoomSchedule => {
        const $schedule = $(element);
        return {
          day: $schedule.find('.day').text().trim(),
          startTime: $schedule.find('.start-time').text().trim(),
          endTime: $schedule.find('.end-time').text().trim(),
          purpose: $schedule.find('.purpose').text().trim(),
          organizer: $schedule.find('.organizer').text().trim() || undefined
        };
      }).get();

      return {
        success: true,
        data: schedules,
        timestamp: new Date(),
        source: 'LibrarySystem'
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        throw new NetworkError(
          `스케줄 조회 실패: ${error.message}`,
          'request',
          error.response?.headers['retry-after'] ? 
            parseInt(error.response.headers['retry-after']) : undefined,
          error.response?.status
        );
      }
      throw new ParseError(`스케줄 파싱 실패: ${getErrorMessage(error)}`);
    }
  }
  private parseRoomSchedule($: CheerioAPI, $room: cheerio.Cheerio<any>): RoomSchedule[] {
    return $room.find('.schedule-item').map((_, schedule): RoomSchedule => {
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