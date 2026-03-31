import { Router } from 'express';
import { resolveTickerAsync } from '../services/tickerResolver.js';
import { getPriceHistory, getFinancials } from '../services/yahooFinanceService.js';
import { calculateTechnicalAnalysis } from '../services/technicalService.js';

const router = Router();
const VALID_RANGES = new Set(['1mo', '3mo', '6mo', '1y', '2y']);

// GET /api/stock/technical?ticker=AAPL&range=6mo&suffix=auto
router.get('/technical', async (req, res, next) => {
  try {
    const { ticker, range = '6mo', suffix = 'auto' } = req.query;
    if (!ticker) return res.status(400).json({ error: '종목 코드(ticker) 파라미터가 필요합니다.' });
    if (!VALID_RANGES.has(range)) return res.status(400).json({ error: `유효하지 않은 range: ${range}` });

    const resolvedTicker = await resolveTickerAsync(ticker, suffix);
    const priceData = await getPriceHistory(resolvedTicker, range);
    const analysis = calculateTechnicalAnalysis(priceData.prices);

    res.json({
      ticker,
      resolvedTicker,
      meta: priceData.meta,
      prices: priceData.prices,
      indicators: analysis.indicators,
      marketState: analysis.marketState,
      signalScores: analysis.signalScores,
      signalSummary: analysis.signalSummary,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/stock/financials?ticker=AAPL&suffix=auto
router.get('/financials', async (req, res, next) => {
  try {
    const { ticker, suffix = 'auto' } = req.query;
    if (!ticker) return res.status(400).json({ error: '종목 코드(ticker) 파라미터가 필요합니다.' });

    const resolvedTicker = await resolveTickerAsync(ticker, suffix);
    const data = await getFinancials(resolvedTicker);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
