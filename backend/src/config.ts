import dotenv from 'dotenv';
import path from 'path';

// 환경 변수 로드
dotenv.config({ path: path.join(__dirname, '../.env') });

// 환경 변수 타입 정의
interface Config {
  env: string;
  isDevelopment: boolean;
  isProduction: boolean;
  port: number;
  openaiApiKey: string;
  frontendUrl: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number; // 시간 창 (밀리초)
    max: number;      // 최대 요청 수
  };
  scraping: {
    timeout: number;   // 스크래핑 타임아웃 (밀리초)
    maxRetries: number; // 최대 재시도 횟수
    cacheTime: number;  // 캐시 유효 시간 (밀리초)
  };
  openai: {
    maxTokens: number;
    temperature: number;
    timeout: number;
  };
}

// 환경 변수 값 검증
const validateEnv = () => {
  const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'OPENAI_API_KEY',
    'FRONTEND_URL'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
};

// 환경 변수 검증 실행
validateEnv();

// 설정 객체 생성
export const config: Config = {
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '4000', 10),
  openaiApiKey: process.env.OPENAI_API_KEY!,
  frontendUrl: process.env.FRONTEND_URL!,
  
  cors: {
    origin: [
      'http://localhost:19006',
      'http://localhost:19000',
      'exp://localhost:19000',
      process.env.FRONTEND_URL!
    ].filter(Boolean),
    credentials: true
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15분
    max: process.env.NODE_ENV === 'production' ? 100 : 1000
  },

  scraping: {
    timeout: 10000,     // 10초
    maxRetries: 3,
    cacheTime: 5 * 60 * 1000  // 5분
  },

  openai: {
    maxTokens: parseInt(process.env.MAX_TOKENS || '500', 10),
    temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
    timeout: 30000  // 30초
  }
};

// 설정 값 유효성 검사
const validateConfig = (config: Config) => {
  if (config.port < 0 || config.port > 65535) {
    throw new Error('Invalid port number');
  }

  if (config.openai.temperature < 0 || config.openai.temperature > 1) {
    throw new Error('OpenAI temperature must be between 0 and 1');
  }

  if (config.openai.maxTokens < 1 || config.openai.maxTokens > 4000) {
    throw new Error('Invalid maxTokens value');
  }
};

// 설정 유효성 검사 실행
validateConfig(config);

// 환경별 추가 설정
if (config.isDevelopment) {
  // 개발 환경 특정 설정
  console.log('Running in development mode');
  console.log('Config:', config);
}

export default config;