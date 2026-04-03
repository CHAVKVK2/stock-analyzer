const KR_CALIBRATION_CUTOFF = '2025-04-30';

const M7_SYMBOLS = new Set([
  'AAPL',
  'AMZN',
  'GOOG',
  'GOOGL',
  'META',
  'MSFT',
  'NVDA',
  'TSLA',
]);

export const PROFILE_DEFINITIONS = {
  kr_standard: {
    key: 'kr_standard',
    label: 'KR 표준',
    market: 'KR',
    style: 'broad_large_cap',
    calibration: {
      method: 'backtest_anchor',
      calibratedThrough: KR_CALIBRATION_CUTOFF,
      note: '한국장은 2025-04-30까지의 백테스트 기준선으로 고정해 최근 과열 구간 과최적화를 피합니다.',
    },
  },
  us_megacap_growth: {
    key: 'us_megacap_growth',
    label: 'US 메가캡 성장',
    market: 'US',
    style: 'megacap_growth',
    calibration: {
      method: 'profile_baseline',
      calibratedThrough: null,
      note: 'M7 계열은 추세 지속과 돌파 확인 비중을 더 크게 둡니다.',
    },
  },
  us_broad_large_cap: {
    key: 'us_broad_large_cap',
    label: 'US 대형주 표준',
    market: 'US',
    style: 'broad_large_cap',
    calibration: {
      method: 'profile_baseline',
      calibratedThrough: null,
      note: '일반 대형주는 추세와 위치, 리스크를 균형 있게 반영합니다.',
    },
  },
};

export const SUPPORTED_PROFILES = ['auto', ...Object.keys(PROFILE_DEFINITIONS)];

export function resolveMarketProfile({ ticker, resolvedTicker, profile = 'auto' } = {}) {
  if (profile && profile !== 'auto' && PROFILE_DEFINITIONS[profile]) {
    return PROFILE_DEFINITIONS[profile];
  }

  const normalizedTicker = String(resolvedTicker || ticker || '').trim().toUpperCase();

  if (normalizedTicker.endsWith('.KS') || normalizedTicker.endsWith('.KQ')) {
    return PROFILE_DEFINITIONS.kr_standard;
  }

  if (M7_SYMBOLS.has(normalizedTicker)) {
    return PROFILE_DEFINITIONS.us_megacap_growth;
  }

  return PROFILE_DEFINITIONS.us_broad_large_cap;
}
