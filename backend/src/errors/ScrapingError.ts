// src/errors/ScrapingError.ts

export class ScrapingError extends Error {
  constructor(
    message: string, 
    public readonly type: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ScrapingError';
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      details: this.details,
      stack: this.stack
    };
  }
}

export class NetworkError extends ScrapingError {
  readonly retryAfter: number;
  readonly statusCode?: number;

  constructor(
    message: string,
    type: string,
    retryAfter: number = 0,
    statusCode?: number,
    details?: Record<string, any>
  ) {
    super(message, `network.${type}`, details);
    this.name = 'NetworkError';
    this.retryAfter = retryAfter;
    this.statusCode = statusCode;
  }

  static createTimeout(message: string = 'Request timed out'): NetworkError {
    return new NetworkError(message, 'timeout', 5000);
  }

  static createRateLimit(retryAfter: number): NetworkError {
    return new NetworkError(
      `Rate limit exceeded. Try again after ${retryAfter} seconds`,
      'rateLimit',
      retryAfter * 1000
    );
  }

  isRetryable(): boolean {
    return ['timeout', 'connection', 'rateLimit'].includes(this.type);
  }
}

export class ParseError extends ScrapingError {
  constructor(
    message: string,
    details?: Record<string, any>
  ) {
    super(message, 'parse', details);
    this.name = 'ParseError';
  }
}

export class AuthenticationError extends ScrapingError {
  constructor(
    message: string,
    details?: Record<string, any>
  ) {
    super(message, 'authentication', details);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends ScrapingError {
  constructor(
    message: string,
    details?: Record<string, any>
  ) {
    super(message, 'validation', details);
    this.name = 'ValidationError';
  }
}