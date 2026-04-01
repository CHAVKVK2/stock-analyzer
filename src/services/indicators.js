import { ADX, ATR, BollingerBands, EMA, MACD, OBV, RSI, SMA } from 'technicalindicators';
import { isNumber, normalizeDateString, percentDistance, rnd } from './technicalUtils.js';

export function calculateIndicators(prices) {
  const closes = prices.map(p => p.close);
  const highs = prices.map(p => p.high);
  const lows = prices.map(p => p.low);
  const volumes = prices.map(p => p.volume || 0);
  const len = closes.length;

  const supportsAndResistances = detectSupportResistance(prices);
  const volumeMA20 = padFront(len, calcSMA(volumes, 20));
  const obv = padFront(len, calcOBV(closes, volumes));

  return {
    rsi: padFront(len, calcRSI(closes)),
    macd: padMacd(len, calcMACD(closes)),
    bollingerBands: padBB(len, calcBB(closes)),
    movingAverages: {
      ema20: padFront(len, calcEMA(closes, 20)),
      ema50: padFront(len, calcEMA(closes, 50)),
      sma200: padFront(len, calcSMA(closes, 200)),
    },
    volumeIndicators: {
      volumeMA20,
      obv,
      volumeRatio: calculateVolumeRatio(volumes, volumeMA20),
    },
    volatilityIndicators: {
      atr14: padFront(len, calcATR(highs, lows, closes, 14)),
    },
    trendStrength: padADX(len, calcADX(highs, lows, closes, 14)),
    levels: supportsAndResistances,
  };
}

export function findTargetIndexOnOrBefore(prices, requestedDate) {
  const normalizedDate = normalizeDateString(requestedDate);
  if (!normalizedDate) return prices.length - 1;

  for (let i = prices.length - 1; i >= 0; i -= 1) {
    if (prices[i]?.date && prices[i].date <= normalizedDate) {
      return i;
    }
  }

  return -1;
}

function detectSupportResistance(prices, lookback = 60, pivotWindow = 2) {
  const recent = prices.slice(-lookback);
  const lastClose = recent.at(-1)?.close ?? null;
  const lows = [];
  const highs = [];

  for (let i = pivotWindow; i < recent.length - pivotWindow; i += 1) {
    const point = recent[i];
    const left = recent.slice(i - pivotWindow, i);
    const right = recent.slice(i + 1, i + pivotWindow + 1);

    if (left.every(p => point.low <= p.low) && right.every(p => point.low <= p.low)) {
      lows.push(point.low);
    }

    if (left.every(p => point.high >= p.high) && right.every(p => point.high >= p.high)) {
      highs.push(point.high);
    }
  }

  const dedupedLows = dedupeLevels(lows).filter(level => !isNumber(lastClose) || level <= lastClose).sort((a, b) => b - a).slice(0, 3);
  const dedupedHighs = dedupeLevels(highs).filter(level => !isNumber(lastClose) || level >= lastClose).sort((a, b) => a - b).slice(0, 3);

  return {
    supports: dedupedLows.map(rnd),
    resistances: dedupedHighs.map(rnd),
  };
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return [];
  return RSI.calculate({ values: closes, period });
}

function calcMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (closes.length < slowPeriod + signalPeriod) return [];
  return MACD.calculate({
    values: closes,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
}

function calcBB(closes, period = 20, stdDev = 2) {
  if (closes.length < period) return [];
  return BollingerBands.calculate({ period, values: closes, stdDev });
}

function calcEMA(values, period) {
  if (values.length < period) return [];
  return EMA.calculate({ values, period });
}

function calcSMA(values, period) {
  if (values.length < period) return [];
  return SMA.calculate({ values, period });
}

function calcATR(highs, lows, closes, period = 14) {
  if (closes.length < period + 1) return [];
  return ATR.calculate({ high: highs, low: lows, close: closes, period });
}

function calcADX(highs, lows, closes, period = 14) {
  if (closes.length < period * 2) return [];
  return ADX.calculate({ high: highs, low: lows, close: closes, period });
}

function calcOBV(closes, volumes) {
  if (!closes.length || closes.length !== volumes.length) return [];
  return OBV.calculate({ close: closes, volume: volumes });
}

function calculateVolumeRatio(volumes, volumeMA20) {
  const lastVolume = volumes.at(-1);
  const averageVolume = volumeMA20.at(-1);
  if (!isNumber(lastVolume) || !isNumber(averageVolume) || averageVolume === 0) return null;
  return rnd(lastVolume / averageVolume);
}

function padFront(totalLen, arr) {
  const padLen = totalLen - arr.length;
  return [...Array(Math.max(0, padLen)).fill(null), ...arr.map(v => rnd(v))];
}

function padMacd(totalLen, arr) {
  const padLen = totalLen - arr.length;
  const pad = Array(Math.max(0, padLen)).fill(null);
  return {
    macdLine: [...pad, ...arr.map(m => rnd(m.MACD))],
    signalLine: [...pad, ...arr.map(m => rnd(m.signal))],
    histogram: [...pad, ...arr.map(m => rnd(m.histogram))],
  };
}

function padBB(totalLen, arr) {
  const padLen = totalLen - arr.length;
  const pad = Array(Math.max(0, padLen)).fill(null);
  return {
    upper: [...pad, ...arr.map(b => rnd(b.upper))],
    middle: [...pad, ...arr.map(b => rnd(b.middle))],
    lower: [...pad, ...arr.map(b => rnd(b.lower))],
  };
}

function padADX(totalLen, arr) {
  const padLen = totalLen - arr.length;
  const pad = Array(Math.max(0, padLen)).fill(null);
  return {
    adx14: [...pad, ...arr.map(item => rnd(item.adx))],
    plusDI: [...pad, ...arr.map(item => rnd(item.pdi))],
    minusDI: [...pad, ...arr.map(item => rnd(item.mdi))],
  };
}

function dedupeLevels(levels) {
  const unique = [];
  for (const level of levels) {
    if (!unique.some(existing => percentDistance(existing, level) <= 0.02)) {
      unique.push(level);
    }
  }
  return unique;
}
