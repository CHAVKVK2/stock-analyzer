import { resolveLocalAlias } from './stockAliasCatalog.js';

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

  if (suffixOverride && suffixOverride !== 'auto') {
    if (input.includes('.')) return input.toUpperCase();
    if (suffixOverride === 'none') return input.toUpperCase();
    return input.toUpperCase() + suffixOverride;
  }

  const localAlias = resolveLocalAlias(input);
  if (localAlias) return localAlias.symbol;

  if (input.includes('.')) return input.toUpperCase();

  if (/^\d+$/.test(input)) {
    return input + '.KS';
  }

  return input.toUpperCase();
}
