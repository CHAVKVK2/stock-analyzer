import { Router } from 'express';
import { getCompanyNews } from '../services/newsService.js';

const router = Router();

// GET /api/news/:symbol
router.get('/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    if (!symbol) return res.json({ news: [] });
    const news = await getCompanyNews(symbol.toUpperCase());
    res.json({ news });
  } catch (err) {
    next(err);
  }
});

export default router;
