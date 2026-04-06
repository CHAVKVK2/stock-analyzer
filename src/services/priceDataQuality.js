const MIN_PRICE_POINTS = 50;
const INVALID_STREAK_THRESHOLD = 2;

export function assessPriceDataQuality(prices, options = {}) {
  const series = Array.isArray(prices) ? prices : [];
  const today = options.today || new Date().toISOString().split('T')[0];

  const failures = [];
  const warnings = [];

  if (series.length < MIN_PRICE_POINTS) {
    failures.push({
      code: 'INSUFFICIENT_PRICE_POINTS',
      message: `최소 ${MIN_PRICE_POINTS}개 이상의 가격 데이터가 필요합니다.`,
      actual: series.length,
      expectedMinimum: MIN_PRICE_POINTS,
    });
  }

  const invalidStreak = findInvalidStreak(series);
  if (invalidStreak.length >= INVALID_STREAK_THRESHOLD) {
    failures.push({
      code: 'CONSECUTIVE_INVALID_PRICE_POINTS',
      message: '0 또는 null 가격 데이터가 연속으로 감지되었습니다.',
      streakLength: invalidStreak.length,
      dates: invalidStreak.map(item => item.date),
    });
  }

  const latestDate = series.at(-1)?.date ?? null;
  const hasTodayData = latestDate === today;
  if (!hasTodayData) {
    warnings.push({
      code: 'TODAY_DATA_MISSING',
      message: '오늘 날짜 데이터가 포함되어 있지 않습니다.',
      latestDate,
      expectedDate: today,
    });
  }

  return {
    passed: failures.length === 0,
    checkedAt: new Date().toISOString(),
    latestDate,
    pointCount: series.length,
    hasTodayData,
    failures,
    warnings,
  };
}

export function assertPriceDataQuality(prices, options = {}) {
  const quality = assessPriceDataQuality(prices, options);

  if (!quality.passed) {
    const error = new Error(quality.failures.map(item => item.message).join(' '));
    error.code = 'PRICE_DATA_QUALITY_FAILED';
    error.statusCode = 422;
    error.dataQuality = quality;
    throw error;
  }

  return quality;
}

function findInvalidStreak(prices) {
  let current = [];
  let longest = [];

  for (const price of prices) {
    if (isInvalidPricePoint(price)) {
      current.push(price);
      if (current.length > longest.length) longest = [...current];
      continue;
    }
    current = [];
  }

  return longest;
}

function isInvalidPricePoint(price) {
  if (!price) return true;
  const values = [price.open, price.high, price.low, price.close];
  return values.some(value => value == null || value <= 0);
}
