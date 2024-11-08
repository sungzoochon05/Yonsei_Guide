import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { config } from './config';

const app = express();

// Security Middleware
app.use(helmet());

// CORS 설정
app.use(cors({
  origin: [
    'http://localhost:19006',  // Expo 웹
    'http://localhost:19000',  // Expo 개발 서버
    'exp://localhost:19000',   // Expo 클라이언트
    /^exp:\/\/.*$/,           // 모든 Expo 클라이언트 주소 허용
    /^https?:\/\/.*\.exp\.direct$/,  // Expo Go 앱
    config.frontendUrl,
    // IP 기반 접근 허용
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
    /^exp:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // IP당 최대 요청 수
  message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request Logging in Development
if (config.isDevelopment) {
  const morgan = require('morgan');
  app.use(morgan('dev'));
}

// Routes
app.use('/api', routes);

// Error Handling
app.use(errorHandler);

// Uncaught Error Handlers
process.on('unhandledRejection', (reason: Error) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Starting graceful shutdown...');
  process.exit(0);
});

export default app;