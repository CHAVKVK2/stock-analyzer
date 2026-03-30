const LOCAL_TICKER_ALIASES = new Map([
  ['삼성전자', '005930.KS'],
  ['애플', 'AAPL'],
  ['apple', 'AAPL'],
  ['tesla', 'TSLA'],
  ['테슬라', 'TSLA'],
  ['nvidia', 'NVDA'],
  ['엔비디아', 'NVDA'],
  ['microsoft', 'MSFT'],
  ['마이크로소프트', 'MSFT'],
  ['google', 'GOOGL'],
  ['alphabet', 'GOOGL'],
  ['구글', 'GOOGL'],
  ['amazon', 'AMZN'],
  ['아마존', 'AMZN'],
  ['meta', 'META'],
  ['메타', 'META'],
  ['netflix', 'NFLX'],
  ['넷플릭스', 'NFLX'],
  ['현대차', '005380.KS'],
  ['sk하이닉스', '000660.KS'],
  ['네이버', '035420.KS'],
  ['카카오', '035720.KQ'],
  ['lg에너지솔루션', '373220.KS'],
  ['셀트리온', '068270.KS'],
  ['posco', '005490.KS'],
  ['포스코', '005490.KS'],
]);

/**
 * Normalize a raw stock input into a Yahoo Finance symbol.
 * - Numbers only -> add .KS automatically (KOSPI)
 * - Korean/English aliases -> resolve to a known ticker
 * - Explicit suffixes are preserved
 * - Other inputs pass through unchanged
 */
export function resolveTicker(rawInput, suffixOverride) {
  if (!rawInput) throw new Error('종목 코드를 입력해 주세요.');

  const input = rawInput.trim();
  const normalized = normalizeLookupKey(input);

  if (suffixOverride && suffixOverride !== 'auto') {
    if (input.includes('.')) return input.toUpperCase();
    if (suffixOverride === 'none') return input.toUpperCase();
    return input.toUpperCase() + suffixOverride;
  }

  const localAlias = LOCAL_TICKER_ALIASES.get(normalized);
  if (localAlias) return localAlias;

  if (input.includes('.')) return input.toUpperCase();

  if (/^\d+$/.test(input)) {
    return input + '.KS';
  }

  return input.toUpperCase();
}

function normalizeLookupKey(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s._,'"()\-\[\]{}+/]+/g, '');
}
