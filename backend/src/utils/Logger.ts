export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error'
  }
  
  export class Logger {
    private serviceName: string;
    private static logLevel: LogLevel = LogLevel.INFO;
  
    constructor(serviceName: string) {
      this.serviceName = serviceName;
    }
  
    static setLogLevel(level: LogLevel): void {
      Logger.logLevel = level;
    }
  
    private formatMessage(level: LogLevel, message: string, meta?: any): string {
      const timestamp = new Date().toISOString();
      const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
      return `[${timestamp}] [${level.toUpperCase()}] [${this.serviceName}] ${message}${metaStr}`;
    }
  
    private shouldLog(level: LogLevel): boolean {
      const levels = Object.values(LogLevel);
      return levels.indexOf(level) >= levels.indexOf(Logger.logLevel);
    }
  
    debug(message: string, meta?: any): void {
      if (this.shouldLog(LogLevel.DEBUG)) {
        console.debug(this.formatMessage(LogLevel.DEBUG, message, meta));
      }
    }
  
    info(message: string, meta?: any): void {
      if (this.shouldLog(LogLevel.INFO)) {
        console.info(this.formatMessage(LogLevel.INFO, message, meta));
      }
    }
  
    warn(message: string, meta?: any): void {
      if (this.shouldLog(LogLevel.WARN)) {
        console.warn(this.formatMessage(LogLevel.WARN, message, meta));
      }
    }
  
    error(message: string, meta?: any): void {
      if (this.shouldLog(LogLevel.ERROR)) {
        console.error(this.formatMessage(LogLevel.ERROR, message, meta));
      }
    }
  }