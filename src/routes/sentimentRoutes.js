import { Router } from 'express';
import { getFearGreedIndex } from '../services/sentimentService.js';

const router = Router();

router.get('/fear-greed', async (req, res, next) => {
  try {
    const data = await getFearGreedIndex();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
