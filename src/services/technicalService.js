import { calculateBacktestRange } from './backtestEngine.js';
import { calculateIndicators, findTargetIndexOnOrBefore } from './indicators.js';
import { buildScoreContext, calculateSignalScores } from './signalScoring.js';
import { buildSignalSummary } from './signalSummary.js';
import { avg, isNumber } from './technicalUtils.js';

function createAppError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export function calculateTechnicalAnalysis(prices, options = {}) {
  const indicators = calculateIndicators(prices);
  const marketState = evaluateMarketState(prices, indicators);
  const signalScores = calculateSignalScores(prices, indicators, options);
  const context = buildScoreContext(prices, indicators);
  const signalSummary = buildSignalSummary(context, marketState, signalScores);

  return {
    indicators,
    marketState,
    signalScores,
    signalSummary,
    strategy: options.strategy || 'balanced',
    profile: options.profile || 'us_broad_large_cap',
  };
}

export function calculateTechnicalAnalysisForDate(prices, requestedDate, options = {}) {
  if (!Array.isArray(prices) || prices.length === 0) {
    throw createAppError(404, 'NOT_FOUND', '\uac00\uaca9 \ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.');
  }

  const targetIndex = findTargetIndexOnOrBefore(prices, requestedDate);
  if (targetIndex === -1) {
    throw createAppError(
      404,
      'NO_DATA_IN_RANGE',
      '\uc120\ud0dd\ud55c \ub0a0\uc9dc \uc774\uc804\uc758 \uac00\uaca9 \ub370\uc774\ud130\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. range \uac12\uc744 \ub354 \ub113\uac8c \uc120\ud0dd\ud574\uc8fc\uc138\uc694.'
    );
  }

  const slicedPrices = prices.slice(0, targetIndex + 1);
  const analysis = calculateTechnicalAnalysis(slicedPrices, options);
  const snapshot = buildIndicatorSnapshot(slicedPrices, analysis.indicators);

  return {
    requestedDate,
    actualDate: slicedPrices.at(-1)?.date ?? null,
    analysisDateIndex: targetIndex,
    price: {
      open: slicedPrices.at(-1)?.open ?? null,
      high: slicedPrices.at(-1)?.high ?? null,
      low: slicedPrices.at(-1)?.low ?? null,
      close: slicedPrices.at(-1)?.close ?? null,
      volume: slicedPrices.at(-1)?.volume ?? null,
    },
    snapshot,
    ...analysis,
  };
}

export function calculateBacktest(prices, startDate, endDate, options = {}) {
  return calculateBacktestRange(prices, startDate, endDate, {
    analyzePrices: calculateTechnicalAnalysis,
    buildIndicatorSnapshot,
    analysisOptions: options,
  });
}

function evaluateMarketState(prices, indicators) {
  const closes = prices.map(price => price.close);
  const lastClose = closes.at(-1) ?? null;
  const ema20 = indicators.movingAverages.ema20.at(-1);
  const ema50 = indicators.movingAverages.ema50.at(-1);
  const sma200 = indicators.movingAverages.sma200.at(-1);
  const rsi = indicators.rsi.at(-1);
  const adx = indicators.trendStrength.adx14.at(-1);
  const plusDI = indicators.trendStrength.plusDI.at(-1);
  const minusDI = indicators.trendStrength.minusDI.at(-1);
  const atr = indicators.volatilityIndicators.atr14.at(-1);
  const averageClose = avg(closes.slice(-20));

  return {
    trend: resolveTrendState(lastClose, ema20, ema50, sma200),
    trendStrength: resolveTrendStrength(adx),
    momentum: resolveMomentumState(rsi, plusDI, minusDI),
    volatility: resolveVolatilityState(lastClose, atr, averageClose),
    priceLocation: resolvePriceLocation(lastClose, ema20, ema50, sma200),
  };
}

function buildIndicatorSnapshot(prices, indicators) {
  const context = buildScoreContext(prices, indicators);
  const latestPrice = prices.at(-1);

  return {
    date: latestPrice?.date ?? null,
    close: context.lastClose,
    rsi: context.rsi,
    macd: context.macd,
    macdSignal: context.macdSignal,
    macdHistogram: context.histogram,
    bollingerUpper: context.bbUpper,
    bollingerMiddle: context.bbMiddle,
    bollingerLower: context.bbLower,
    ema20: context.ema20,
    ema50: context.ema50,
    sma200: context.sma200,
    atr14: context.atr,
    adx14: context.adx,
    plusDI: context.plusDI,
    minusDI: context.minusDI,
    volumeRatio: context.volumeRatio,
    nearestSupport: context.nearestSupport,
    nearestResistance: context.nearestResistance,
  };
}

function resolveTrendState(lastClose, ema20, ema50, sma200) {
  if (!isNumber(lastClose) || !isNumber(ema20) || !isNumber(ema50) || !isNumber(sma200)) return 'unknown';
  if (lastClose > ema20 && ema20 > ema50 && ema50 > sma200) return 'uptrend';
  if (lastClose < ema20 && ema20 < ema50 && ema50 < sma200) return 'downtrend';
  return 'range';
}

function resolveTrendStrength(adx) {
  if (!isNumber(adx)) return 'unknown';
  if (adx >= 25) return 'strong';
  if (adx >= 20) return 'moderate';
  return 'weak';
}

function resolveMomentumState(rsi, plusDI, minusDI) {
  if (!isNumber(rsi)) return 'unknown';
  if (rsi >= 60 || (isNumber(plusDI) && isNumber(minusDI) && plusDI > minusDI)) return 'bullish';
  if (rsi <= 40 || (isNumber(plusDI) && isNumber(minusDI) && minusDI > plusDI)) return 'bearish';
  return 'neutral';
}

function resolveVolatilityState(lastClose, atr, averageClose) {
  if (!isNumber(lastClose) || !isNumber(atr) || !isNumber(averageClose)) return 'unknown';
  const ratio = atr / averageClose;
  if (ratio >= 0.05) return 'high';
  if (ratio >= 0.03) return 'moderate';
  return 'low';
}

function resolvePriceLocation(lastClose, ema20, ema50, sma200) {
  if (!isNumber(lastClose) || !isNumber(ema20) || !isNumber(ema50) || !isNumber(sma200)) return 'unknown';
  if (lastClose > ema20 && ema20 > ema50) return 'above_ema20';
  if (lastClose < ema20 && ema20 < ema50) return 'below_ema20';
  if (lastClose > sma200) return 'above_sma200';
  return 'below_sma200';
}
