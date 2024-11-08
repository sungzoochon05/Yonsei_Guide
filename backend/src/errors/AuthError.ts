export enum AuthErrorType {
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
    SESSION_EXPIRED = 'SESSION_EXPIRED',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    SSO_FAILURE = 'SSO_FAILURE',
    RATE_LIMIT = 'RATE_LIMIT',
    ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
    SYSTEM_ERROR = 'SYSTEM_ERROR'
  }
  
  export interface AuthErrorMetadata {
    timestamp: Date;
    source: string;
    attempts?: number;
    lockoutTime?: number;
    requestId?: string;
    serviceId?: string;
  }
  
  export class AuthError extends Error {
    public readonly type: AuthErrorType;
    public readonly status: number;
    public readonly metadata: AuthErrorMetadata;
  
    constructor(
      message: string,
      type: AuthErrorType,
      metadata: Partial<AuthErrorMetadata> = {}
    ) {
      super(message);
      this.name = 'AuthError';
      this.type = type;
      this.status = this.getStatusCode(type);
      this.metadata = {
        timestamp: new Date(),
        source: metadata.source || 'unknown',
        ...metadata
      };
    }
  
    private getStatusCode(type: AuthErrorType): number {
      const statusMap: { [key in AuthErrorType]: number } = {
        [AuthErrorType.INVALID_CREDENTIALS]: 401,
        [AuthErrorType.SESSION_EXPIRED]: 401,
        [AuthErrorType.UNAUTHORIZED]: 401,
        [AuthErrorType.FORBIDDEN]: 403,
        [AuthErrorType.TOKEN_EXPIRED]: 401,
        [AuthErrorType.SSO_FAILURE]: 502,
        [AuthErrorType.RATE_LIMIT]: 429,
        [AuthErrorType.ACCOUNT_LOCKED]: 423,
        [AuthErrorType.SYSTEM_ERROR]: 500
      };
      return statusMap[type];
    }
  
    public toJSON() {
      return {
        name: this.name,
        message: this.message,
        type: this.type,
        status: this.status,
        metadata: this.metadata
      };
    }
  }
  
  export class InvalidCredentialsError extends AuthError {
    constructor(message = '잘못된 로그인 정보입니다.', metadata?: Partial<AuthErrorMetadata>) {
      super(message, AuthErrorType.INVALID_CREDENTIALS, metadata);
    }
  }
  
  export class SessionExpiredError extends AuthError {
    constructor(message = '세션이 만료되었습니다. 다시 로그인해주세요.', metadata?: Partial<AuthErrorMetadata>) {
      super(message, AuthErrorType.SESSION_EXPIRED, metadata);
    }
  }
  
  export class UnauthorizedError extends AuthError {
    constructor(message = '인증이 필요합니다.', metadata?: Partial<AuthErrorMetadata>) {
      super(message, AuthErrorType.UNAUTHORIZED, metadata);
    }
  }
  
  export class ForbiddenError extends AuthError {
    constructor(message = '접근 권한이 없습니다.', metadata?: Partial<AuthErrorMetadata>) {
      super(message, AuthErrorType.FORBIDDEN, metadata);
    }
  }
  
  export class TokenExpiredError extends AuthError {
    constructor(message = '인증 토큰이 만료되었습니다.', metadata?: Partial<AuthErrorMetadata>) {
      super(message, AuthErrorType.TOKEN_EXPIRED, metadata);
    }
  }
  
  export class SSOFailureError extends AuthError {
    constructor(message = 'SSO 인증에 실패했습니다.', metadata?: Partial<AuthErrorMetadata>) {
      super(message, AuthErrorType.SSO_FAILURE, metadata);
    }
  }
  
  export class RateLimitError extends AuthError {
    constructor(
      message = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.',
      metadata?: Partial<AuthErrorMetadata>
    ) {
      super(message, AuthErrorType.RATE_LIMIT, metadata);
    }
  }
  
  export class AccountLockedError extends AuthError {
    constructor(
      message = '계정이 잠겼습니다. 관리자에게 문의하세요.',
      metadata?: Partial<AuthErrorMetadata>
    ) {
      super(message, AuthErrorType.ACCOUNT_LOCKED, metadata);
    }
  }