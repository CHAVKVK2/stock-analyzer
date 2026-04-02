import { Router } from 'express';
import { getCompanyNews } from '../services/newsService.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

// GET /api/news/:symbol
router.get('/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    if (!symbol) return sendSuccess(res, { news: [] }, { endpoint: '/api/news/:symbol' });
    const news = await getCompanyNews(symbol.toUpperCase());
    return sendSuccess(res, { news }, { endpoint: '/api/news/:symbol', symbol: symbol.toUpperCase() });
  } catch (err) {
    next(err);
  }
});

export default router;
