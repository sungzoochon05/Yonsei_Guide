import { Message, ChatResponse, ChatContext, ScrapedData } from '../types/frontendTypes';
import FrontendOpenAIService from './FrontendOpenAIService';
import FrontendWebScrapingService from './FrontendWebScrapingService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class FrontendChatService {
  private static instance: FrontendChatService;
  private readonly API_URL: string;
  private context: ChatContext;
  private messageHistory: Message[] = [];
  private readonly MAX_MESSAGES = 100; // 최대 메시지 수 제한
  private readonly MAX_CONTEXT_MESSAGES = 10; // 컨텍스트에 포함할 최근 메시지 수
  private readonly MESSAGE_BATCH_SIZE = 20; // 한 번에 로드할 메시지 수
  private openAIService: FrontendOpenAIService;
  private webScrapingService: FrontendWebScrapingService;
  private isInitialized: boolean = false;
  private campus: '신촌' | '원주' = '신촌';  // 기본값

  public setCampus(campus: '신촌' | '원주') {
    this.campus = campus;
    AsyncStorage.setItem('selectedCampus', campus);  // 로컬 저장소에 저장
  }

  private async getCampus(): Promise<'신촌' | '원주'> {
    try {
      const campus = await AsyncStorage.getItem('selectedCampus');
      return (campus as '신촌' | '원주') || '신촌';  // 기본값은 신촌
    } catch (error) {
      console.error('Error getting campus:', error);
      return '신촌';  // 에러 시 기본값 반환
    }
  }

  private constructor() {
    this.API_URL = `${process.env.EXPO_PUBLIC_API_URL}/api`;
    this.context = {
      previousQueries: [],
      responseCount: 0
    };
    this.openAIService = FrontendOpenAIService.getInstance();
    this.webScrapingService = FrontendWebScrapingService.getInstance();
    this.initialize();
  }
  private async loadMessageHistory(): Promise<void> {
    try {
      const savedHistory = await AsyncStorage.getItem('chatHistory');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        // 날짜 문자열을 Date 객체로 변환
        this.messageHistory = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        // 최대 메시지 수 제한 적용
        if (this.messageHistory.length > this.MAX_MESSAGES) {
          this.messageHistory = this.messageHistory.slice(-this.MAX_MESSAGES);
          await this.saveMessageHistory(); // 잘린 히스토리 저장
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // 로드 실패 시 히스토리 초기화
      this.messageHistory = [];
    }
  }
  
  private async saveMessageHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem('chatHistory', JSON.stringify(this.messageHistory));
    } catch (error) {
      console.error('Failed to save chat history:', error);
      throw new Error('채팅 내역 저장에 실패했습니다. 앱을 재시작하면 메시지가 사라질 수 있습니다.');
    }
  }
  public static getInstance(): FrontendChatService {
    if (!FrontendChatService.instance) {
      FrontendChatService.instance = new FrontendChatService();
    }
    return FrontendChatService.instance;
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await this.loadMessageHistory();
      await this.loadCampusSettings();  // 캠퍼스 설정 로드 추가
      this.isInitialized = true;
    } catch (error) {
      console.error('Initialization error:', error);
      // 초기화 실패 시 기본값으로 설정
      this.messageHistory = [];
      this.campus = '신촌';  // 기본 캠퍼스 설정
      this.context = {
        previousQueries: [],
        responseCount: 0
      };
      // 초기화 실패를 표시
      throw new Error('서비스 초기화에 실패했습니다. 앱을 다시 시작해주세요.');
    }
  }
  
  private async loadCampusSettings(): Promise<void> {
    try {
      const savedCampus = await AsyncStorage.getItem('selectedCampus');
      if (savedCampus) {
        this.campus = savedCampus as '신촌' | '원주';
      }
    } catch (error) {
      console.error('Failed to load campus settings:', error);
      throw error;
    }
  }
  
  private async waitForInitialization(): Promise<void> {
    const maxAttempts = 10;
    const interval = 100; // 100ms
    let attempts = 0;

    while (!this.isInitialized && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, interval));
      attempts++;
    }

    if (!this.isInitialized) {
      throw new Error('서비스 초기화에 실패했습니다.');
    }
  }

  public async processMessage(message: string): Promise<ChatResponse> {
    await this.waitForInitialization();
  
    try {
      // 캠퍼스 정보 가져오기
      const campus = await this.getCampus();

      // 1. 의도 분석 (캠퍼스 정보 포함)
      const intent = await this.openAIService.analyzeIntent(message, campus);
      console.log('Intent analysis:', intent);
  
      // 2. 관련 데이터 수집
      let scrapedData: ScrapedData[] | undefined = undefined;
      if (intent.confidence > 0.7 && intent.category !== 'general') {
        try {
          scrapedData = await this.webScrapingService.scrapeByCategory(
            intent.category,
            campus  // 캠퍼스 정보 전달
          );
        } catch (error) {
          console.error('Scraping error:', error);
        }
      }
  
      // 3. AI 응답 생성 (캠퍼스 정보 포함)
      const aiResponse = await this.openAIService.generateResponse(
        message,
        this.buildContext(),
        scrapedData,
        campus  // 캠퍼스 정보 전달
      );

      // 4. 메시지 저장
      const userMessage: Message = {
        id: this.generateMessageId(),
        text: message,
        isUser: true,
        timestamp: new Date(),
        metadata: { campus }  // 캠퍼스 정보 메타데이터에 추가
      };

      const botMessage: Message = {
        id: this.generateMessageId(),
        text: aiResponse.text,
        isUser: false,
        timestamp: new Date(),
        metadata: { campus }  // 캠퍼스 정보 메타데이터에 추가
      };

      await this.addMessages([userMessage, botMessage]);

      // 5. 컨텍스트 업데이트
      this.updateContext(message, aiResponse.text);

      return aiResponse;

    } catch (error) {
      console.error('Chat processing error:', error);
      throw error;
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private buildContext(): string {
    const recentMessages = this.messageHistory
      .slice(-this.MAX_CONTEXT_MESSAGES)
      .map(msg => `${msg.isUser ? 'User' : 'AI'}: ${msg.text}`)
      .join('\n');
    
    return recentMessages;
  }

  private async addMessages(messages: Message[]): Promise<void> {
    this.messageHistory.push(...messages);
    
    if (this.messageHistory.length > this.MAX_MESSAGES) {
      this.messageHistory = this.messageHistory.slice(-this.MAX_MESSAGES);
    }

    await this.saveMessageHistory();
  }

  private updateContext(userMessage: string, aiResponse: string): void {
    this.context = {
      ...this.context,
      lastQuery: userMessage,
      lastResponse: aiResponse,
      previousQueries: [
        ...this.context.previousQueries,
        userMessage
      ].slice(-5),
      responseCount: this.context.responseCount + 1
    };
  }

  public getMessageHistory(page: number = 1): Message[] {
    const start = (page - 1) * this.MESSAGE_BATCH_SIZE;
    const end = start + this.MESSAGE_BATCH_SIZE;
    return this.messageHistory.slice(start, end);
  }

  public async clearHistory(): Promise<void> {
    this.messageHistory = [];
    this.context = {
      previousQueries: [],
      responseCount: 0
    };
  }

  public getMessageStats(): {
    total: number;
    userMessages: number;
    aiMessages: number;
    errorCount: number;
  } {
    return {
      total: this.messageHistory.length,
      userMessages: this.messageHistory.filter(m => m.isUser).length,
      aiMessages: this.messageHistory.filter(m => !m.isUser && !m.error).length,
      errorCount: this.messageHistory.filter(m => m.error).length
    };
  }
}

export default FrontendChatService;