import { diffDays, isNumber, normalizeDateString, rnd } from './technicalUtils.js';
import { findTargetIndexOnOrBefore } from './indicators.js';

const FORWARD_HORIZONS = [5, 10, 20];

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
    throw new Error('시작일은 종료일보다 늦을 수 없습니다.');
  }

  const startIndex = prices.findIndex(price => price?.date && price.date >= start);
  const endIndex = findTargetIndexOnOrBefore(prices, end);

  if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
    throw new Error('선택한 기간에 해당하는 가격 데이터를 찾을 수 없습니다.');
  }

  const { analyzePrices, buildIndicatorSnapshot, analysisOptions = {} } = dependencies;
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
    const analysis = analyzePrices(slicedPrices, analysisOptions);
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
      const closedTrade = buildTrade(position, currentPrice);
      trades.push(closedTrade);
      if (closedTrade.outcome === 'WIN') wins += 1;
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
    const closedTrade = buildTrade(position, lastPrice, true);
    trades.push(closedTrade);
    if (closedTrade.outcome === 'WIN') wins += 1;
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
    statistics: buildBacktestStatistics(results, trades, prices, endIndex),
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

function buildTrade(position, currentPrice, forcedExit = false) {
  const tradeReturn = currentPrice.close / position.entryPrice - 1;

  return {
    entryDate: position.entryDate,
    exitDate: currentPrice.date,
    entryPrice: rnd(position.entryPrice),
    exitPrice: rnd(currentPrice.close),
    returnPct: rnd(tradeReturn * 100),
    holdingDays: diffDays(position.entryDate, currentPrice.date),
    outcome: tradeReturn > 0 ? 'WIN' : tradeReturn < 0 ? 'LOSS' : 'FLAT',
    forcedExit,
  };
}

function buildBacktestStatistics(results, trades, allPrices, endIndex) {
  const signalCounts = { BUY: 0, SELL: 0, HOLD: 0 };
  const actionCounts = { ENTER_LONG: 0, EXIT_LONG: 0, HOLD: 0 };

  results.forEach(result => {
    signalCounts[result.signal] = (signalCounts[result.signal] || 0) + 1;
    actionCounts[result.action] = (actionCounts[result.action] || 0) + 1;
  });

  const winningTrades = trades.filter(trade => trade.outcome === 'WIN');
  const losingTrades = trades.filter(trade => trade.outcome === 'LOSS');
  const avgTradeReturnPct = average(trades.map(trade => trade.returnPct));
  const avgHoldingDays = average(trades.map(trade => trade.holdingDays));
  const avgWinReturnPct = average(winningTrades.map(trade => trade.returnPct));
  const avgLossReturnPct = average(losingTrades.map(trade => trade.returnPct));

  return {
    signalCounts,
    actionCounts,
    tradeStats: {
      avgTradeReturnPct,
      avgHoldingDays,
      avgWinReturnPct,
      avgLossReturnPct,
    },
    setupStats: {
      buySignals: buildForwardReturnStats(results, allPrices, endIndex, 'BUY'),
      sellSignals: buildForwardReturnStats(results, allPrices, endIndex, 'SELL'),
    },
  };
}

function buildForwardReturnStats(results, allPrices, endIndex, signalType) {
  const byDate = new Map(allPrices.map((price, index) => [price.date, { ...price, index }]));
  const signalRows = results.filter(result => result.signal === signalType);
  const horizons = {};

  for (const horizon of FORWARD_HORIZONS) {
    const returns = [];

    for (const row of signalRows) {
      const current = byDate.get(row.date);
      if (!current || current.index + horizon > endIndex) continue;

      const future = allPrices[current.index + horizon];
      if (!isNumber(current.close) || !isNumber(future?.close) || current.close === 0) continue;

      const rawReturn = (future.close / current.close - 1) * 100;
      const normalizedReturn = signalType === 'BUY' ? rawReturn : -rawReturn;
      returns.push(normalizedReturn);
    }

    horizons[`${horizon}d`] = {
      count: returns.length,
      winRatePct: returns.length ? rnd((returns.filter(value => value > 0).length / returns.length) * 100) : null,
      avgReturnPct: returns.length ? rnd(returns.reduce((sum, value) => sum + value, 0) / returns.length) : null,
    };
  }

  return horizons;
}

function average(values) {
  const filtered = values.filter(isNumber);
  if (!filtered.length) return null;
  return rnd(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}
