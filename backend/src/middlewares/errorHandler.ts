import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

// 비동기 에러 처리를 위한 래퍼 함수
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 기본 에러 응답 포맷
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
  timestamp: Date;
  path?: string;
}

// 메인 에러 핸들러
export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    details: err.details
  });

  const response: ErrorResponse = {
    success: false,
    error: {
      message: err.message || '알 수 없는 오류가 발생했습니다.',
      code: err.code,
      details: err.details
    },
    timestamp: new Date(),
    path: req.path
  };

  // HTTP 상태 코드 결정
  const status = err.status || 500;

  // 개발 환경에서만 스택 트레이스 포함
  if (process.env.NODE_ENV === 'development') {
    response.error.details = {
      ...response.error.details,
      stack: err.stack
    };
  }

  res.status(status).json(response);
};

// 특정 에러 타입들
export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
  status: number;
}

export class NotFoundError extends Error {
  constructor(message: string = '요청하신 리소스를 찾을 수 없습니다.') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
  status: number;
}

export class ScrapingError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ScrapingError';
    this.status = 500;
    this.code = 'SCRAPING_ERROR';
  }
  status: number;
  code: string;
}

// API 속도 제한 초과 에러
export class RateLimitError extends Error {
  constructor(message: string = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.') {
    super(message);
    this.name = 'RateLimitError';
    this.status = 429;
  }
  status: number;
}

// OpenAI API 에러
export class OpenAIError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'OpenAIError';
    this.status = 500;
    this.code = 'OPENAI_ERROR';
  }
  status: number;
  code: string;
}

// 네트워크 에러
export class NetworkError extends Error {
  constructor(message: string = '네트워크 연결에 실패했습니다.') {
    super(message);
    this.name = 'NetworkError';
    this.status = 503;
    this.code = 'NETWORK_ERROR';
  }
  status: number;
  code: string;
}

// 타임아웃 에러
export class TimeoutError extends Error {
  constructor(message: string = '요청 시간이 초과되었습니다.') {
    super(message);
    this.name = 'TimeoutError';
    this.status = 504;
    this.code = 'TIMEOUT_ERROR';
  }
  status: number;
  code: string;
}