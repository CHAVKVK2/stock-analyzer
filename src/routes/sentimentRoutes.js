import { Router } from 'express';
import { getFearGreedIndex } from '../services/sentimentService.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

router.get('/fear-greed', async (req, res, next) => {
  try {
    const data = await getFearGreedIndex();
    return sendSuccess(res, data, { endpoint: '/api/market/fear-greed' });
  } catch (err) {
    next(err);
  }
});

export default router;
