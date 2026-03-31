import { ADX, ATR, BollingerBands, EMA, MACD, OBV, RSI, SMA } from 'technicalindicators';

export function calculateTechnicalAnalysis(prices) {
  const indicators = calculateIndicators(prices);
  const marketState = evaluateMarketState(prices, indicators);
  const signalScores = calculateSignalScores(prices, indicators);
  const signalSummary = buildSignalSummary(prices, indicators, marketState, signalScores);

  return {
    indicators,
    marketState,
    signalScores,
    signalSummary,
  };
}

export function calculateTechnicalAnalysisForDate(prices, requestedDate) {
  if (!Array.isArray(prices) || prices.length === 0) {
    throw new Error('가격 데이터가 없습니다.');
  }

  const targetIndex = findTargetIndexOnOrBefore(prices, requestedDate);
  if (targetIndex === -1) {
    throw new Error('선택한 날짜 이전의 가격 데이터가 없습니다.');
  }

  const slicedPrices = prices.slice(0, targetIndex + 1);
  const analysis = calculateTechnicalAnalysis(slicedPrices);
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

export function calculateBacktest(prices, startDate, endDate) {
  if (!Array.isArray(prices) || prices.length === 0) {
    throw new Error('가격 데이터가 없습니다.');
  }

  const start = normalizeDateString(startDate);
  const end = normalizeDateString(endDate);

  if (!start || !end) {
    throw new Error('유효한 시작일과 종료일이 필요합니다.');
  }

  if (start > end) {
    throw new Error('시작일은 종료일보다 늦을 수 없습니다.');
  }

  const startIndex = prices.findIndex(price => price?.date && price.date >= start);
  const endIndex = findTargetIndexOnOrBefore(prices, end);

  if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
    throw new Error('선택한 기간에 해당하는 가격 데이터가 없습니다.');
  }

  const results = [];
  const trades = [];
  let equity = 1;
  let peakEquity = 1;
  let maxDrawdown = 0;
  let position = null;
  let wins = 0;

  for (let i = startIndex; i <= endIndex; i += 1) {
    const currentPrice = prices[i];
    const previousPrice = prices[i - 1];

    if (position && isNumber(previousPrice?.close) && isNumber(currentPrice?.close) && previousPrice.close !== 0) {
      equity *= currentPrice.close / previousPrice.close;
    }

    const slicedPrices = prices.slice(0, i + 1);
    const analysis = calculateTechnicalAnalysis(slicedPrices);
    const snapshot = buildIndicatorSnapshot(slicedPrices, analysis.indicators);
    const rawSignal = analysis.signalSummary.signal;
    const signal = rawSignal === 'NEUTRAL' ? 'HOLD' : rawSignal;

    let action = 'HOLD';
    if (!position && signal === 'BUY' && isNumber(currentPrice?.close)) {
      position = {
        entryDate: currentPrice.date,
        entryPrice: currentPrice.close,
      };
      action = 'ENTER_LONG';
    } else if (position && signal === 'SELL' && isNumber(currentPrice?.close)) {
      const tradeReturn = currentPrice.close / position.entryPrice - 1;
      trades.push({
        entryDate: position.entryDate,
        exitDate: currentPrice.date,
        entryPrice: rnd(position.entryPrice),
        exitPrice: rnd(currentPrice.close),
        returnPct: rnd(tradeReturn * 100),
        holdingDays: diffDays(position.entryDate, currentPrice.date),
        outcome: tradeReturn > 0 ? 'WIN' : tradeReturn < 0 ? 'LOSS' : 'FLAT',
      });
      if (tradeReturn > 0) wins += 1;
      position = null;
      action = 'EXIT_LONG';
    }

    peakEquity = Math.max(peakEquity, equity);
    if (peakEquity > 0) {
      maxDrawdown = Math.min(maxDrawdown, equity / peakEquity - 1);
    }

    results.push({
      date: currentPrice.date,
      close: rnd(currentPrice.close),
      buyScore: analysis.signalScores.buyScore,
      sellScore: analysis.signalScores.sellScore,
      signal,
      strength: analysis.signalSummary.strength,
      position: position ? 'LONG' : 'CASH',
      action,
      equity: rnd(equity),
      cumulativeReturnPct: rnd((equity - 1) * 100),
      snapshot,
    });
  }

  if (position) {
    const lastPrice = prices[endIndex];
    const tradeReturn = lastPrice.close / position.entryPrice - 1;
    trades.push({
      entryDate: position.entryDate,
      exitDate: lastPrice.date,
      entryPrice: rnd(position.entryPrice),
      exitPrice: rnd(lastPrice.close),
      returnPct: rnd(tradeReturn * 100),
      holdingDays: diffDays(position.entryDate, lastPrice.date),
      outcome: tradeReturn > 0 ? 'WIN' : tradeReturn < 0 ? 'LOSS' : 'FLAT',
      forcedExit: true,
    });
    if (tradeReturn > 0) wins += 1;
  }

  const periodPrices = prices.slice(startIndex, endIndex + 1);
  const firstClose = periodPrices[0]?.close ?? null;
  const lastClose = periodPrices.at(-1)?.close ?? null;
  const buyHoldReturnPct = isNumber(firstClose) && isNumber(lastClose) && firstClose !== 0
    ? rnd(((lastClose / firstClose) - 1) * 100)
    : null;

  return {
    requestedRange: { startDate: start, endDate: end },
    actualRange: {
      startDate: periodPrices[0]?.date ?? null,
      endDate: periodPrices.at(-1)?.date ?? null,
      tradingDays: periodPrices.length,
    },
    summary: {
      cumulativeReturnPct: rnd((equity - 1) * 100),
      tradeCount: trades.length,
      winRatePct: trades.length ? rnd((wins / trades.length) * 100) : 0,
      maxDrawdownPct: rnd(maxDrawdown * 100),
      buyHoldReturnPct,
      finalEquity: rnd(equity),
    },
    equityCurve: results.map(item => ({
      date: item.date,
      equity: item.equity,
      cumulativeReturnPct: item.cumulativeReturnPct,
      signal: item.signal,
    })),
    trades,
    results,
  };
}

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

function evaluateMarketState(prices, indicators) {
  const closes = prices.map(p => p.close);
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

function calculateSignalScores(prices, indicators) {
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

function buildSignalSummary(prices, indicators, marketState, signalScores) {
  const context = buildScoreContext(prices, indicators);
  const signal = determineSignal(signalScores.buyScore, signalScores.sellScore);
  const dominantScore = signal === 'SELL' ? signalScores.sellScore : signalScores.buyScore;

  return {
    signal,
    strength: determineStrength(dominantScore, signal),
    reasons: buildReasons(context, marketState, signal),
    risks: buildRisks(context, marketState, signal),
  };
}

function buildScoreContext(prices, indicators) {
  const closes = prices.map(p => p.close);
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

function buildIndicatorSnapshot(prices, indicators) {
  const context = buildScoreContext(prices, indicators);

  return {
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

function scoreTrendBuy(ctx) {
  let score = 0;
  if (isNumber(ctx.ema20) && isNumber(ctx.ema50) && ctx.ema20 > ctx.ema50) score += 8;
  if (isNumber(ctx.ema50) && isNumber(ctx.sma200) && ctx.ema50 > ctx.sma200) score += 8;
  if (isNumber(ctx.lastClose) && isNumber(ctx.ema20) && ctx.lastClose > ctx.ema20) score += 5;
  if (isNumber(ctx.lastClose) && isNumber(ctx.sma200) && ctx.lastClose > ctx.sma200) score += 5;
  if (isNumber(ctx.adx) && ctx.adx > 25 && isNumber(ctx.plusDI) && isNumber(ctx.minusDI) && ctx.plusDI > ctx.minusDI) score += 4;
  return score;
}

function scoreMomentumBuy(ctx) {
  let score = 0;
  if (crossedAbove(ctx.prevMacd, ctx.prevMacdSignal, ctx.macd, ctx.macdSignal)) score += 8;
  if (isNumber(ctx.histogram) && isNumber(ctx.prevHistogram) && ctx.histogram > ctx.prevHistogram) score += 4;
  if (isNumber(ctx.rsi) && ctx.rsi >= 45 && ctx.rsi <= 65) score += 6;
  if (isNumber(ctx.prevRsi) && isNumber(ctx.rsi) && ctx.prevRsi <= 30 && ctx.rsi > ctx.prevRsi) score += 7;
  if (isNumber(ctx.rsi) && ctx.rsi > 75) score -= 6;
  return score;
}

function scoreVolumeBuy(ctx) {
  let score = 0;
  if (isNumber(ctx.volumeRatio) && ctx.volumeRatio >= 1.5) score += 8;
  if (isNumber(ctx.lastClose) && isNumber(ctx.prevClose) && ctx.lastClose > ctx.prevClose && isNumber(ctx.volumeRatio) && ctx.volumeRatio >= 1.2) score += 5;
  if (isNumber(ctx.obv) && isNumber(ctx.prevObv) && ctx.obv > ctx.prevObv) score += 4;
  if (isNumber(ctx.nearestResistance) && isNumber(ctx.lastClose) && ctx.lastClose > ctx.nearestResistance && isNumber(ctx.volumeRatio) && ctx.volumeRatio >= 1.5) score += 3;
  if (isNumber(ctx.volumeRatio) && ctx.volumeRatio < 1) score -= 4;
  return score;
}

function scoreLocationBuy(ctx) {
  let score = 0;
  if (isNumber(ctx.nearestSupport) && isNumber(ctx.lastClose) && percentDistance(ctx.lastClose, ctx.nearestSupport) <= 0.03 && ctx.lastClose >= ctx.nearestSupport) score += 6;
  if (isNumber(ctx.nearestResistance) && isNumber(ctx.lastClose) && ctx.lastClose > ctx.nearestResistance) score += 8;
  if (isNumber(ctx.bbMiddle) && isNumber(ctx.lastClose) && ctx.lastClose > ctx.bbMiddle) score += 3;
  if (isNumber(ctx.bbUpper) && isNumber(ctx.lastClose) && ctx.lastClose > ctx.bbUpper) score -= 3;
  if (isNumber(ctx.nearestResistance) && isNumber(ctx.lastClose) && percentDistance(ctx.nearestResistance, ctx.lastClose) <= 0.02 && ctx.lastClose < ctx.nearestResistance) score -= 6;
  return score;
}

function scoreRiskBuy(ctx) {
  let score = 0;
  if (isNumber(ctx.atr) && isNumber(ctx.lastClose)) {
    const atrRatio = ctx.atr / ctx.lastClose;
    if (atrRatio <= 0.03) score += 5;
    else if (atrRatio >= 0.06) score -= 3;
  }
  if (isNumber(ctx.nearestSupport) && isNumber(ctx.nearestResistance) && isNumber(ctx.lastClose)) {
    const risk = Math.max(ctx.lastClose - ctx.nearestSupport, 0);
    const reward = Math.max(ctx.nearestResistance - ctx.lastClose, 0);
    if (risk > 0 && reward / risk >= 2) score += 5;
  }
  return score;
}

function scoreTrendSell(ctx) {
  let score = 0;
  if (isNumber(ctx.ema20) && isNumber(ctx.ema50) && ctx.ema20 < ctx.ema50) score += 8;
  if (isNumber(ctx.ema50) && isNumber(ctx.sma200) && ctx.ema50 < ctx.sma200) score += 8;
  if (isNumber(ctx.lastClose) && isNumber(ctx.ema20) && ctx.lastClose < ctx.ema20) score += 5;
  if (isNumber(ctx.lastClose) && isNumber(ctx.sma200) && ctx.lastClose < ctx.sma200) score += 5;
  if (isNumber(ctx.adx) && ctx.adx > 25 && isNumber(ctx.minusDI) && isNumber(ctx.plusDI) && ctx.minusDI > ctx.plusDI) score += 4;
  return score;
}

function scoreMomentumSell(ctx) {
  let score = 0;
  if (crossedBelow(ctx.prevMacd, ctx.prevMacdSignal, ctx.macd, ctx.macdSignal)) score += 8;
  if (isNumber(ctx.histogram) && isNumber(ctx.prevHistogram) && ctx.histogram < ctx.prevHistogram) score += 4;
  if (isNumber(ctx.rsi) && ctx.rsi <= 35) score += 6;
  if (isNumber(ctx.prevRsi) && isNumber(ctx.rsi) && ctx.prevRsi >= 70 && ctx.rsi < ctx.prevRsi) score += 7;
  if (isNumber(ctx.rsi) && ctx.rsi < 25) score -= 6;
  return score;
}

function scoreVolumeSell(ctx) {
  let score = 0;
  if (isNumber(ctx.volumeRatio) && ctx.volumeRatio >= 1.5 && isNumber(ctx.lastClose) && isNumber(ctx.prevClose) && ctx.lastClose < ctx.prevClose) score += 8;
  if (isNumber(ctx.nearestSupport) && isNumber(ctx.lastClose) && ctx.lastClose < ctx.nearestSupport && isNumber(ctx.volumeRatio) && ctx.volumeRatio >= 1.2) score += 7;
  if (isNumber(ctx.obv) && isNumber(ctx.prevObv) && ctx.obv < ctx.prevObv) score += 5;
  if (isNumber(ctx.volumeRatio) && ctx.volumeRatio < 1) score -= 4;
  return score;
}

function scoreLocationSell(ctx) {
  let score = 0;
  if (isNumber(ctx.nearestResistance) && isNumber(ctx.lastClose) && percentDistance(ctx.nearestResistance, ctx.lastClose) <= 0.02 && ctx.lastClose <= ctx.nearestResistance) score += 5;
  if (isNumber(ctx.nearestSupport) && isNumber(ctx.lastClose) && ctx.lastClose < ctx.nearestSupport) score += 8;
  if (isNumber(ctx.bbLower) && isNumber(ctx.lastClose) && ctx.lastClose < ctx.bbLower) score += 2;
  return score;
}

function scoreRiskSell(ctx) {
  let score = 0;
  if (isNumber(ctx.atr) && isNumber(ctx.lastClose)) {
    const atrRatio = ctx.atr / ctx.lastClose;
    if (atrRatio >= 0.04) score += 5;
  }
  if (isNumber(ctx.nearestSupport) && isNumber(ctx.nearestResistance) && isNumber(ctx.lastClose)) {
    const risk = Math.max(ctx.nearestResistance - ctx.lastClose, 0);
    const reward = Math.max(ctx.lastClose - ctx.nearestSupport, 0);
    if (risk > 0 && reward / risk >= 2) score += 5;
  }
  return score;
}

function buildReasons(ctx, marketState, signal) {
  if (signal === 'NEUTRAL') {
    return ['신호가 엇갈려서 지금은 바로 진입하기보다 관찰 종목으로 보는 편이 좋습니다.'];
  }

  const reasons = [];

  if (signal === 'BUY') {
    if (marketState.trend === 'uptrend') reasons.push('이동평균선 배열이 상승 추세를 지지하고 있습니다.');
    if (crossedAbove(ctx.prevMacd, ctx.prevMacdSignal, ctx.macd, ctx.macdSignal)) reasons.push('MACD가 최근 골든크로스를 만들었습니다.');
    if (isNumber(ctx.volumeRatio) && ctx.volumeRatio >= 1.5) reasons.push(`거래량이 20일 평균 대비 ${ctx.volumeRatio.toFixed(2)}배로 늘었습니다.`);
    if (isNumber(ctx.adx) && ctx.adx > 25) reasons.push('ADX가 추세 강도가 충분하다는 점을 보여줍니다.');
    if (isNumber(ctx.nearestSupport) && isNumber(ctx.lastClose) && percentDistance(ctx.lastClose, ctx.nearestSupport) <= 0.03) reasons.push('가격이 최근 지지 구간 근처에서 버티고 있습니다.');
  } else {
    if (marketState.trend === 'downtrend') reasons.push('이동평균선 배열이 하락 추세를 지지하고 있습니다.');
    if (crossedBelow(ctx.prevMacd, ctx.prevMacdSignal, ctx.macd, ctx.macdSignal)) reasons.push('MACD가 최근 데드크로스를 만들었습니다.');
    if (isNumber(ctx.volumeRatio) && ctx.volumeRatio >= 1.5) reasons.push(`하락 흐름에 평균 대비 ${ctx.volumeRatio.toFixed(2)}배의 거래량이 실렸습니다.`);
    if (isNumber(ctx.adx) && ctx.adx > 25) reasons.push('ADX가 하락 추세 강도가 충분하다는 점을 보여줍니다.');
    if (isNumber(ctx.nearestSupport) && isNumber(ctx.lastClose) && ctx.lastClose < ctx.nearestSupport) reasons.push('가격이 가까운 지지선을 이탈했습니다.');
  }

  return reasons.slice(0, 4);
}

function buildRisks(ctx, marketState, signal) {
  const risks = [];

  if (isNumber(ctx.atr) && isNumber(ctx.lastClose)) {
    const atrRatio = ctx.atr / ctx.lastClose;
    if (atrRatio >= 0.05) risks.push('ATR이 높아 평소보다 변동성이 큰 구간입니다.');
  }

  if (signal === 'BUY') {
    if (isNumber(ctx.nearestResistance) && isNumber(ctx.lastClose) && percentDistance(ctx.nearestResistance, ctx.lastClose) <= 0.03 && ctx.lastClose < ctx.nearestResistance) {
      risks.push('가격이 아직 최근 저항 구간에 가까워 부담이 남아 있습니다.');
    }
    if (isNumber(ctx.rsi) && ctx.rsi > 70) risks.push('RSI가 과열권에 가까워 추가 상승 여력이 줄어들 수 있습니다.');
  } else if (signal === 'SELL') {
    if (isNumber(ctx.nearestSupport) && isNumber(ctx.lastClose) && percentDistance(ctx.lastClose, ctx.nearestSupport) <= 0.03 && ctx.lastClose > ctx.nearestSupport) {
      risks.push('가격이 지지선에 가까워 반등 가능성이 남아 있습니다.');
    }
    if (isNumber(ctx.rsi) && ctx.rsi < 30) risks.push('RSI가 과매도권에 가까워 되돌림 반등이 나올 수 있습니다.');
  } else {
    if (marketState.trendStrength === 'weak') risks.push('추세 강도가 약해서 가짜 신호가 나올 가능성이 있습니다.');
  }

  if (!risks.length) {
    risks.push('일반적인 시장 변동 외에 두드러진 기술적 리스크는 크지 않습니다.');
  }

  return risks.slice(0, 3);
}

function determineSignal(buyScore, sellScore) {
  const gap = Math.abs(buyScore - sellScore);
  if (gap < 10) return 'NEUTRAL';
  return buyScore > sellScore ? 'BUY' : 'SELL';
}

function determineStrength(score, signal) {
  if (signal === 'NEUTRAL') return 'watch';
  if (score >= 80) return 'very_strong';
  if (score >= 65) return 'strong';
  if (score >= 50) return 'watch';
  return 'weak';
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

function findTargetIndexOnOrBefore(prices, requestedDate) {
  const normalizedDate = normalizeDateString(requestedDate);
  if (!normalizedDate) return prices.length - 1;

  for (let i = prices.length - 1; i >= 0; i -= 1) {
    if (prices[i]?.date && prices[i].date <= normalizedDate) {
      return i;
    }
  }

  return -1;
}

function normalizeDateString(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function diffDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
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

function crossedAbove(prevA, prevB, currA, currB) {
  return isNumber(prevA) && isNumber(prevB) && isNumber(currA) && isNumber(currB) && prevA <= prevB && currA > currB;
}

function crossedBelow(prevA, prevB, currA, currB) {
  return isNumber(prevA) && isNumber(prevB) && isNumber(currA) && isNumber(currB) && prevA >= prevB && currA < currB;
}

function percentDistance(a, b) {
  if (!isNumber(a) || !isNumber(b) || b === 0) return Infinity;
  return Math.abs(a - b) / Math.abs(b);
}

function sumScores(breakdown) {
  return Object.values(breakdown).reduce((sum, value) => sum + value, 0);
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function avg(values) {
  const filtered = values.filter(isNumber);
  if (!filtered.length) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function rnd(n) {
  if (!isNumber(n)) return null;
  return Math.round(n * 100) / 100;
}
