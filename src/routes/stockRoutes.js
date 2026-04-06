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
  return query.snapshot_date || null;
}

function parseBacktestDates(query) {
  return {
    startDate: query.start_date || null,
    endDate: query.end_date || null,
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

function recordExecutionSummary(res, summary) {
  res.locals.executionSummary = {
    ...(res.locals.executionSummary || {}),
    ...summary,
  };
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

    recordExecutionSummary(res, {
      route: 'historical-snapshot',
      ticker,
      resolvedTicker,
      range,
      strategy: normalizedStrategy,
      requestedDate: snapshotDate,
      actualDate: datedAnalysis.actualDate,
      signal: datedAnalysis.signalSummary.signal,
      score: datedAnalysis.signalSummary.score,
      dataQualityWarnings: priceData.dataQuality?.warnings?.map(item => item.code) ?? [],
    });

    sendSuccess(
      res,
      {
        ...buildHistoricalSignalPayload({
          ticker,
          resolvedTicker,
          datedAnalysis,
          strategy: normalizedStrategy,
          range,
          suffix,
          canonicalPath,
        }),
        dataQuality: priceData.dataQuality,
      },
      { endpoint: canonicalPath }
    );
  } catch (err) {
    recordExecutionSummary(res, {
      route: 'historical-snapshot',
      ticker: req.query.ticker,
      requestedDate: parseSnapshotDate(req.query),
      error: err.message,
    });
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
      dataQuality: priceData.dataQuality,
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

    recordExecutionSummary(res, {
      route: 'financials',
      ticker,
      resolvedTicker,
    });

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
    recordExecutionSummary(res, {
      route: 'financials',
      ticker: req.query.ticker,
      error: err.message,
    });
    next(err);
  }
});

router.get('/signal-date', async (req, res) => {
  sendError(
    res,
    410,
    'DEPRECATED_ENDPOINT',
    'signal-date 엔드포인트는 더 이상 사용하지 않습니다. /api/stock/historical-snapshot?snapshot_date=YYYY-MM-DD 를 사용해주세요.'
  );
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
      dataQuality: priceData.dataQuality,
      ...backtest,
    }, { endpoint: '/api/stock/backtest' });
  } catch (err) {
    recordExecutionSummary(res, {
      route: 'backtest',
      ticker: req.query.ticker,
      startDate: req.query.start_date,
      endDate: req.query.end_date,
      error: err.message,
    });
    next(err);
  }
});

export default router;
