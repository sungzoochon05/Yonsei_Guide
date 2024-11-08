import { 
  ChatMessage, 
  ChatResponse, 
  ChatSession, 
  TimeoutError,
  AuthenticationError,
  SystemConfig,
  APIResponse
} from '../types/backendInterfaces';
import { BackendOpenAIService } from './BackendOpenAIService';
import { BackendWebScrapingService } from './BackendWebScrapingService';
import { Logger } from '../utils/Logger';
import { Cache } from '../utils/Cache';
import { EventEmitter } from 'events';

export class BackendChatService extends EventEmitter {
  private openAIService: BackendOpenAIService;
  private scrapingService: BackendWebScrapingService;
  private sessions: Map<string, ChatSession>;
  private cache: Cache;
  private logger: Logger;
  private config: SystemConfig;

  constructor(
    openAIService: BackendOpenAIService,
    scrapingService: BackendWebScrapingService,
    config: SystemConfig
  ) {
    super();
    this.openAIService = openAIService;
    this.scrapingService = scrapingService;
    this.sessions = new Map();
    this.config = config;
    this.cache = new Cache(config.cache);
    this.logger = new Logger('BackendChatService');

    // 세션 정리 스케줄러 설정
    setInterval(() => this.cleanupSessions(), 1800000); // 30분마다 실행
  }

  private validateMessage(message: Partial<ChatMessage>): ChatMessage {
    if (!message.role || !['user', 'assistant'].includes(message.role)) {
      throw new Error('Invalid message role');
    }
    if (!message.content || typeof message.content !== 'string') {
      throw new Error('Invalid message content');
    }
    return {
      role: message.role as 'user' | 'assistant',
      content: message.content,
      timestamp: message.timestamp || new Date(),
      status: message.status || 'pending',
      metadata: message.metadata || {}
    };
  }

  private async updateSessionMetrics(session: ChatSession): Promise<void> {
    session.metadata.messageCount++;
    session.metadata.lastActive = new Date();
    this.emit('sessionUpdate', {
      sessionId: session.id,
      metrics: session.metadata
    });
  }

  async initializeSession(userId: string, campus: '신촌' | '원주'): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: ChatSession = {
      id: sessionId,
      userId: userId,
      messages: [],
      context: {
        campus: campus,
        lastUpdate: new Date(),
        preferences: {},
        activeServices: [],
        lastAccessedSystems: []
      },
      metadata: {
        createdAt: new Date(),
        lastActive: new Date(),
        messageCount: 0,
        platform: 'web',
      }
    };

    this.sessions.set(sessionId, session);
    this.logger.info(`Session initialized`, { sessionId, userId, campus });
    return sessionId;
  }

  async processMessage(sessionId: string, userMessage: string): Promise<APIResponse<ChatResponse>> {
    const startTime = Date.now();
    let session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error('Invalid session ID');
    }

    try {
      // 새 메시지 추가
      const newMessage = this.validateMessage({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
        status: 'sent'
      });

      session.messages.push(newMessage);

      // 컨텍스트 분석
      const intent = await this.openAIService.analyzeIntent(userMessage, session.context);
      
      // 필요한 데이터 스크래핑
      let scrapingResults = [];
      if (intent.requiresDataFetch) {
        scrapingResults = await Promise.all(
          intent.dataSources.map(source => 
            this.scrapingService.fetchData(source, session.context.campus)
          )
        );
      }

      // AI 응답 생성
      const aiResponse = await this.openAIService.generateResponse(
        session.messages,
        {
          ...session.context,
          scrapingResults,
          intent
        }
      );

      // 응답 검증 및 후처리
      if (!aiResponse || typeof aiResponse.content !== 'string') {
        throw new Error('Invalid AI response');
      }

      // 응답 메시지 추가
      const assistantMessage = this.validateMessage({
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        status: 'delivered',
        metadata: {
          sourceSystem: intent.dataSources.join(','),
          confidence: intent.confidence,
          processingTime: Date.now() - startTime
        }
      });

      session.messages.push(assistantMessage);

      // 세션 메트릭스 업데이트
      await this.updateSessionMetrics(session);

      // 컨텍스트 업데이트
      session.context.lastUpdate = new Date();
      if (intent.dataSources.length > 0) {
        session.context.lastAccessedSystems = [
          ...new Set([...session.context.lastAccessedSystems, ...intent.dataSources])
        ].slice(-5); // 최근 5개만 유지
      }

      // 캐시 업데이트
      await this.updateSessionCache(session);

      return {
        success: true,
        data: {
          content: aiResponse.content,
          metadata: {
            ...aiResponse.metadata,
            processingTime: Date.now() - startTime,
            confidence: intent.confidence,
            suggestedActions: intent.suggestedActions
          }
        },
        metadata: {
          timestamp: new Date(),
          requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          processingTime: Date.now() - startTime
        }
      };

    } catch (error) {
      this.logger.error('Error processing message', { 
        sessionId, 
        error: error.message,
        stack: error.stack 
      });

      if (error instanceof TimeoutError) {
        throw error;
      }

      if (error instanceof AuthenticationError) {
        // 인증 관련 오류 처리
        session.context.activeServices = session.context.activeServices.filter(
          service => service !== error.system
        );
        throw error;
      }

      throw new Error(`Failed to process message: ${error.message}`);
    }
  }

  async updateSessionCache(session: ChatSession): Promise<void> {
    const cacheKey = `session:${session.id}`;
    await this.cache.set(cacheKey, session, this.config.cache.ttl);
  }

  private async cleanupSessions(): Promise<void> {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now.getTime() - session.metadata.lastActive.getTime();
      if (inactiveTime > this.config.timeout.default) {
        this.sessions.delete(sessionId);
        this.logger.info(`Session cleaned up due to inactivity`, { sessionId });
        this.emit('sessionClosed', { sessionId, reason: 'timeout' });
      }
    }
  }

  // 세션 관리 메서드들
  async getSession(sessionId: string): Promise<ChatSession | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      // 캐시에서 세션 확인
      const cachedSession = await this.cache.get(`session:${sessionId}`);
      if (cachedSession) {
        this.sessions.set(sessionId, cachedSession);
        return cachedSession;
      }
    }
    return session;
  }

  async clearSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    await this.cache.delete(`session:${sessionId}`);
    this.logger.info(`Session cleared`, { sessionId });
    this.emit('sessionClosed', { sessionId, reason: 'manual' });
  }

  async updateSessionContext(
    sessionId: string, 
    context: Partial<ChatSession['context']>
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.context = { 
        ...session.context, 
        ...context,
        lastUpdate: new Date()
      };
      await this.updateSessionCache(session);
      this.emit('contextUpdated', { sessionId, context: session.context });
    }
  }

  async getMessageHistory(
    sessionId: string,
    limit?: number,
    beforeTimestamp?: Date
  ): Promise<ChatMessage[]> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return [];
    }

    let messages = session.messages;
    if (beforeTimestamp) {
      messages = messages.filter(msg => msg.timestamp < beforeTimestamp);
    }
    if (limit) {
      messages = messages.slice(-limit);
    }

    return messages;
  }

  async deleteMessage(sessionId: string, timestamp: Date): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return false;
    }

    const initialLength = session.messages.length;
    session.messages = session.messages.filter(msg => msg.timestamp !== timestamp);

    if (session.messages.length !== initialLength) {
      await this.updateSessionCache(session);
      this.emit('messageDeleted', { sessionId, timestamp });
      return true;
    }

    return false;
  }

  // 모니터링 및 디버깅 메서드들
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  getSessionMetrics(sessionId: string): Pick<ChatSession, 'metadata'> | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      return { metadata: session.metadata };
    }
  }

  async exportSessionData(sessionId: string): Promise<ChatSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return JSON.parse(JSON.stringify(session)); // Deep copy
  }
}