import { ChatResponse, ChatMessage, ChatRole, ScrapedData, IntentAnalysis } from '../types/backendInterfaces';
import BackendOpenAIService from './BackendOpenAIService';
import BackendWebScrapingService from './BackendWebScrapingService';
import { NetworkError } from '../errors/NetworkError';

interface ChatContext {
  conversationId: string;
  previousMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  currentTopic?: string;
  lastIntent?: IntentAnalysis;
  campus: '신촌' | '원주';
  lastUpdate: Date;
  messageCount: number;
  relevantData?: ScrapedData[];
}

interface ProcessMessageResult {
  response: ChatResponse;
  updatedContext: ChatContext;
  scrapedData?: ScrapedData[];
}

export class BackendChatService {
  private static instance: BackendChatService;
  private openAIService: BackendOpenAIService;
  private webScrapingService: BackendWebScrapingService;
  private contexts: Map<string, ChatContext>;
  
  private readonly MAX_CONTEXT_MESSAGES = 10;
  private readonly CONTEXT_EXPIRY = 30 * 60 * 1000; // 30분
  private readonly MAX_RETRIES = 3;

  private constructor() {
    this.openAIService = BackendOpenAIService.getInstance();
    this.webScrapingService = BackendWebScrapingService.getInstance();
    this.contexts = new Map();

    // 주기적으로 만료된 컨텍스트 정리
    setInterval(() => this.cleanExpiredContexts(), 5 * 60 * 1000);
  }

  public static getInstance(): BackendChatService {
    if (!BackendChatService.instance) {
      BackendChatService.instance = new BackendChatService();
    }
    return BackendChatService.instance;
  }

  public async processMessage(
    message: string,
    conversationId: string,
    campus: '신촌' | '원주' = '신촌'
  ): Promise<ProcessMessageResult> {
    let context = this.getOrCreateContext(conversationId, campus);
    let retryCount = 0;

    while (retryCount < this.MAX_RETRIES) {
      try {
        // 1. 의도 분석
        const intent = await this.analyzeIntent(message, context);
        
        // 2. 관련 데이터 수집
        const scrapedData = await this.collectRelevantData(intent, context);
        
        // 3. 응답 생성
        const response = await this.generateResponse(message, context, scrapedData);
        
        // 4. 컨텍스트 업데이트
        const updatedContext = this.updateContext(context, message, response, intent, scrapedData);
        
        return {
          response,
          updatedContext,
          scrapedData
        };

      } catch (error) {
        retryCount++;
        if (retryCount === this.MAX_RETRIES) {
          throw this.handleError(error);
        }
        await this.delay(1000 * retryCount);
      }
    }

    throw new Error('Maximum retry attempts exceeded');
  }

  private getOrCreateContext(
    conversationId: string,
    campus: '신촌' | '원주'
  ): ChatContext {
    let context = this.contexts.get(conversationId);
    
    if (!context || this.isContextExpired(context)) {
      context = {
        conversationId,
        previousMessages: [],
        campus,
        lastUpdate: new Date(),
        messageCount: 0
      };
      this.contexts.set(conversationId, context);
    }
    
    return context;
  }

  private async analyzeIntent(
    message: string,
    context: ChatContext
  ): Promise<IntentAnalysis> {
    try {
      // 컨텍스트 기반 의도 분석
      const contextualMessage = this.buildContextualMessage(message, context);
      return await this.openAIService.analyzeIntent(contextualMessage, context.campus);
    } catch (error) {
      console.error('Intent analysis error:', error);
      throw new Error('의도 분석 중 오류가 발생했습니다.');
    }
  }

  private async collectRelevantData(
    intent: IntentAnalysis,
    context: ChatContext
  ): Promise<ScrapedData[]> {
    if (intent.confidence < 0.5 || intent.category === 'general') {
      return [];
    }

    try {
      const data = await this.webScrapingService.scrapeByCategory(
        intent.category,
        {
          campus: context.campus,
          count: 10
        }
      );

      return Array.isArray(data) ? data : [];

    } catch (error) {
      console.error('Data collection error:', error);
      return [];
    }
  }

  private async generateResponse(
    message: string,
    context: ChatContext,
    scrapedData?: ScrapedData[]
  ): Promise<ChatResponse> {
    const contextString = this.buildContextString(context);
    
    return await this.openAIService.generateResponse(
      message,
      contextString,
      scrapedData,
      context.campus
    );
  }

  private updateContext(
    context: ChatContext,
    message: string,
    response: ChatResponse,
    intent: IntentAnalysis,
    scrapedData?: ScrapedData[]
  ): ChatContext {
    // 이전 메시지 업데이트
    context.previousMessages = [
      ...context.previousMessages,
      {
        role: 'user',
        content: message,
        timestamp: new Date()
      },
      {
        role: 'assistant',
        content: response.text,
        timestamp: new Date()
      }
    ].slice(-this.MAX_CONTEXT_MESSAGES);

    // 컨텍스트 정보 업데이트
    context.currentTopic = this.determineCurrentTopic(intent, context.currentTopic);
    context.lastIntent = intent;
    context.lastUpdate = new Date();
    context.messageCount += 1;
    context.relevantData = scrapedData;

    this.contexts.set(context.conversationId, context);
    return context;
  }

  private buildContextualMessage(message: string, context: ChatContext): string {
    const contextParts = [];

    if (context.currentTopic) {
      contextParts.push(`Current topic: ${context.currentTopic}`);
    }

    if (context.lastIntent) {
      contextParts.push(`Previous intent: ${context.lastIntent.category}`);
    }

    const recentMessages = context.previousMessages
      .slice(-2)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    if (recentMessages) {
      contextParts.push(`Recent messages:\n${recentMessages}`);
    }

    return `${contextParts.join('\n')}\nUser message: ${message}`;
  }

  private buildContextString(context: ChatContext): string {
    const parts = [];

    if (context.previousMessages.length > 0) {
      const recentMessages = context.previousMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      parts.push(`대화 내역:\n${recentMessages}`);
    }

    if (context.currentTopic) {
      parts.push(`현재 주제: ${context.currentTopic}`);
    }

    if (context.relevantData?.length) {
      parts.push(`관련 정보 수: ${context.relevantData.length}개`);
    }

    return parts.join('\n\n');
  }

  private determineCurrentTopic(
    intent: IntentAnalysis,
    currentTopic?: string
  ): string | undefined {
    if (intent.confidence > 0.7) {
      return intent.category;
    }
    return currentTopic;
  }

  private isContextExpired(context: ChatContext): boolean {
    return Date.now() - context.lastUpdate.getTime() > this.CONTEXT_EXPIRY;
  }

  private cleanExpiredContexts(): void {
    const now = Date.now();
    for (const [id, context] of this.contexts.entries()) {
      if (now - context.lastUpdate.getTime() > this.CONTEXT_EXPIRY) {
        this.contexts.delete(id);
      }
    }
  }

  private handleError(error: any): Error {
    if (error instanceof NetworkError) {
      return new Error('네트워크 연결에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }

    if (error instanceof TimeoutError) {
      return new Error('서버 응답 시간이 초과되었습니다. 다시 시도해주세요.');
    }

    console.error('Chat service error:', error);
    return new Error('죄송합니다. 요청을 처리하는 중에 오류가 발생했습니다.');
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async resetContext(conversationId: string): Promise<void> {
    this.contexts.delete(conversationId);
  }

  public async updateCampus(
    conversationId: string,
    campus: '신촌' | '원주'
  ): Promise<void> {
    const context = this.contexts.get(conversationId);
    if (context) {
      context.campus = campus;
      context.lastUpdate = new Date();
      this.contexts.set(conversationId, context);
    }
  }

  public getContextStats(): {
    activeContexts: number;
    averageMessagesPerContext: number;
    oldestContext: Date;
  } {
    const contexts = Array.from(this.contexts.values());
    const totalMessages = contexts.reduce((sum, ctx) => sum + ctx.messageCount, 0);
    const oldestUpdate = Math.min(...contexts.map(ctx => ctx.lastUpdate.getTime()));

    return {
      activeContexts: this.contexts.size,
      averageMessagesPerContext: totalMessages / (this.contexts.size || 1),
      oldestContext: new Date(oldestUpdate)
    };
  }
}

export default BackendChatService;