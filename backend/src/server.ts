import app from './app';
import { config } from './config';

const startServer = async () => {
  try {
    // 서버 시작
    const server = app.listen(config.port, () => {
      console.log(`
==========================================================
🚀 서버가 시작되었습니다: http://localhost:${config.port}
==========================================================

환경: ${config.env}
CORS 허용 도메인: ${config.cors.origin.join(', ')}
Rate Limit: ${config.rateLimit.max}회 / ${config.rateLimit.windowMs / 1000 / 60}분

사용 가능한 엔드포인트:
- GET  /api/health        : 서버 상태 확인
- POST /api/chat         : 챗봇 메시지 전송
- GET  /api/notices     : 공지사항 조회
- GET  /api/scholarships : 장학금 정보 조회
- GET  /api/academic    : 학사 정보 조회
- GET  /api/library     : 도서관 정보 조회
- GET  /api/all         : 모든 정보 조회
- GET  /api/search/:category : 카테고리별 검색

Ctrl+C를 눌러 서버를 종료할 수 있습니다.
`);
    });

    // Graceful Shutdown 처리
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} signal received. Starting graceful shutdown...`);
      
      server.close(() => {
        console.log('Server closed');
        // 여기에 필요한 정리 작업 추가 (DB 연결 종료 등)
        process.exit(0);
      });

      // 타임아웃 설정 (10초 후 강제 종료)
      setTimeout(() => {
        console.error('Forcefully shutting down...');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // 예기치 않은 에러 처리
    process.on('unhandledRejection', (reason: Error) => {
      console.error('Unhandled Rejection:', reason);
      // 애플리케이션을 종료하지 않고 로깅만 수행
    });

    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught Exception:', error);
      // 심각한 에러의 경우 애플리케이션 종료
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// 서버 시작
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;