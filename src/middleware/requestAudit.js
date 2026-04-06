import { createRequestId, fireAndForgetExecutionLog } from '../services/executionLogService.js';

export default function requestAudit(req, res, next) {
  const startedAt = Date.now();
  req.requestId = createRequestId();
  const requestPath = req.originalUrl.split('?')[0];

  fireAndForgetExecutionLog({
    event: 'request_started',
    requestId: req.requestId,
    method: req.method,
    path: requestPath,
    query: req.query,
  });

  res.on('finish', () => {
    fireAndForgetExecutionLog({
      event: 'request_finished',
      requestId: req.requestId,
      method: req.method,
      path: requestPath,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      ...res.locals.executionSummary,
    });
  });

  next();
}
