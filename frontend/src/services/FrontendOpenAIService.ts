import { ChatResponse, ScrapedData } from '../types/frontendTypes';
import { ENV } from '../config/env';
import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';
import NetInfo from '@react-native-community/netinfo';

interface IntentAnalysis {
  category: string;
  action: string;
  keywords: string[];
  confidence: number;
  campus: '신촌' | '원주';
}

interface CacheItem {
  response: ChatResponse | IntentAnalysis;
  timestamp: number;
}

interface IntentAnalysisResponse {
  success: boolean;
  data: {
    category: string;
    action: string;
    keywords: string[];
    confidence: number;
    campus: '신촌' | '원주';
  };
  timestamp: Date;
}

// 채팅 응답을 위한 인터페이스
interface ChatSuccessResponse {
  success: boolean;
  data: {
    response: string;
    intent?: IntentAnalysis;
    scrapedData?: ScrapedData[];
    timestamp: Date;
    campus: '신촌' | '원주';
  };
  timestamp: Date;
}

interface ServerErrorResponse {
  success: boolean;
  error: string;
  message?: string;
  timestamp: Date;
}

interface ServerSuccessResponse {
  success: boolean;
  data: {
    response: string;
    intent?: {
      category: string;
      action: string;
      keywords: string[];
      confidence: number;
    };
    scrapedData?: ScrapedData[];
    timestamp: Date;
    campus: '신촌' | '원주';
  };
  timestamp: Date;
}
class FrontendOpenAIService {
  private static instance: FrontendOpenAIService;
  private readonly API_URL: string;
  private messageCache: Map<string, CacheItem>;
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1시간 캐시

  private constructor() {
    this.API_URL = `${ENV.apiBaseUrl}/api`;
    this.messageCache = new Map();
    setInterval(() => this.cleanCache(), 1000 * 60 * 15);
  }

  public static getInstance(): FrontendOpenAIService {
    if (!FrontendOpenAIService.instance) {
      FrontendOpenAIService.instance = new FrontendOpenAIService();
    }
    return FrontendOpenAIService.instance;
  }

  private generateCacheKey(message: string, context?: string, type: 'response' | 'intent' = 'response'): string {
    return `${type}:${message}:${context || ''}`;
  }

  private isCacheValid(cacheItem: CacheItem): boolean {
    return Date.now() - cacheItem.timestamp < this.CACHE_TTL;
  }

  public async generateResponse(
    message: string,
    context: string,
    scrapedData?: ScrapedData[],
    campus?: '신촌' | '원주'
  ): Promise<ChatResponse> {
    try {
      await this.checkNetworkConnection();

      const cacheKey = this.generateCacheKey(message, context);
      const cachedItem = this.messageCache.get(cacheKey);
      
      if (cachedItem && this.isCacheValid(cachedItem)) {
        return cachedItem.response as ChatResponse;
      }

      const response = await axios.post<ChatSuccessResponse>(
        `${this.API_URL}/chat`,
        {
          message,
          context,
          scrapedData,
          campus
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const chatResponse: ChatResponse = {
        text: response.data.data.response, // .text 대신 .response 사용
        timestamp: new Date(),
        source: 'backend',
        data: response.data.data.scrapedData,
        intent: response.data.data.intent,
        campus: response.data.data.campus
    };

    this.messageCache.set(cacheKey, {
        response: chatResponse,
        timestamp: Date.now()
    });

    return chatResponse;

} catch (error) {
      console.error('OpenAI API Error:', error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ServerErrorResponse>;
        if (!axiosError.response) {
          if (axiosError.code === 'ECONNABORTED') {
            throw new Error('요청 시간이 초과되었습니다.');
          }
          throw new Error('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.');
        }

        const errorMessage = axiosError.response.data?.error || 
                           axiosError.response.data?.message || 
                           '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        throw new Error(errorMessage);
      }

      throw new Error('AI 응답을 생성하는데 실패했습니다.');
    }
  }

  public clearCache(): void {
    this.messageCache.clear();
    console.log('Cache cleared');
  }

  public getCacheStats(): { 
    size: number; 
    items: string[];
  } {
    return {
      size: this.messageCache.size,
      items: Array.from(this.messageCache.keys())
    };
  }

  private cleanCache(): void {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, item] of this.messageCache.entries()) {
      if (now - item.timestamp >= this.CACHE_TTL) {
        this.messageCache.delete(key);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      console.log(`Cleaned ${cleared} old cache entries`);
    }
  }
  private async checkNetworkConnection(): Promise<void> {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw new Error('인터넷 연결을 확인해주세요.');
    }
  }

  private async checkServerConnection(): Promise<void> {
    try {
      await axios.get(`${this.API_URL}/health`, { timeout: 5000 });
    } catch (error) {
      throw new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    }
  }

  public async analyzeIntent(message: string, campus?: '신촌' | '원주'): Promise<IntentAnalysis> {
    try {
      await this.checkNetworkConnection();

      const cacheKey = this.generateCacheKey(message, undefined, 'intent');
      const cachedItem = this.messageCache.get(cacheKey);
      
      if (cachedItem && this.isCacheValid(cachedItem)) {
        return cachedItem.response as IntentAnalysis;
      }

      await this.checkServerConnection();

      const response = await axios.post<IntentAnalysisResponse>(
        `${this.API_URL}/chat/analyze-intent`,
        { message, campus },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      // 응답에서 직접 데이터 추출
      const intent: IntentAnalysis = {
        category: response.data.data.category || "general",
        action: response.data.data.action || "query",
        keywords: response.data.data.keywords || [],
        confidence: response.data.data.confidence || 0.5,
        campus: response.data.data.campus || campus || '신촌'
      };

      this.messageCache.set(cacheKey, {
        response: intent,
        timestamp: Date.now()
      });

      return intent;

    } catch (error) {
      console.error('Intent Analysis Error:', error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ServerErrorResponse>;
        if (!axiosError.response) {
          if (axiosError.code === 'ECONNABORTED') {
            throw new Error('요청 시간이 초과되었습니다.');
          }
          throw new Error('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.');
        }
        
        const errorMessage = axiosError.response.data?.error || 
                           axiosError.response.data?.message || 
                           '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        throw new Error(errorMessage);
      }

      // 기본 폴백 응답에도 campus 추가
      return {
        category: "general",
        action: "query",
        keywords: [],
        confidence: 0,
        campus: campus || '신촌'  // 캠퍼스 정보 추가
      };
    }
  }
}

export default FrontendOpenAIService;