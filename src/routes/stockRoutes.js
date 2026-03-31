import { Router } from 'express';
import { resolveTickerAsync } from '../services/tickerResolver.js';
import { getPriceHistory, getFinancials } from '../services/yahooFinanceService.js';
import { calculateBacktest, calculateTechnicalAnalysis, calculateTechnicalAnalysisForDate } from '../services/technicalService.js';

const router = Router();
const VALID_RANGES = new Set(['1mo', '3mo', '6mo', '1y', '2y', '5y']);

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

// GET /api/stock/signal-date?ticker=AAPL&date=2025-01-22&range=2y&suffix=auto
router.get('/signal-date', async (req, res, next) => {
  try {
    const { ticker, date, range = '2y', suffix = 'auto' } = req.query;
    if (!ticker) return res.status(400).json({ error: '종목 코드(ticker) 파라미터가 필요합니다.' });
    if (!date) return res.status(400).json({ error: '날짜(date) 파라미터가 필요합니다.' });
    if (!VALID_RANGES.has(range)) return res.status(400).json({ error: `유효하지 않은 range: ${range}` });

    const resolvedTicker = await resolveTickerAsync(ticker, suffix);
    const priceData = await getPriceHistory(resolvedTicker, range);
    const datedAnalysis = calculateTechnicalAnalysisForDate(priceData.prices, date);
    const signal = datedAnalysis.signalSummary.signal === 'NEUTRAL'
      ? 'HOLD'
      : datedAnalysis.signalSummary.signal;

    res.json({
      ticker,
      resolvedTicker,
      requestedDate: datedAnalysis.requestedDate,
      actualDate: datedAnalysis.actualDate,
      price: datedAnalysis.price,
      marketState: datedAnalysis.marketState,
      signalScores: datedAnalysis.signalScores,
      signalSummary: {
        ...datedAnalysis.signalSummary,
        signal,
      },
      snapshot: datedAnalysis.snapshot,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/stock/backtest?ticker=AAPL&startDate=2024-01-01&endDate=2024-12-31&range=5y&suffix=auto
router.get('/backtest', async (req, res, next) => {
  try {
    const { ticker, startDate, endDate, range = '5y', suffix = 'auto' } = req.query;
    if (!ticker) return res.status(400).json({ error: '종목 코드(ticker) 파라미터가 필요합니다.' });
    if (!startDate || !endDate) return res.status(400).json({ error: '시작일(startDate)과 종료일(endDate)이 필요합니다.' });
    if (!VALID_RANGES.has(range)) return res.status(400).json({ error: `유효하지 않은 range: ${range}` });

    const resolvedTicker = await resolveTickerAsync(ticker, suffix);
    const priceData = await getPriceHistory(resolvedTicker, range);
    const backtest = calculateBacktest(priceData.prices, startDate, endDate);

    res.json({
      ticker,
      resolvedTicker,
      ...backtest,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
