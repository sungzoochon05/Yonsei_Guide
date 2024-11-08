import { Router } from 'express';
import chatRoutes from './chatRoutes';
import scrapingRoutes from './scrapingRoutes';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    message: '연세대학교 AI 도우미 서버가 정상적으로 동작중입니다.' 
  });
});

// Routes
router.use('/chat', chatRoutes);
router.use('/scraping', scrapingRoutes);

// 404 처리
router.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Not Found',
    message: '요청하신 엔드포인트를 찾을 수 없습니다.',
    timestamp: new Date()
  });
});

export default router;