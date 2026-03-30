import { Router } from 'express';
import { searchTickers } from '../services/yahooFinanceService.js';

const router = Router();

// GET /api/search?q=samsung
router.get('/', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) return res.json({ suggestions: [] });
    const suggestions = await searchTickers(q.trim());
    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

export default router;
