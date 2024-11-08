import express from 'express';
import BackendOpenAIService from '../services/BackendOpenAIService';
import BackendWebScrapingService from '../services/BackendWebScrapingService';
import { 
  ScrapedData, 
  LibraryResponse, 
  ServerResponse,
  ChatResponseData,
  ScrapingOptions 
} from '../types/backendInterfaces';

const router = express.Router();
const openAIService = BackendOpenAIService.getInstance();
const webScrapingService = BackendWebScrapingService.getInstance();

// 의도 분석 요청 처리
router.post('/analyze-intent', async (req, res) => {
  try {
    const { message, campus = '신촌' } = req.body;  // 캠퍼스 정보 추가
    const intent = await openAIService.analyzeIntent(message, campus);

    res.json({
      success: true,
      data: intent,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Intent Analysis Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      timestamp: new Date()
    });
  }
});

// 채팅 요청 처리
router.post('/', async (req, res) => {
  try {
    const { message, context, campus = '신촌' } = req.body;
    const scrapingOptions: ScrapingOptions = { campus };

    // 1. 의도 분석
    const intent = await openAIService.analyzeIntent(message, campus);

    // 2. 관련 데이터 수집
    let scrapedData: ScrapedData[] = [];
    if (intent.category !== 'general') {
      try {
        const data = await webScrapingService.scrapeByCategory(
          intent.category,
          { campus, count: 20 }  // ScrapingOptions 객체로 전달
        );
        if ('notices' in data) {
          scrapedData = data.notices;
        } else if (Array.isArray(data)) {
          scrapedData = data;
        }
      } catch (error) {
        console.error('Scraping error:', error);
      }
    }

    // 3. AI 응답 생성
    const response = await openAIService.generateResponse(
      message,
      context,
      scrapedData,
      campus as '신촌' | '원주'
    );

    const responseData: ChatResponseData = {
      response: response.text,
      intent,
      scrapedData,
      timestamp: new Date(),
      campus: campus as '신촌' | '원주'
    };

    res.json({
      success: true,
      data: responseData,
      timestamp: new Date()
    } as ServerResponse<ChatResponseData>);

  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      timestamp: new Date()
    });
  }
});

export default router;