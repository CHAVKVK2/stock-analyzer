import { Router } from 'express';
import { resolveTickerAsync } from '../services/tickerResolver.js';
import { getPriceHistory, getFinancials } from '../services/yahooFinanceService.js';
import { calculateBacktest, calculateTechnicalAnalysis, calculateTechnicalAnalysisForDate } from '../services/technicalService.js';
import { SUPPORTED_STRATEGIES } from '../services/scoreWeights.js';

const router = Router();
const VALID_RANGES = new Set(['1mo', '3mo', '6mo', '1y', '2y', '5y']);

function getStrategy(strategy) {
  return SUPPORTED_STRATEGIES.includes(strategy) ? strategy : 'balanced';
}

function buildHistoricalSignalResponse({ ticker, resolvedTicker, datedAnalysis, strategy }) {
  const signal = datedAnalysis.signalSummary.signal === 'NEUTRAL'
    ? 'HOLD'
    : datedAnalysis.signalSummary.signal;

  return {
    ticker,
    resolvedTicker,
    strategy,
    requestedDate: datedAnalysis.requestedDate,
    actualDate: datedAnalysis.actualDate,
    price: datedAnalysis.price,
    indicators: {
      rsi: datedAnalysis.snapshot.rsi,
      macd: datedAnalysis.snapshot.macd,
      macdSignal: datedAnalysis.snapshot.macdSignal,
      macdHistogram: datedAnalysis.snapshot.macdHistogram,
      bollingerUpper: datedAnalysis.snapshot.bollingerUpper,
      bollingerMiddle: datedAnalysis.snapshot.bollingerMiddle,
      bollingerLower: datedAnalysis.snapshot.bollingerLower,
    },
    marketState: datedAnalysis.marketState,
    signalScores: datedAnalysis.signalScores,
    signalSummary: {
      ...datedAnalysis.signalSummary,
      signal,
    },
    snapshot: datedAnalysis.snapshot,
  };
}

router.get('/technical', async (req, res, next) => {
  try {
    const { ticker, range = '6mo', suffix = 'auto', strategy = 'balanced' } = req.query;
    if (!ticker) return res.status(400).json({ error: '종목 코드(ticker) 파라미터가 필요합니다.' });
    if (!VALID_RANGES.has(range)) return res.status(400).json({ error: `유효하지 않은 range 값입니다: ${range}` });

    const normalizedStrategy = getStrategy(strategy);
    const resolvedTicker = await resolveTickerAsync(ticker, suffix);
    const priceData = await getPriceHistory(resolvedTicker, range);
    const analysis = calculateTechnicalAnalysis(priceData.prices, { strategy: normalizedStrategy });

    res.json({
      ticker,
      resolvedTicker,
      strategy: normalizedStrategy,
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

router.get('/signal-date', async (req, res, next) => {
  try {
    const { ticker, date, range = '2y', suffix = 'auto', strategy = 'balanced' } = req.query;
    if (!ticker) return res.status(400).json({ error: '종목 코드(ticker) 파라미터가 필요합니다.' });
    if (!date) return res.status(400).json({ error: '날짜(date) 파라미터가 필요합니다.' });
    if (!VALID_RANGES.has(range)) return res.status(400).json({ error: `유효하지 않은 range 값입니다: ${range}` });

    const normalizedStrategy = getStrategy(strategy);
    const resolvedTicker = await resolveTickerAsync(ticker, suffix);
    const priceData = await getPriceHistory(resolvedTicker, range);
    const datedAnalysis = calculateTechnicalAnalysisForDate(priceData.prices, date, { strategy: normalizedStrategy });

    res.json(buildHistoricalSignalResponse({
      ticker,
      resolvedTicker,
      datedAnalysis,
      strategy: normalizedStrategy,
    }));
  } catch (err) {
    next(err);
  }
});

router.get('/historical-snapshot', async (req, res, next) => {
  try {
    const { ticker, target_date: targetDate, range = '2y', suffix = 'auto', strategy = 'balanced' } = req.query;
    if (!ticker) return res.status(400).json({ error: 'ticker 파라미터가 필요합니다.' });
    if (!targetDate) return res.status(400).json({ error: 'target_date 파라미터가 필요합니다.' });
    if (!VALID_RANGES.has(range)) return res.status(400).json({ error: `유효하지 않은 range 값입니다: ${range}` });

    const normalizedStrategy = getStrategy(strategy);
    const resolvedTicker = await resolveTickerAsync(ticker, suffix);
    const priceData = await getPriceHistory(resolvedTicker, range);
    const datedAnalysis = calculateTechnicalAnalysisForDate(priceData.prices, targetDate, { strategy: normalizedStrategy });

    res.json(buildHistoricalSignalResponse({
      ticker,
      resolvedTicker,
      datedAnalysis,
      strategy: normalizedStrategy,
    }));
  } catch (err) {
    next(err);
  }
});

router.get('/backtest', async (req, res, next) => {
  try {
    const { ticker, startDate, endDate, range = '5y', suffix = 'auto', strategy = 'balanced' } = req.query;
    if (!ticker) return res.status(400).json({ error: '종목 코드(ticker) 파라미터가 필요합니다.' });
    if (!startDate || !endDate) return res.status(400).json({ error: '시작일(startDate)과 종료일(endDate)이 필요합니다.' });
    if (!VALID_RANGES.has(range)) return res.status(400).json({ error: `유효하지 않은 range 값입니다: ${range}` });

    const normalizedStrategy = getStrategy(strategy);
    const resolvedTicker = await resolveTickerAsync(ticker, suffix);
    const priceData = await getPriceHistory(resolvedTicker, range);
    const backtest = calculateBacktest(priceData.prices, startDate, endDate, { strategy: normalizedStrategy });

    res.json({
      ticker,
      resolvedTicker,
      strategy: normalizedStrategy,
      ...backtest,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
