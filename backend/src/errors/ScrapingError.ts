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
export interface NetworkErrorOptions {
  type: 'timeout' | 'rateLimit' | 'connection' | 'unknown';
  retryAfter?: number;
  statusCode?: number;
  details?: Record<string, any>;
}
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly options: NetworkErrorOptions
  ) {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
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