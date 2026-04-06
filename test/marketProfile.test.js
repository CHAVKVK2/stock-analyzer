import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMarketProfile } from '../src/services/marketProfile.js';
import { getScoreWeights } from '../src/services/scoreWeights.js';

test('KR 티커는 kr_standard 프로필로 분류된다', () => {
  const profile = resolveMarketProfile({ resolvedTicker: '005930.KS' });

  assert.equal(profile.key, 'kr_standard');
  assert.equal(profile.market, 'KR');
  assert.equal(profile.calibration.calibratedThrough, '2025-04-30');
});

test('M7 티커는 us_megacap_growth 프로필로 분류된다', () => {
  const profile = resolveMarketProfile({ resolvedTicker: 'AAPL' });

  assert.equal(profile.key, 'us_megacap_growth');
  assert.equal(profile.market, 'US');
});

test('KR 표준 프로필은 돌파보다 리스크와 저항 경계를 더 보수적으로 반영한다', () => {
  const krWeights = getScoreWeights('balanced', 'kr_standard');
  const usWeights = getScoreWeights('balanced', 'us_broad_large_cap');

  assert.ok(krWeights.location.nearResistancePenalty < usWeights.location.nearResistancePenalty);
  assert.ok(krWeights.risk.highAtrPenalty < usWeights.risk.highAtrPenalty);
  assert.ok(krWeights.location.supportBounce > usWeights.location.supportBounce);
});
