import { Router } from 'express';
import { searchTickers } from '../services/yahooFinanceService.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

// GET /api/search?q=samsung
router.get('/', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return sendSuccess(res, { suggestions: [] }, { endpoint: '/api/search' });
    }
    const suggestions = await searchTickers(q.trim());
    return sendSuccess(res, { suggestions }, { endpoint: '/api/search', query: q.trim() });
  } catch (err) {
    next(err);
  }
});

export default router;
