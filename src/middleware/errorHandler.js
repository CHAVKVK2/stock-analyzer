import { fireAndForgetExecutionLog } from '../services/executionLogService.js';

export default function errorHandler(err, req, res, next) {
  const msg = err.message || '';
  const requestPath = req.originalUrl?.split('?')[0] || req.path;

  res.locals.executionSummary = {
    ...(res.locals.executionSummary || {}),
    error: msg,
  };

  if (
    msg.includes('No fundamentals data') ||
    msg.includes('Not Found') ||
    msg.includes('No data found') ||
    msg.includes('HTTPError') ||
    msg.includes('404')
  ) {
    fireAndForgetExecutionLog({
      event: 'request_error',
      requestId: req.requestId,
      method: req.method,
      path: requestPath,
      statusCode: 404,
      error: msg,
    });
    return res.status(404).json({ error: '종목을 찾을 수 없습니다. 종목 코드를 확인해주세요.' });
  }

  if (err.code === 'PRICE_DATA_QUALITY_FAILED') {
    fireAndForgetExecutionLog({
      event: 'request_error',
      requestId: req.requestId,
      method: req.method,
      path: requestPath,
      statusCode: 422,
      error: msg,
      dataQuality: err.dataQuality,
    });
    return res.status(422).json({
      error: '가격 데이터 품질 검증에 실패했습니다.',
      dataQuality: err.dataQuality,
    });
  }

  if (msg.includes('Too Many Requests') || msg.includes('429')) {
    fireAndForgetExecutionLog({
      event: 'request_error',
      requestId: req.requestId,
      method: req.method,
      path: requestPath,
      statusCode: 429,
      error: msg,
    });
    return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
  }

  console.error('[ERROR]', msg);
  fireAndForgetExecutionLog({
    event: 'request_error',
    requestId: req.requestId,
    method: req.method,
    path: requestPath,
    statusCode: 500,
    error: msg,
  });
  res.status(500).json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
}
