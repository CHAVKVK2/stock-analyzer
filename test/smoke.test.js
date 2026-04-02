import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../server.js';

const PORT = 3311;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let server;

async function getJson(pathname) {
  const response = await fetch(`${BASE_URL}${pathname}`);
  const body = await response.json();
  return { response, body };
}

test.before(async () => {
  server = startServer(PORT);
  await new Promise(resolve => server.once('listening', resolve));
});

test.after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()));
  });
});

test('검색이 삼성전자를 005930.KS로 해석한다', async () => {
  const { response, body } = await getJson('/api/search?q=%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90');

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.ok(Array.isArray(body.data.suggestions));
  assert.equal(body.data.suggestions[0]?.symbol, '005930.KS');
});

test('잘못된 티커 입력 시 안정적인 JSON 에러를 반환한다', async () => {
  const { response, body } = await getJson('/api/stock/technical?ticker=INVALID_TICKER_123456789&range=6mo&suffix=none');

  assert.equal(response.status, 404);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'NOT_FOUND');
  assert.equal(typeof body.error.message, 'string');
});

test('historical snapshot은 선택 날짜 이후 미래 데이터를 사용하지 않는다', async () => {
  const targetDate = '2025-01-22';
  const { response, body } = await getJson(`/api/stock/historical-snapshot?ticker=AAPL&snapshot_date=${targetDate}&range=2y&suffix=none`);

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.data.request.snapshotDate, targetDate);
  assert.ok(body.data.actualDate <= targetDate);
  assert.ok(body.data.snapshot.date <= targetDate);
});

test('backtest는 정상 범위에서 summary와 results를 반환한다', async () => {
  const { response, body } = await getJson('/api/stock/backtest?ticker=AAPL&start_date=2025-04-01&end_date=2025-04-14&range=2y&suffix=none');

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.ok(body.data.summary);
  assert.ok(Array.isArray(body.data.results));
  assert.ok(body.data.results.length > 0);
  assert.equal(typeof body.data.summary.tradeCount, 'number');
});
