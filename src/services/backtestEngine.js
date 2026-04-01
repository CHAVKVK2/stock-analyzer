import { diffDays, isNumber, normalizeDateString, rnd } from './technicalUtils.js';
import { findTargetIndexOnOrBefore } from './indicators.js';

export function calculateBacktestRange(prices, startDate, endDate, dependencies) {
  if (!Array.isArray(prices) || prices.length === 0) {
    throw new Error('가격 데이터가 없습니다.');
  }

  const start = normalizeDateString(startDate);
  const end = normalizeDateString(endDate);

  if (!start || !end) {
    throw new Error('유효한 시작일과 종료일이 필요합니다.');
  }

  if (start > end) {
    throw new Error('시작일이 종료일보다 늦을 수 없습니다.');
  }

  const startIndex = prices.findIndex(price => price?.date && price.date >= start);
  const endIndex = findTargetIndexOnOrBefore(prices, end);

  if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
    throw new Error('선택한 기간에 해당하는 가격 데이터가 없습니다.');
  }

  const { analyzePrices, buildIndicatorSnapshot } = dependencies;
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
    const analysis = analyzePrices(slicedPrices);
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
