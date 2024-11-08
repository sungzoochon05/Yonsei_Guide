// src/errors/NetworkError.ts

export type NetworkErrorType = 'timeout' | 'rateLimit' | 'connection' | 'unknown';

export interface NetworkErrorOptions {
  type: NetworkErrorType;
  retryAfter?: number;
  statusCode?: number;
  details?: Record<string, any>;
}

export class NetworkError extends Error {
  private readonly _type: NetworkErrorType;
  private readonly _retryAfter?: number;
  private readonly _statusCode?: number;
  private readonly _details?: Record<string, any>;

  constructor(message: string, options: NetworkErrorOptions) {
    super(message);
    this.name = 'NetworkError';
    this._type = options.type;
    this._retryAfter = options.retryAfter;
    this._statusCode = options.statusCode;
    this._details = options.details;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }

  get type(): string {
    return this._type;
  }

  get retryAfter(): number | undefined {
    return this._retryAfter;
  }

  get statusCode(): number | undefined {
    return this._statusCode;
  }

  get details(): Record<string, any> | undefined {
    return this._details;
  }

  static createTimeout(message: string = '요청 시간이 초과되었습니다'): NetworkError {
    return new NetworkError(message, {
      type: 'timeout',
      statusCode: 408
    });
  }

  static createRateLimit(message: string, retryAfter: number): NetworkError {
    return new NetworkError(message, {
      type: 'rateLimit',
      retryAfter,
      statusCode: 429
    });
  }

  static createConnection(message: string = '네트워크 연결 오류가 발생했습니다'): NetworkError {
    return new NetworkError(message, {
      type: 'connection'
    });
  }

  static createUnknown(message: string = '알 수 없는 오류가 발생했습니다', details?: Record<string, any>): NetworkError {
    return new NetworkError(message, {
      type: 'unknown',
      details
    });
  }

  isRetryable(): boolean {
    return ['timeout', 'connection', 'rateLimit'].includes(this._type);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this._type,
      retryAfter: this._retryAfter,
      statusCode: this._statusCode,
      details: this._details
    };
  }
}