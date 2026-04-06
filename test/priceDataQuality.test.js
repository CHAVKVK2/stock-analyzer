import test from 'node:test';
import assert from 'node:assert/strict';
import { assessPriceDataQuality, assertPriceDataQuality } from '../src/services/priceDataQuality.js';

function buildSeries(length, overrides = {}) {
  return Array.from({ length }, (_, index) => ({
    date: `2026-01-${String(index + 1).padStart(2, '0')}`,
    open: 100 + index,
    high: 101 + index,
    low: 99 + index,
    close: 100 + index,
    volume: 1000 + index,
    ...overrides[index],
  }));
}

test('50개 이상 데이터는 최소 개수 조건을 통과한다', () => {
  const quality = assessPriceDataQuality(buildSeries(50), { today: '2026-01-50' });
  assert.equal(quality.failures.some(item => item.code === 'INSUFFICIENT_PRICE_POINTS'), false);
});

test('50개 미만 데이터는 품질 실패 처리된다', () => {
  assert.throws(() => assertPriceDataQuality(buildSeries(49), { today: '2026-01-49' }), error => {
    assert.equal(error.code, 'PRICE_DATA_QUALITY_FAILED');
    return true;
  });
});

test('0 또는 null 가격이 연속되면 품질 실패 처리된다', () => {
  const series = buildSeries(60, {
    20: { close: 0 },
    21: { close: null },
  });

  const quality = assessPriceDataQuality(series, { today: '2026-01-60' });
  assert.equal(quality.failures.some(item => item.code === 'CONSECUTIVE_INVALID_PRICE_POINTS'), true);
});

test('오늘 데이터가 없으면 실패 대신 경고로 남긴다', () => {
  const quality = assessPriceDataQuality(buildSeries(60), { today: '2026-02-01' });
  assert.equal(quality.passed, true);
  assert.equal(quality.warnings.some(item => item.code === 'TODAY_DATA_MISSING'), true);
});
