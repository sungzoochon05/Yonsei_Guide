import { Router, Request, Response } from 'express';
import BackendWebScrapingService from '../services/BackendWebScrapingService';
import { ScrapedData, LibraryResponse } from '../types/backendInterfaces';
import { ScrapingError } from '../errors/ScrapingError';

const router = Router();
const scrapingService = BackendWebScrapingService.getInstance();

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  count?: number;
  counts?: {
    [key: string]: number;
  };
  category?: string;
  query?: string;
}

// 타입 가드
function isLibraryResponse(data: any): data is LibraryResponse {
  return 'notices' in data && 'status' in data && 'hours' in data;
}

// 에러 핸들러 미들웨어
const handleScrapingError = (error: any, res: Response<ApiResponse<any>>) => {
  console.error('Scraping error:', error);
  
  if (error instanceof ScrapingError) {
    return res.status(error.code === 'NETWORK_ERROR' ? 503 : 500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    });
  }

  return res.status(500).json({
    success: false,
    error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    timestamp: new Date()
  });
};

// 공지사항 가져오기
router.get('/notices', async (req: Request, res: Response<ApiResponse<ScrapedData[]>>) => {
  try {
    const { count = '20', campus = '신촌' } = req.query;
    const data = await scrapingService.scrapeByCategory('notices', {
      count: parseInt(count as string),
      campus: campus as '신촌' | '원주'
    });

    if (Array.isArray(data)) {
      res.json({
        success: true,
        data,
        timestamp: new Date(),
        count: data.length,
        category: 'notices'
      });
    } else {
      throw new Error('Invalid data format received for notices');
    }
  } catch (error) {
    handleScrapingError(error, res);
  }
});

// 장학금 정보 가져오기
router.get('/scholarships', async (req: Request, res: Response<ApiResponse<ScrapedData[]>>) => {
  try {
    const { count = '20', campus = '신촌' } = req.query;
    const data = await scrapingService.scrapeByCategory('scholarships', {
      count: parseInt(count as string),
      campus: campus as '신촌' | '원주'
    });

    if (Array.isArray(data)) {
      res.json({
        success: true,
        data,
        timestamp: new Date(),
        count: data.length,
        category: 'scholarships'
      });
    } else {
      throw new Error('Invalid data format received for scholarships');
    }
  } catch (error) {
    handleScrapingError(error, res);
  }
});

// 학사 정보 가져오기
router.get('/academic', async (req: Request, res: Response<ApiResponse<ScrapedData[]>>) => {
  try {
    const { count = '20', campus = '신촌' } = req.query;
    const data = await scrapingService.scrapeByCategory('academic', {
      count: parseInt(count as string),
      campus: campus as '신촌' | '원주'
    });

    if (Array.isArray(data)) {
      res.json({
        success: true,
        data,
        timestamp: new Date(),
        count: data.length,
        category: 'academic'
      });
    } else {
      throw new Error('Invalid data format received for academic');
    }
  } catch (error) {
    handleScrapingError(error, res);
  }
});

// 도서관 정보 가져오기
router.get('/library', async (req: Request, res: Response<ApiResponse<LibraryResponse>>) => {
  try {
    const { campus = '신촌' } = req.query;
    const data = await scrapingService.scrapeByCategory('library', {
      campus: campus as '신촌' | '원주'
    });

    if (isLibraryResponse(data)) {
      const counts = {
        notices: data.notices.length,
        status: data.status.length,
        hours: data.hours.length
      };

      res.json({
        success: true,
        data,
        timestamp: new Date(),
        counts,
        category: 'library'
      });
    } else {
      throw new Error('Invalid data format received for library');
    }
  } catch (error) {
    handleScrapingError(error, res);
  }
});

// 통합 검색 기능
// routes/scrapingRoutes.ts

router.get('/search/:category', async (req: Request, res: Response<ApiResponse<ScrapedData[] | LibraryResponse>>) => {
  try {
    const { category } = req.params;
    const { query = '', campus = '신촌', count = '20' } = req.query;

    const data = await scrapingService.scrapeByCategory(category, {
      campus: campus as '신촌' | '원주',
      count: parseInt(count as string)
    });

    // 검색 필터링 로직
    if (query && typeof query === 'string') {
      const searchTerm = query.toLowerCase();
      if (isLibraryResponse(data)) {
        const filteredData = {
          ...data,
          notices: data.notices.filter(item =>
            item.title.toLowerCase().includes(searchTerm) ||
            (item.content && item.content.toLowerCase().includes(searchTerm))
          )
        };
        return res.json({
          success: true,
          data: filteredData,
          timestamp: new Date(),
          category,
          query
        });
      } else if (Array.isArray(data)) {
        const filteredData = data.filter(item =>
          item.title.toLowerCase().includes(searchTerm) ||
          (item.content && item.content.toLowerCase().includes(searchTerm))
        );
        return res.json({
          success: true,
          data: filteredData,
          timestamp: new Date(),
          count: filteredData.length,
          category,
          query
        });
      }
    }

    res.json({
      success: true,
      data,
      timestamp: new Date(),
      count: Array.isArray(data) ? data.length : undefined,
      category,
      query: query as string
    });
  } catch (error) {
    handleScrapingError(error, res);
  }
});

// 캐시 관리 엔드포인트
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    scrapingService.clearCache();
    res.json({
      success: true,
      message: '캐시가 초기화되었습니다.',
      timestamp: new Date()
    });
  } catch (error) {
    handleScrapingError(error, res);
  }
});

// 스크래핑 통계 조회
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = scrapingService.getStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date()
    });
  } catch (error) {
    handleScrapingError(error, res);
  }
});

export default router;