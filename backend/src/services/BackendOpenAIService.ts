import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { OpenAI } from 'openai';
import { 
  ScrapedData, 
  ChatResponse, 
  IntentAnalysis 
} from '../types/backendInterfaces';
import { CacheManager } from '../scrapers/components/CacheManager';
import { NetworkError } from '../errors/NetworkError';

// 환경 설정 인터페이스
declare const config: {
  openaiApiKey: string;
  timeout?: number;
  organization?: string;
};

interface TokenProcessor {
  processTitle: (token: string) => void;
  processContent: (token: string) => void;
  processMeta: (token: string) => void;
}

interface ChatContext {
  conversationId: string;
  messageHistory: ChatCompletionMessageParam[];
  campus: '신촌' | '원주';
  lastIntent?: IntentAnalysis;
  relevantData?: ScrapedData[];
}

interface PromptTemplate {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class BackendOpenAIService {
  private static instance: BackendOpenAIService;
  private openai: OpenAI;
  private contexts: Map<string, ChatContext>;
  private cacheManager: CacheManager;
  private readonly MAX_CONTEXT_MESSAGES = 10;
  private readonly MAX_TOKENS = 4000;

  private readonly basePrompt: PromptTemplate = {
    role: 'system',
    content: `당신은 연세대학교의 AI 도우미입니다. 
학교의 모든 정보를 정확하고 친절하게 안내해주세요.

다음 원칙들을 반드시 준수해주세요:

1. 답변 스타일
- 공손하고 친근한 말투를 사용합니다 (예: "안녕하세요", "~입니다", "~해주세요")
- 정확한 정보만을 제공합니다
- 불확실한 정보는 반드시 그렇다고 명시합니다
- 전문적이면서도 이해하기 쉽게 설명합니다
- 필요한 경우 단계별로 설명합니다

2. 정보 제공 원칙
- 연세대학교의 공식 정보만을 제공합니다
- 주어진 최신 데이터를 우선적으로 활용합니다
- 시간/장소가 중요한 정보는 반드시 명시합니다
- 추가 정보가 필요한 경우 관련 부서나 웹사이트를 안내합니다
- 캠퍼스별 차이가 있는 경우 반드시 구분하여 설명합니다

3. 제한사항
- 개인정보는 절대 다루지 않습니다
- 확실하지 않은 정보는 제공하지 않습니다
- 학교 정책이나 규정에 반하는 조언은 하지 않습니다
- 민감한 주제는 공식 창구로 안내합니다

4. 데이터 활용
- 스크래핑된 최신 데이터를 우선적으로 참조합니다
- 데이터의 출처와 시간을 명시합니다
- 데이터가 없는 경우 공식 웹사이트 확인을 권장합니다`
  };

  private readonly intentPrompt: PromptTemplate = {
    role: 'system',
    content: `사용자의 메시지를 분석하여 다음 형식의 JSON으로 응답하세요:
{
  "category": <메시지의 주제: notice(공지), academic(학사), scholarship(장학금), library(도서관), facility(시설), lecture(강의), event(행사), career(진로), general(일반)>,
  "action": <사용자의 의도: query(질문), request(요청), complaint(불만), suggestion(제안)>,
  "keywords": [주요 키워드 배열],
  "confidence": <분석 신뢰도: 0.0~1.0>,
  "priority": <우선순위: high, medium, low>,
  "requiredData": [필요한 데이터 카테고리 배열]
}`
  };

  private constructor() {
    if (!config.openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
      maxRetries: 3
    });

    this.contexts = new Map();
    this.cacheManager = new CacheManager(60); // 60분 캐시
    this.setupErrorHandling();
  }

  public static getInstance(): BackendOpenAIService {
    if (!BackendOpenAIService.instance) {
      BackendOpenAIService.instance = new BackendOpenAIService();
    }
    return BackendOpenAIService.instance;
  }

  private setupErrorHandling(): void {
    process.on('unhandledRejection', (reason: Error) => {
      console.error('Unhandled OpenAI API Promise Rejection:', reason);
      // 모니터링 시스템에 에러 보고
    });
  }

  public async generateResponse(
    message: string,
    context: string,
    scrapedData?: ScrapedData[],
    campus: '신촌' | '원주' = '신촌'
  ): Promise<ChatResponse> {
    try {
      // 캐시 확인
      const cacheKey = this.generateCacheKey(message, context, campus);
      const cached = this.getCachedResponse<ChatResponse>(cacheKey);
      if (cached) return cached;

      // 컨텍스트 준비
      const messages: ChatCompletionMessageParam[] = [
        this.basePrompt,
        {
          role: 'system',
          content: `현재 캠퍼스: ${campus}\n대화 맥락: ${context}`
        }
      ];

      // 스크래핑 데이터 분석 및 관련 정보 추출
      if (scrapedData?.length) {
        const relevantData = this.processScrapedData(scrapedData, message);
        messages.push({
          role: 'system',
          content: `관련 정보:\n${JSON.stringify(relevantData, null, 2)}`
        });
      }

      // 사용자 메시지 추가
      messages.push({ role: 'user', content: message });

      // OpenAI API 호출
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages as any[], // OpenAI 타입 호환을 위한 타입 캐스팅
        temperature: 0.7,
        max_tokens: this.MAX_TOKENS,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });

      // 응답 생성
      const response: ChatResponse = {
        message: completion.choices[0]?.message?.content || "죄송합니다. 응답을 생성할 수 없습니다.",
        timestamp: new Date(),
        confidence: 1.0,
        source: 'openai',
        intent: await this.analyzeIntent(message, campus)
      };

      // 캐시 저장
      this.cacheManager.set(cacheKey, response);

      return response;

    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  public async analyzeIntent(
    message: string,
    campus: '신촌' | '원주' = '신촌'
  ): Promise<IntentAnalysis> {
    try {
      const cacheKey = this.generateCacheKey(message, undefined, campus, 'intent');
      const cached = this.getCachedResponse<IntentAnalysis>(cacheKey);
      if (cached) return cached;

      const messages: ChatCompletionMessageParam[] = [
        this.intentPrompt,
        {
          role: 'system',
          content: `캠퍼스: ${campus}\n분석할 메시지: ${message}`
        }
      ];

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages as any[],
        temperature: 0.3,
        max_tokens: 150
      });

      const resultText = completion.choices[0]?.message?.content;
      if (!resultText) {
        throw new Error('Failed to get intent analysis response');
      }

      let result: any;
      try {
        result = JSON.parse(resultText);
      } catch (e) {
        console.error('Intent Analysis Parse Error:', e);
        throw new Error('Failed to parse intent analysis result');
      }

      const intent: IntentAnalysis = {
        category: result.category || "general",
        action: result.action || "query",
        keywords: result.keywords || [],
        confidence: result.confidence || 0,
        parameters: result.parameters || {},
        context: result.context,
        priority: result.priority || 'medium',
        requiredData: result.requiredData || []
      };

      this.cacheManager.set(cacheKey, intent);
      return intent;

    } catch (error) {
      console.error('Intent Analysis Error:', error);
      return {
        category: "general",
        action: "query",
        keywords: [],
        confidence: 0,
        parameters: {},
        priority: 'low',
        requiredData: []
      };
    }
  }

  private processScrapedData(data: ScrapedData[], message: string): ScrapedData[] {
    // 관련성 점수 계산 및 필터링
    const scoredData = data
      .filter(item => item.title && item.content) // null 체크 추가
      .map(item => {
        const score = this.calculateRelevanceScore(item, message);
        return { ...item, relevanceScore: score };
      });

    // 상위 5개 항목 선택
    return scoredData
      .sort((a, b) => ((b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)))
      .slice(0, 5)
      .map(({ relevanceScore, ...item }) => item);
  }

  private calculateRelevanceScore(item: ScrapedData, message: string): number {
    if (!item.title || !item.content) return 0;

    const messageTokens = new Set(
      message.toLowerCase().split(/\s+/).filter(token => token.length > 1)
    );

    const titleTokens = new Set(
      item.title.toLowerCase().split(/\s+/).filter(token => token.length > 1)
    );

    const contentTokens = new Set(
      item.content.toLowerCase().split(/\s+/).filter(token => token.length > 1)
    );

    let score = 0;
    
    // 제목 매칭 점수 (가중치 2)
    messageTokens.forEach(token => {
      if (titleTokens.has(token)) score += 2;
    });

    // 내용 매칭 점수 (가중치 1)
    messageTokens.forEach(token => {
      if (contentTokens.has(token)) score += 1;
    });

    // 시간 가중치 (최신 정보 우대)
    const daysDiff = (Date.now() - item.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const timeScore = Math.max(0, 1 - daysDiff / 30); // 30일 이내 정보 우대

    // 중요도 가중치
    const importanceScore = 
      item.meta?.importance === 'high' ? 2 :
      item.meta?.importance === 'medium' ? 1 : 0.5;

    return score * timeScore * importanceScore;
  }

  private generateCacheKey(
    message: string, 
    context?: string, 
    campus: '신촌' | '원주' = '신촌',
    type: 'response' | 'intent' = 'response'
  ): string {
    return `${type}:${campus}:${message}:${context || ''}`;
  }
  private getCachedResponse<T>(key: string): T | null {
    const cached = this.cacheManager.get<T>(key);
    if (!cached) return null;
    return cached.data;
  }
  private getRetryAfter(error: unknown): number {
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as any).response;
      if (response?.headers?.['retry-after']) {
        return parseInt(response.headers['retry-after']) * 1000;
      }
    }
    return 60000; // 기본 1분
  }
  private handleError(error: unknown): never {
    if (this.isRateLimitError(error)) {
      throw new NetworkError('API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.', {
        type: 'rateLimit',
        retryAfter: this.getRetryAfter(error),
        statusCode: 429
      });
    }
  
    if (this.isTimeoutError(error)) {
      throw new NetworkError('응답 시간이 초과되었습니다.', {
        type: 'timeout',
        statusCode: 408
      });
    }
  
    if (this.isNetworkError(error)) {
      throw new NetworkError('네트워크 오류가 발생했습니다.', {
        type: 'connection'
      });
    }
  
    throw new NetworkError('AI 응답 생성 중 오류가 발생했습니다.', {
      type: 'unknown',
      details: { error }
    });
  }
  
  private isRateLimitError(error: unknown): boolean {
    return this.isErrorWithStatusCode(error, 429);
  }

  private isTimeoutError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.includes('timeout') || 
             error.message.includes('ETIMEDOUT') || 
             this.isErrorWithStatusCode(error, 408);
    }
    return false;
  }

  private isNetworkError(error: unknown): boolean {
    return error instanceof Error && 'isAxiosError' in error;
  }

  private isErrorWithStatusCode(error: unknown, code: number): boolean {
    return !!(error && typeof error === 'object' && 'status' in error && error.status === code);
  }

  public clearCache(): void {
    this.cacheManager.clear();
    this.contexts.clear();
  }

  public async refreshContext(conversationId: string): Promise<void> {
    this.contexts.delete(conversationId);
  }
}

export default BackendOpenAIService;