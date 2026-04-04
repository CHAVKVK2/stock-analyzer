export function sendSuccess(res, data, meta = {}) {
  return res.json({
    ok: true,
    data,
    meta: {
      generatedAt: new Date().toISOString(),
      ...meta,
    },
  });
}

export function buildErrorResponse(status, code, message, details = null) {
  return {
    ok: false,
    error: {
      code,
      message,
      status,
      ...(details ? { details } : {}),
    },
  };
}

export function sendError(res, status, code, message, details = null) {
  return res.status(status).json(buildErrorResponse(status, code, message, details));
}
