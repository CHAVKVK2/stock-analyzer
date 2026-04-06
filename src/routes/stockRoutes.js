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

function recordExecutionSummary(res, summary) {
  res.locals.executionSummary = {
    ...(res.locals.executionSummary || {}),
    ...summary,
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

    recordExecutionSummary(res, {
      route: 'technical',
      ticker,
      resolvedTicker,
      range,
      strategy: normalizedStrategy,
      signal: analysis.signalSummary.signal,
      score: analysis.signalSummary.score,
      dataQualityWarnings: priceData.dataQuality?.warnings?.map(item => item.code) ?? [],
    });

    res.json({
      ticker,
      resolvedTicker,
      strategy: normalizedStrategy,
      meta: priceData.meta,
      dataQuality: priceData.dataQuality,
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
    recordExecutionSummary(res, {
      route: 'financials',
      ticker,
      resolvedTicker,
    });
    res.json(data);
  } catch (err) {
    recordExecutionSummary(res, {
      route: 'financials',
      ticker: req.query.ticker,
      error: err.message,
    });
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

    recordExecutionSummary(res, {
      route: 'signal-date',
      ticker,
      resolvedTicker,
      range,
      strategy: normalizedStrategy,
      requestedDate: date,
      actualDate: datedAnalysis.actualDate,
      signal: datedAnalysis.signalSummary.signal,
      score: datedAnalysis.signalSummary.score,
      dataQualityWarnings: priceData.dataQuality?.warnings?.map(item => item.code) ?? [],
    });

    res.json({
      ...buildHistoricalSignalResponse({
      ticker,
      resolvedTicker,
      datedAnalysis,
      strategy: normalizedStrategy,
      }),
      dataQuality: priceData.dataQuality,
    });
  } catch (err) {
    recordExecutionSummary(res, {
      route: 'signal-date',
      ticker: req.query.ticker,
      requestedDate: req.query.date,
      error: err.message,
    });
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

    recordExecutionSummary(res, {
      route: 'historical-snapshot',
      ticker,
      resolvedTicker,
      range,
      strategy: normalizedStrategy,
      requestedDate: targetDate,
      actualDate: datedAnalysis.actualDate,
      signal: datedAnalysis.signalSummary.signal,
      score: datedAnalysis.signalSummary.score,
      dataQualityWarnings: priceData.dataQuality?.warnings?.map(item => item.code) ?? [],
    });

    res.json({
      ...buildHistoricalSignalResponse({
      ticker,
      resolvedTicker,
      datedAnalysis,
      strategy: normalizedStrategy,
      }),
      dataQuality: priceData.dataQuality,
    });
  } catch (err) {
    recordExecutionSummary(res, {
      route: 'historical-snapshot',
      ticker: req.query.ticker,
      requestedDate: req.query.target_date,
      error: err.message,
    });
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

    recordExecutionSummary(res, {
      route: 'backtest',
      ticker,
      resolvedTicker,
      range,
      strategy: normalizedStrategy,
      startDate,
      endDate,
      trades: backtest.summary?.totalTrades ?? null,
      cumulativeReturnPct: backtest.summary?.cumulativeReturnPct ?? null,
      dataQualityWarnings: priceData.dataQuality?.warnings?.map(item => item.code) ?? [],
    });

    res.json({
      ticker,
      resolvedTicker,
      strategy: normalizedStrategy,
      dataQuality: priceData.dataQuality,
      ...backtest,
    });
  } catch (err) {
    recordExecutionSummary(res, {
      route: 'backtest',
      ticker: req.query.ticker,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      error: err.message,
    });
    next(err);
  }
});

export default router;
