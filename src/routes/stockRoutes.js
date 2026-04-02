import { Router } from 'express';
import { resolveTickerAsync } from '../services/tickerResolver.js';
import { getPriceHistory, getFinancials } from '../services/yahooFinanceService.js';
import { calculateBacktest, calculateTechnicalAnalysis, calculateTechnicalAnalysisForDate } from '../services/technicalService.js';
import { SUPPORTED_STRATEGIES } from '../services/scoreWeights.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';

const router = Router();
const VALID_RANGES = new Set(['1mo', '3mo', '6mo', '1y', '2y', '5y']);

function getStrategy(strategy) {
  return SUPPORTED_STRATEGIES.includes(strategy) ? strategy : 'balanced';
}

function parseSnapshotDate(query) {
  return query.snapshot_date || query.target_date || query.date || null;
}

function parseBacktestDates(query) {
  return {
    startDate: query.start_date || query.startDate || null,
    endDate: query.end_date || query.endDate || null,
  };
}

function validateTicker(ticker, res) {
  if (!ticker) {
    sendError(res, 400, 'INVALID_REQUEST', 'ticker 파라미터가 필요합니다.');
    return false;
  }
  return true;
}

function validateRange(range, res) {
  if (!VALID_RANGES.has(range)) {
    sendError(res, 400, 'INVALID_RANGE', `지원하지 않는 range 값입니다: ${range}`);
    return false;
  }
  return true;
}

function buildHistoricalSignalPayload({ ticker, resolvedTicker, datedAnalysis, strategy, range, suffix, canonicalPath }) {
  const signal = datedAnalysis.signalSummary.signal === 'NEUTRAL'
    ? 'HOLD'
    : datedAnalysis.signalSummary.signal;

  return {
    ticker,
    resolvedTicker,
    strategy,
    request: {
      endpoint: canonicalPath,
      range,
      suffix,
      snapshotDate: datedAnalysis.requestedDate,
    },
    dates: {
      requested: datedAnalysis.requestedDate,
      resolved: datedAnalysis.actualDate,
    },
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

async function handleHistoricalSnapshot(req, res, next, canonicalPath) {
  try {
    const { ticker, range = '2y', suffix = 'auto', strategy = 'balanced' } = req.query;
    const snapshotDate = parseSnapshotDate(req.query);

    if (!validateTicker(ticker, res)) return;
    if (!snapshotDate) {
      sendError(res, 400, 'INVALID_REQUEST', 'snapshot_date 파라미터가 필요합니다.');
      return;
    }
    if (!validateRange(range, res)) return;

    const normalizedStrategy = getStrategy(strategy);
    const resolvedTicker = await resolveTickerAsync(ticker, suffix);
    const priceData = await getPriceHistory(resolvedTicker, range);
    const datedAnalysis = calculateTechnicalAnalysisForDate(priceData.prices, snapshotDate, { strategy: normalizedStrategy });

    sendSuccess(
      res,
      buildHistoricalSignalPayload({
        ticker,
        resolvedTicker,
        datedAnalysis,
        strategy: normalizedStrategy,
        range,
        suffix,
        canonicalPath,
      }),
      { endpoint: canonicalPath }
    );
  } catch (err) {
    next(err);
  }
}

router.get('/technical', async (req, res, next) => {
  try {
    const { ticker, range = '6mo', suffix = 'auto', strategy = 'balanced' } = req.query;

    if (!validateTicker(ticker, res)) return;
    if (!validateRange(range, res)) return;

    const normalizedStrategy = getStrategy(strategy);
    const resolvedTicker = await resolveTickerAsync(ticker, suffix);
    const priceData = await getPriceHistory(resolvedTicker, range);
    const analysis = calculateTechnicalAnalysis(priceData.prices, { strategy: normalizedStrategy });

    sendSuccess(res, {
      ticker,
      resolvedTicker,
      strategy: normalizedStrategy,
      request: {
        endpoint: '/api/stock/technical',
        range,
        suffix,
      },
      meta: priceData.meta,
      prices: priceData.prices,
      indicators: analysis.indicators,
      marketState: analysis.marketState,
      signalScores: analysis.signalScores,
      signalSummary: analysis.signalSummary,
    }, { endpoint: '/api/stock/technical' });
  } catch (err) {
    next(err);
  }
});

router.get('/financials', async (req, res, next) => {
  try {
    const { ticker, suffix = 'auto' } = req.query;
    if (!validateTicker(ticker, res)) return;

    const resolvedTicker = await resolveTickerAsync(ticker, suffix);
    const data = await getFinancials(resolvedTicker);

    sendSuccess(res, {
      ticker,
      resolvedTicker,
      request: {
        endpoint: '/api/stock/financials',
        suffix,
      },
      ...data,
    }, { endpoint: '/api/stock/financials' });
  } catch (err) {
    next(err);
  }
});

router.get('/signal-date', async (req, res, next) => {
  return handleHistoricalSnapshot(req, res, next, '/api/stock/historical-snapshot');
});

router.get('/historical-snapshot', async (req, res, next) => {
  return handleHistoricalSnapshot(req, res, next, '/api/stock/historical-snapshot');
});

router.get('/backtest', async (req, res, next) => {
  try {
    const { ticker, range = '5y', suffix = 'auto', strategy = 'balanced' } = req.query;
    const { startDate, endDate } = parseBacktestDates(req.query);

    if (!validateTicker(ticker, res)) return;
    if (!startDate || !endDate) {
      sendError(res, 400, 'INVALID_REQUEST', 'start_date와 end_date 파라미터가 필요합니다.');
      return;
    }
    if (!validateRange(range, res)) return;

    const normalizedStrategy = getStrategy(strategy);
    const resolvedTicker = await resolveTickerAsync(ticker, suffix);
    const priceData = await getPriceHistory(resolvedTicker, range);
    const backtest = calculateBacktest(priceData.prices, startDate, endDate, { strategy: normalizedStrategy });

    sendSuccess(res, {
      ticker,
      resolvedTicker,
      strategy: normalizedStrategy,
      request: {
        endpoint: '/api/stock/backtest',
        range,
        suffix,
        startDate,
        endDate,
      },
      ...backtest,
    }, { endpoint: '/api/stock/backtest' });
  } catch (err) {
    next(err);
  }
});

export default router;
