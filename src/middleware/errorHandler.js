import { sendError } from '../utils/apiResponse.js';

export default function errorHandler(err, req, res, next) {
  const message = err?.message || '';
  const status = err?.status;
  const code = err?.code;

  if (status && code && message) {
    return sendError(res, status, code, message);
  }

  if (
    message.includes('No fundamentals data') ||
    message.includes('Not Found') ||
    message.includes('No data found') ||
    message.includes('HTTPError') ||
    message.includes('404')
  ) {
    return sendError(res, 404, 'NOT_FOUND', '종목 또는 데이터를 찾을 수 없습니다. 입력값을 확인해주세요.');
  }

  if (message.includes('Too Many Requests') || message.includes('429')) {
    return sendError(res, 429, 'RATE_LIMITED', '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
  }

  console.error('[ERROR]', message);
  return sendError(res, 500, 'INTERNAL_ERROR', '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
}
