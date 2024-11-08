// Front-end specific interfaces

// 기본 메타데이터 인터페이스
export interface BaseMeta {
  author?: string;
  department?: string;
  views?: number;
  semester?: string;
  importance?: 'high' | 'medium' | 'low';
}

// 스크래핑된 데이터의 기본 인터페이스
export interface ScrapedData {
  id: string;
  title: string;
  content: string;
  category: string;
  subcategory?: string;
  url: string;
  timestamp: Date;
  isFixed?: boolean;
  source: string;
  views?: number;
  author?: string;
  attachments?: string[];
  tags?: string[];
  meta?: BaseMeta;
}

// 메시지 인터페이스
export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  error?: boolean;
  status?: 'sending' | 'sent' | 'error';
  metadata?: {
    category?: string;
    confidence?: number;
    source?: string;
    campus?: '신촌' | '원주';
  };
}

// 챗봇 응답 인터페이스
export interface ChatResponse {
  text: string;
  error?: string;
  source?: string;
  timestamp: Date;
  data?: ScrapedData[];
  intent?: {
    category: string;
    action: string;
    keywords: string[];
    confidence: number;
    campus?: '신촌' | '원주';  // campus 속성 추가
  };
  campus?: '신촌' | '원주';  // campus 속성 추가
}

// 챗봇 컨텍스트 인터페이스
export interface ChatContext {
  lastQuery?: string;
  lastResponse?: string;
  topic?: string;
  previousQueries: string[];
  responseCount: number;
  lastCategory?: string;
}

// 네트워크 상태 인터페이스
export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

export interface IntentAnalysis {
  category: string;
  action: string;
  keywords: string[];
  confidence: number;
  campus: '신촌' | '원주';  // campus 속성 추가
}