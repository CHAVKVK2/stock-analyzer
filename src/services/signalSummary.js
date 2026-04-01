import { crossedAbove, crossedBelow, isNumber, percentDistance } from './technicalUtils.js';

export function buildSignalSummary(context, marketState, signalScores) {
  const signal = determineSignal(signalScores.buyScore, signalScores.sellScore);
  const dominantScore = signal === 'SELL' ? signalScores.sellScore : signalScores.buyScore;

  return {
    signal,
    strength: determineStrength(dominantScore, signal),
    reasons: buildReasons(context, marketState, signal),
    risks: buildRisks(context, marketState, signal),
  };
}

function buildReasons(ctx, marketState, signal) {
  if (signal === 'NEUTRAL') {
    return ['신호가 혼재돼서 지금은 바로 진입하기보다 관찰 종목으로 보는 편이 좋습니다.'];
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
    if (isNumber(ctx.rsi) && ctx.rsi > 70) risks.push('RSI가 과열권에 가까워 추가 상승 여력이 줄었을 수 있습니다.');
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
