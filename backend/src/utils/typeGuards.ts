// src/utils/typeGuards.ts

import { AxiosError } from 'axios';
import {
  CourseInfo,
  NoticeInfo,
  AssignmentInfo,
  RoomInfo,
  AttachmentInfo,
  ScrapingResult
} from '../types/backendInterfaces';

// 기본 타입 검사
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Axios 관련 타입 가드
export function isAxiosError(error: unknown): error is AxiosError {
  return error instanceof Error && 'isAxiosError' in error;
}

// 도메인 타입 가드
export function isCourseInfo(obj: unknown): obj is CourseInfo {
  if (!isObject(obj)) return false;
  
  const required = ['id', 'name', 'professor', 'semester', 'url', 'platform'] as const;
  return required.every(prop => prop in obj);
}

export function isNoticeInfo(obj: unknown): obj is NoticeInfo {
  if (!isObject(obj)) return false;
  
  const required = ['id', 'title', 'content', 'author', 'date', 'platform'] as const;
  return required.every(prop => prop in obj);
}

export function isAssignmentInfo(obj: unknown): obj is AssignmentInfo {
  if (!isObject(obj)) return false;
  
  const required = ['id', 'title', 'description', 'dueDate', 'startDate', 'status', 'maxScore', 'platform'] as const;
  return required.every(prop => prop in obj);
}

export function isRoomInfo(obj: unknown): obj is RoomInfo {
  if (!isObject(obj)) return false;
  
  const required = ['id', 'name', 'capacity', 'available', 'location'] as const;
  return required.every(prop => prop in obj);
}

export function isAttachmentInfo(obj: unknown): obj is AttachmentInfo {
  if (!isObject(obj)) return false;
  
  const required = ['id', 'name', 'url'] as const;
  return required.every(prop => prop in obj);
}

// 배열 타입 가드
export function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

// 스크래핑 결과 타입 가드
export function isScrapingResult<T>(
  value: unknown,
  dataGuard: (data: unknown) => data is T
): value is ScrapingResult<T> {
  if (!isObject(value)) return false;

  const maybeResult = value as Partial<ScrapingResult<unknown>>;
  
  // 필수 필드 존재 여부 확인
  if (!('success' in value && 'timestamp' in value && 'source' in value && 'data' in value)) {
    return false;
  }

  // 각 필드의 타입 검사
  if (typeof maybeResult.success !== 'boolean') return false;
  if (!isDate(maybeResult.timestamp!)) return false;
  if (!isString(maybeResult.source!)) return false;
  if (maybeResult.data !== null && !dataGuard(maybeResult.data)) return false;

  return true;
}

// 에러 관련 유틸리티
export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    isObject(error) &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) return error.message;
  return String(error);
}

// 데이터 파싱 유틸리티
export function parseFileSizeToBytes(sizeStr: string | undefined): number | undefined {
  if (!sizeStr) return undefined;
  
  const units = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024
  };

  const match = sizeStr.match(/^([\d.]+)\s*([KMGT]?B)$/i);
  if (!match) return undefined;

  const size = parseFloat(match[1]);
  const unit = match[2].toUpperCase() as keyof typeof units;

  if (isNaN(size) || !(unit in units)) return undefined;
  
  return Math.floor(size * units[unit]);
}

// 날짜 파싱 유틸리티
export function parseDateString(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;
  
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? undefined : date;
}