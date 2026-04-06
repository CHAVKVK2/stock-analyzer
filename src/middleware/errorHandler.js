import { fireAndForgetExecutionLog } from '../services/executionLogService.js';
import { sendError } from '../utils/apiResponse.js';

export default function errorHandler(err, req, res, next) {
  const message = err?.message || '';
  const requestPath = req.originalUrl?.split('?')[0] || req.path;
  const status = err?.status;
  const code = err?.code;

  res.locals.executionSummary = {
    ...(res.locals.executionSummary || {}),
    error: message,
  };

  if (status && code && message) {
    fireAndForgetExecutionLog({
      event: 'request_error',
      requestId: req.requestId,
      method: req.method,
      path: requestPath,
      statusCode: status,
      error: message,
      code,
    });
    return sendError(res, status, code, message, err?.details || null);
  }

  if (
    message.includes('No fundamentals data') ||
    message.includes('Not Found') ||
    message.includes('No data found') ||
    message.includes('HTTPError') ||
    message.includes('404')
  ) {
    fireAndForgetExecutionLog({
      event: 'request_error',
      requestId: req.requestId,
      method: req.method,
      path: requestPath,
      statusCode: 404,
      error: message,
      code: 'NOT_FOUND',
    });
    return sendError(res, 404, 'NOT_FOUND', '종목 또는 데이터를 찾을 수 없습니다. 입력값을 확인해주세요.');
  }

  if (err.code === 'PRICE_DATA_QUALITY_FAILED') {
    fireAndForgetExecutionLog({
      event: 'request_error',
      requestId: req.requestId,
      method: req.method,
      path: requestPath,
      statusCode: 422,
      error: message,
      code: 'PRICE_DATA_QUALITY_FAILED',
      dataQuality: err.dataQuality,
    });
    return sendError(
      res,
      422,
      'PRICE_DATA_QUALITY_FAILED',
      '가격 데이터 품질 검증에 실패했습니다.',
      err.dataQuality
    );
  }

  if (message.includes('Too Many Requests') || message.includes('429')) {
    fireAndForgetExecutionLog({
      event: 'request_error',
      requestId: req.requestId,
      method: req.method,
      path: requestPath,
      statusCode: 429,
      error: message,
      code: 'RATE_LIMITED',
    });
    return sendError(res, 429, 'RATE_LIMITED', '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
  }

  console.error('[ERROR]', message);
  fireAndForgetExecutionLog({
    event: 'request_error',
    requestId: req.requestId,
    method: req.method,
    path: requestPath,
    statusCode: 500,
    error: message,
    code: 'INTERNAL_ERROR',
  });
  return sendError(res, 500, 'INTERNAL_ERROR', '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
}
