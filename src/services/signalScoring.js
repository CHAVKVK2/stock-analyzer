import {
  clampScore,
  crossedAbove,
  crossedBelow,
  isNumber,
  percentDistance,
  sumScores,
} from './technicalUtils.js';
import { SCORE_WEIGHTS } from './scoreWeights.js';

export function calculateSignalScores(prices, indicators) {
  const context = buildScoreContext(prices, indicators);

  const buyBreakdown = {
    trend: scoreTrendBuy(context),
    momentum: scoreMomentumBuy(context),
    volume: scoreVolumeBuy(context),
    location: scoreLocationBuy(context),
    risk: scoreRiskBuy(context),
  };

  const sellBreakdown = {
    trend: scoreTrendSell(context),
    momentum: scoreMomentumSell(context),
    volume: scoreVolumeSell(context),
    location: scoreLocationSell(context),
    risk: scoreRiskSell(context),
  };

  return {
    buyScore: clampScore(sumScores(buyBreakdown)),
    sellScore: clampScore(sumScores(sellBreakdown)),
    buyBreakdown,
    sellBreakdown,
  };
}

export function buildScoreContext(prices, indicators) {
  const volumes = prices.map(p => p.volume || 0);
  const lastPrice = prices.at(-1) ?? null;
  const prevPrice = prices.at(-2) ?? null;

  return {
    lastClose: lastPrice?.close ?? null,
    prevClose: prevPrice?.close ?? null,
    ema20: indicators.movingAverages.ema20.at(-1),
    ema50: indicators.movingAverages.ema50.at(-1),
    sma200: indicators.movingAverages.sma200.at(-1),
    rsi: indicators.rsi.at(-1),
    prevRsi: indicators.rsi.at(-2),
    macd: indicators.macd.macdLine.at(-1),
    prevMacd: indicators.macd.macdLine.at(-2),
    macdSignal: indicators.macd.signalLine.at(-1),
    prevMacdSignal: indicators.macd.signalLine.at(-2),
    histogram: indicators.macd.histogram.at(-1),
    prevHistogram: indicators.macd.histogram.at(-2),
    atr: indicators.volatilityIndicators.atr14.at(-1),
    adx: indicators.trendStrength.adx14.at(-1),
    plusDI: indicators.trendStrength.plusDI.at(-1),
    minusDI: indicators.trendStrength.minusDI.at(-1),
    obv: indicators.volumeIndicators.obv.at(-1),
    prevObv: indicators.volumeIndicators.obv.at(-2),
    volume: volumes.at(-1) ?? null,
    volumeMA20: indicators.volumeIndicators.volumeMA20.at(-1),
    volumeRatio: indicators.volumeIndicators.volumeRatio,
    bbUpper: indicators.bollingerBands.upper.at(-1),
    bbMiddle: indicators.bollingerBands.middle.at(-1),
    bbLower: indicators.bollingerBands.lower.at(-1),
    nearestSupport: indicators.levels.supports[0] ?? null,
    nearestResistance: indicators.levels.resistances[0] ?? null,
  };
}

function scoreTrendBuy(ctx) {
  let score = 0;
  if (isNumber(ctx.ema20) && isNumber(ctx.ema50) && ctx.ema20 > ctx.ema50) score += SCORE_WEIGHTS.trend.emaCross;
  if (isNumber(ctx.ema50) && isNumber(ctx.sma200) && ctx.ema50 > ctx.sma200) score += SCORE_WEIGHTS.trend.smaAlignment;
  if (isNumber(ctx.lastClose) && isNumber(ctx.ema20) && ctx.lastClose > ctx.ema20) score += SCORE_WEIGHTS.trend.priceAboveEma20;
  if (isNumber(ctx.lastClose) && isNumber(ctx.sma200) && ctx.lastClose > ctx.sma200) score += SCORE_WEIGHTS.trend.priceAboveSma200;
  if (isNumber(ctx.adx) && ctx.adx > 25 && isNumber(ctx.plusDI) && isNumber(ctx.minusDI) && ctx.plusDI > ctx.minusDI) score += SCORE_WEIGHTS.trend.adxDirectional;
  return score;
}

function scoreMomentumBuy(ctx) {
  let score = 0;
  if (crossedAbove(ctx.prevMacd, ctx.prevMacdSignal, ctx.macd, ctx.macdSignal)) score += SCORE_WEIGHTS.momentum.macdCross;
  if (isNumber(ctx.histogram) && isNumber(ctx.prevHistogram) && ctx.histogram > ctx.prevHistogram) score += SCORE_WEIGHTS.momentum.histogramImprove;
  if (isNumber(ctx.rsi) && ctx.rsi >= 45 && ctx.rsi <= 65) score += SCORE_WEIGHTS.momentum.rsiBalanced;
  if (isNumber(ctx.prevRsi) && isNumber(ctx.rsi) && ctx.prevRsi <= 30 && ctx.rsi > ctx.prevRsi) score += SCORE_WEIGHTS.momentum.rsiRebound;
  if (isNumber(ctx.rsi) && ctx.rsi > 75) score += SCORE_WEIGHTS.momentum.rsiOverheatedPenalty;
  return score;
}

function scoreVolumeBuy(ctx) {
  let score = 0;
  if (isNumber(ctx.volumeRatio) && ctx.volumeRatio >= 1.5) score += SCORE_WEIGHTS.volume.surge;
  if (isNumber(ctx.lastClose) && isNumber(ctx.prevClose) && ctx.lastClose > ctx.prevClose && isNumber(ctx.volumeRatio) && ctx.volumeRatio >= 1.2) score += SCORE_WEIGHTS.volume.directionalSupport;
  if (isNumber(ctx.obv) && isNumber(ctx.prevObv) && ctx.obv > ctx.prevObv) score += SCORE_WEIGHTS.volume.obvConfirm;
  if (isNumber(ctx.nearestResistance) && isNumber(ctx.lastClose) && ctx.lastClose > ctx.nearestResistance && isNumber(ctx.volumeRatio) && ctx.volumeRatio >= 1.5) score += SCORE_WEIGHTS.volume.breakoutBonus;
  if (isNumber(ctx.volumeRatio) && ctx.volumeRatio < 1) score += SCORE_WEIGHTS.volume.lowVolumePenalty;
  return score;
}

function scoreLocationBuy(ctx) {
  let score = 0;
  if (isNumber(ctx.nearestSupport) && isNumber(ctx.lastClose) && percentDistance(ctx.lastClose, ctx.nearestSupport) <= 0.03 && ctx.lastClose >= ctx.nearestSupport) score += SCORE_WEIGHTS.location.supportBounce;
  if (isNumber(ctx.nearestResistance) && isNumber(ctx.lastClose) && ctx.lastClose > ctx.nearestResistance) score += SCORE_WEIGHTS.location.resistanceBreakout;
  if (isNumber(ctx.bbMiddle) && isNumber(ctx.lastClose) && ctx.lastClose > ctx.bbMiddle) score += SCORE_WEIGHTS.location.aboveBbMiddle;
  if (isNumber(ctx.bbUpper) && isNumber(ctx.lastClose) && ctx.lastClose > ctx.bbUpper) score += SCORE_WEIGHTS.location.aboveBbUpperPenalty;
  if (isNumber(ctx.nearestResistance) && isNumber(ctx.lastClose) && percentDistance(ctx.nearestResistance, ctx.lastClose) <= 0.02 && ctx.lastClose < ctx.nearestResistance) score += SCORE_WEIGHTS.location.nearResistancePenalty;
  return score;
}

function scoreRiskBuy(ctx) {
  let score = 0;
  if (isNumber(ctx.atr) && isNumber(ctx.lastClose)) {
    const atrRatio = ctx.atr / ctx.lastClose;
    if (atrRatio <= 0.03) score += SCORE_WEIGHTS.risk.lowAtrBonus;
    else if (atrRatio >= 0.06) score += SCORE_WEIGHTS.risk.highAtrPenalty;
  }
  if (isNumber(ctx.nearestSupport) && isNumber(ctx.nearestResistance) && isNumber(ctx.lastClose)) {
    const risk = Math.max(ctx.lastClose - ctx.nearestSupport, 0);
    const reward = Math.max(ctx.nearestResistance - ctx.lastClose, 0);
    if (risk > 0 && reward / risk >= 2) score += SCORE_WEIGHTS.risk.rewardRiskBonus;
  }
  return score;
}

function scoreTrendSell(ctx) {
  let score = 0;
  if (isNumber(ctx.ema20) && isNumber(ctx.ema50) && ctx.ema20 < ctx.ema50) score += SCORE_WEIGHTS.trend.emaCross;
  if (isNumber(ctx.ema50) && isNumber(ctx.sma200) && ctx.ema50 < ctx.sma200) score += SCORE_WEIGHTS.trend.smaAlignment;
  if (isNumber(ctx.lastClose) && isNumber(ctx.ema20) && ctx.lastClose < ctx.ema20) score += SCORE_WEIGHTS.trend.priceAboveEma20;
  if (isNumber(ctx.lastClose) && isNumber(ctx.sma200) && ctx.lastClose < ctx.sma200) score += SCORE_WEIGHTS.trend.priceAboveSma200;
  if (isNumber(ctx.adx) && ctx.adx > 25 && isNumber(ctx.minusDI) && isNumber(ctx.plusDI) && ctx.minusDI > ctx.plusDI) score += SCORE_WEIGHTS.trend.adxDirectional;
  return score;
}

function scoreMomentumSell(ctx) {
  let score = 0;
  if (crossedBelow(ctx.prevMacd, ctx.prevMacdSignal, ctx.macd, ctx.macdSignal)) score += SCORE_WEIGHTS.momentum.macdCross;
  if (isNumber(ctx.histogram) && isNumber(ctx.prevHistogram) && ctx.histogram < ctx.prevHistogram) score += SCORE_WEIGHTS.momentum.histogramImprove;
  if (isNumber(ctx.rsi) && ctx.rsi <= 35) score += SCORE_WEIGHTS.momentum.rsiBalanced;
  if (isNumber(ctx.prevRsi) && isNumber(ctx.rsi) && ctx.prevRsi >= 70 && ctx.rsi < ctx.prevRsi) score += SCORE_WEIGHTS.momentum.rsiRebound;
  if (isNumber(ctx.rsi) && ctx.rsi < 25) score += SCORE_WEIGHTS.momentum.rsiOversoldPenalty;
  return score;
}

function scoreVolumeSell(ctx) {
  let score = 0;
  if (isNumber(ctx.volumeRatio) && ctx.volumeRatio >= 1.5 && isNumber(ctx.lastClose) && isNumber(ctx.prevClose) && ctx.lastClose < ctx.prevClose) score += SCORE_WEIGHTS.volume.surge;
  if (isNumber(ctx.nearestSupport) && isNumber(ctx.lastClose) && ctx.lastClose < ctx.nearestSupport && isNumber(ctx.volumeRatio) && ctx.volumeRatio >= 1.2) score += SCORE_WEIGHTS.volume.directionalBreakdownSupport;
  if (isNumber(ctx.obv) && isNumber(ctx.prevObv) && ctx.obv < ctx.prevObv) score += SCORE_WEIGHTS.volume.obvConfirmSell;
  if (isNumber(ctx.volumeRatio) && ctx.volumeRatio < 1) score += SCORE_WEIGHTS.volume.lowVolumePenalty;
  return score;
}

function scoreLocationSell(ctx) {
  let score = 0;
  if (isNumber(ctx.nearestResistance) && isNumber(ctx.lastClose) && percentDistance(ctx.nearestResistance, ctx.lastClose) <= 0.02 && ctx.lastClose <= ctx.nearestResistance) score += SCORE_WEIGHTS.location.nearResistanceReject;
  if (isNumber(ctx.nearestSupport) && isNumber(ctx.lastClose) && ctx.lastClose < ctx.nearestSupport) score += SCORE_WEIGHTS.location.belowSupportBreak;
  if (isNumber(ctx.bbLower) && isNumber(ctx.lastClose) && ctx.lastClose < ctx.bbLower) score += SCORE_WEIGHTS.location.belowBbLower;
  return score;
}

function scoreRiskSell(ctx) {
  let score = 0;
  if (isNumber(ctx.atr) && isNumber(ctx.lastClose)) {
    const atrRatio = ctx.atr / ctx.lastClose;
    if (atrRatio >= 0.04) score += SCORE_WEIGHTS.risk.highAtrSellBonus;
  }
  if (isNumber(ctx.nearestSupport) && isNumber(ctx.nearestResistance) && isNumber(ctx.lastClose)) {
    const risk = Math.max(ctx.nearestResistance - ctx.lastClose, 0);
    const reward = Math.max(ctx.lastClose - ctx.nearestSupport, 0);
    if (risk > 0 && reward / risk >= 2) score += SCORE_WEIGHTS.risk.rewardRiskBonus;
  }
  return score;
}
