import { Router } from 'express';
import { resolveTickerAsync } from '../services/tickerResolver.js';
import { getPriceHistory, getFinancials } from '../services/yahooFinanceService.js';
import { resolveMarketProfile, SUPPORTED_PROFILES } from '../services/marketProfile.js';
import { calculateBacktest, calculateTechnicalAnalysis, calculateTechnicalAnalysisForDate } from '../services/technicalService.js';
import { SUPPORTED_STRATEGIES } from '../services/scoreWeights.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';

const router = Router();
const VALID_RANGES = new Set(['1mo', '3mo', '6mo', '1y', '2y', '5y']);

function getStrategy(strategy) {
  return SUPPORTED_STRATEGIES.includes(strategy) ? strategy : 'balanced';
}

function getRequestedProfile(profile) {
  return SUPPORTED_PROFILES.includes(profile) ? profile : 'auto';
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
    sendError(res, 400, 'INVALID_REQUEST', 'ticker \ud30c\ub77c\ubbf8\ud130\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.');
    return false;
  }
  return true;
}

function validateRange(range, res) {
  if (!VALID_RANGES.has(range)) {
    sendError(res, 400, 'INVALID_RANGE', `\uc9c0\uc6d0\ud558\uc9c0 \uc54a\ub294 range \uac12\uc785\ub2c8\ub2e4: ${range}`);
    return false;
  }
  return true;
}

function buildHistoricalSignalPayload({ ticker, resolvedTicker, datedAnalysis, strategy, profile, range, suffix, canonicalPath }) {
  const signal = datedAnalysis.signalSummary.signal === 'NEUTRAL'
    ? 'HOLD'
    : datedAnalysis.signalSummary.signal;

  return {
    ticker,
    resolvedTicker,
    strategy,
    profile,
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
    const { ticker, range = '2y', suffix = 'auto', strategy = 'balanced', profile = 'auto' } = req.query;
    const snapshotDate = parseSnapshotDate(req.query);

    if (!validateTicker(ticker, res)) return;
    if (!snapshotDate) {
      sendError(res, 400, 'INVALID_REQUEST', 'snapshot_date \ud30c\ub77c\ubbf8\ud130\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.');
      return;
    }
    if (!validateRange(range, res)) return;

    const normalizedStrategy = getStrategy(strategy);
    const requestedProfile = getRequestedProfile(profile);
    const resolvedTicker = await resolveTickerAsync(ticker, suffix);
    const resolvedProfile = resolveMarketProfile({ ticker, resolvedTicker, profile: requestedProfile });
    const priceData = await getPriceHistory(resolvedTicker, range);
    const datedAnalysis = calculateTechnicalAnalysisForDate(priceData.prices, snapshotDate, {
      strategy: normalizedStrategy,
      profile: resolvedProfile.key,
    });

    sendSuccess(
      res,
      buildHistoricalSignalPayload({
        ticker,
        resolvedTicker,
        datedAnalysis,
        strategy: normalizedStrategy,
        profile: resolvedProfile,
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
    const { ticker, range = '6mo', suffix = 'auto', strategy = 'balanced', profile = 'auto' } = req.query;

    if (!validateTicker(ticker, res)) return;
    if (!validateRange(range, res)) return;

    const normalizedStrategy = getStrategy(strategy);
    const requestedProfile = getRequestedProfile(profile);
    const resolvedTicker = await resolveTickerAsync(ticker, suffix);
    const resolvedProfile = resolveMarketProfile({ ticker, resolvedTicker, profile: requestedProfile });
    const priceData = await getPriceHistory(resolvedTicker, range);
    const analysis = calculateTechnicalAnalysis(priceData.prices, {
      strategy: normalizedStrategy,
      profile: resolvedProfile.key,
    });

    sendSuccess(res, {
      ticker,
      resolvedTicker,
      strategy: normalizedStrategy,
      profile: resolvedProfile,
      request: {
        endpoint: '/api/stock/technical',
        range,
        suffix,
        profile: requestedProfile,
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

router.get('/signal-date', async (req, res) => {
  sendError(
    res,
    410,
    'DEPRECATED_ENDPOINT',
    'signal-date \uc5d4\ub4dc\ud3ec\uc778\ud2b8\ub294 \ub354 \uc774\uc0c1 \uc0ac\uc6a9\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4. /api/stock/historical-snapshot?snapshot_date=YYYY-MM-DD \ub97c \uc0ac\uc6a9\ud574\uc8fc\uc138\uc694.'
  );
});

router.get('/historical-snapshot', async (req, res, next) => {
  return handleHistoricalSnapshot(req, res, next, '/api/stock/historical-snapshot');
});

router.get('/backtest', async (req, res, next) => {
  try {
    const { ticker, range = '5y', suffix = 'auto', strategy = 'balanced', profile = 'auto' } = req.query;
    const { startDate, endDate } = parseBacktestDates(req.query);

    if (!validateTicker(ticker, res)) return;
    if (!startDate || !endDate) {
      sendError(res, 400, 'INVALID_REQUEST', 'start_date\uc640 end_date \ud30c\ub77c\ubbf8\ud130\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.');
      return;
    }
    if (!validateRange(range, res)) return;

    const normalizedStrategy = getStrategy(strategy);
    const requestedProfile = getRequestedProfile(profile);
    const resolvedTicker = await resolveTickerAsync(ticker, suffix);
    const resolvedProfile = resolveMarketProfile({ ticker, resolvedTicker, profile: requestedProfile });
    const priceData = await getPriceHistory(resolvedTicker, range);
    const backtest = calculateBacktest(priceData.prices, startDate, endDate, {
      strategy: normalizedStrategy,
      profile: resolvedProfile.key,
    });

    sendSuccess(res, {
      ticker,
      resolvedTicker,
      strategy: normalizedStrategy,
      profile: resolvedProfile,
      request: {
        endpoint: '/api/stock/backtest',
        range,
        suffix,
        startDate,
        endDate,
        profile: requestedProfile,
      },
      ...backtest,
    }, { endpoint: '/api/stock/backtest' });
  } catch (err) {
    next(err);
  }
});

export default router;
