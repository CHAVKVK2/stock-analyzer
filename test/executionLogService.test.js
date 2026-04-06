import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

test('execution log service writes JSON lines to the configured file', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'stock-analyzer-log-'));
  const logPath = join(tempDir, 'execution.log');

  process.env.EXECUTION_LOG_PATH = logPath;

  const { appendExecutionLog, getExecutionLogPath } = await import('../src/services/executionLogService.js');

  await appendExecutionLog({
    event: 'request_finished',
    requestId: 'req_test',
    route: 'technical',
    ticker: 'AAPL',
  });

  const content = await readFile(logPath, 'utf8');
  const lines = content.trim().split('\n');
  const parsed = JSON.parse(lines.at(-1));

  assert.equal(getExecutionLogPath(), logPath);
  assert.equal(parsed.event, 'request_finished');
  assert.equal(parsed.requestId, 'req_test');
  assert.equal(parsed.route, 'technical');
  assert.equal(parsed.ticker, 'AAPL');

  delete process.env.EXECUTION_LOG_PATH;
});
