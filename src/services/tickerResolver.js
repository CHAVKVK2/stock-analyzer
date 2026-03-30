/**
 * 사용자 입력 종목 코드를 Yahoo Finance 형식으로 정규화
 * - 숫자만 → KOSPI (.KS) 자동 추가
 * - 이미 접미사 포함 → 그대로 반환
 * - 영문 → 미국 주식 (그대로)
 */
export function resolveTicker(rawInput, suffixOverride) {
  if (!rawInput) throw new Error('종목 코드를 입력해주세요.');

  const input = rawInput.trim().toUpperCase();

  // 수동 접미사 지정
  if (suffixOverride && suffixOverride !== 'auto') {
    if (input.includes('.')) return input;
    if (suffixOverride === 'none') return input;
    return input + suffixOverride;
  }

  // 이미 접미사 포함 → 그대로
  if (input.includes('.')) return input;

  // 순수 숫자 → 한국 KOSPI
  if (/^\d+$/.test(input)) {
    return input + '.KS';
  }

  // 영문/영숫자 → 미국 주식
  return input;
}
