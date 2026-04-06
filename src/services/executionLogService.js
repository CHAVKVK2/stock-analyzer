import { mkdir, appendFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_LOG_FILE = join(__dirname, '..', '..', 'logs', 'execution.log');

function resolveLogFilePath() {
  return process.env.EXECUTION_LOG_PATH || DEFAULT_LOG_FILE;
}

export function createRequestId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `req_${timestamp}_${random}`;
}

export async function appendExecutionLog(entry) {
  const logFilePath = resolveLogFilePath();
  const record = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  await mkdir(dirname(logFilePath), { recursive: true });
  await appendFile(logFilePath, `${JSON.stringify(record)}\n`, 'utf8');
}

export function fireAndForgetExecutionLog(entry) {
  appendExecutionLog(entry).catch(error => {
    console.error('[EXECUTION_LOG_ERROR]', error.message);
  });
}

export function getExecutionLogPath() {
  return resolveLogFilePath();
}
