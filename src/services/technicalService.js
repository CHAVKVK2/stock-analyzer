import { RSI, MACD, BollingerBands } from 'technicalindicators';

/**
 * 가격 배열에서 기술 지표 계산
 * 모든 결과 배열은 prices 배열과 동일한 길이 (앞에 null 패딩)
 */
export function calculateIndicators(prices) {
  const closes = prices.map(p => p.close);
  const len = closes.length;

  return {
    rsi:            padFront(len, calcRSI(closes)),
    macd:           padMacd(len, calcMACD(closes)),
    bollingerBands: padBB(len, calcBB(closes)),
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

function padFront(totalLen, arr) {
  const padLen = totalLen - arr.length;
  return [...Array(padLen).fill(null), ...arr.map(v => rnd(v))];
}

function padMacd(totalLen, arr) {
  const padLen = totalLen - arr.length;
  const pad = Array(padLen).fill(null);
  return {
    macdLine:   [...pad, ...arr.map(m => rnd(m.MACD))],
    signalLine: [...pad, ...arr.map(m => rnd(m.signal))],
    histogram:  [...pad, ...arr.map(m => rnd(m.histogram))],
  };
}

function padBB(totalLen, arr) {
  const padLen = totalLen - arr.length;
  const pad = Array(padLen).fill(null);
  return {
    upper:  [...pad, ...arr.map(b => rnd(b.upper))],
    middle: [...pad, ...arr.map(b => rnd(b.middle))],
    lower:  [...pad, ...arr.map(b => rnd(b.lower))],
  };
}

function rnd(n) {
  if (n == null || isNaN(n)) return null;
  return Math.round(n * 100) / 100;
}
