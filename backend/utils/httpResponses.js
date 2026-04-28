function errorPayload(code, message, details, requestId) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    },
    ...(requestId ? { requestId } : {})
  };
}

function _ridFromRes(res) {
  try {
    return res.req?.requestId || res.getHeader?.('x-request-id') || undefined;
  } catch (_) {
    return undefined;
  }
}

function badRequest(res, message, details) {
  return res.status(400).json(errorPayload('BAD_REQUEST', message, details, _ridFromRes(res)));
}

function unauthorized(res, message = 'Authentication required', details) {
  return res.status(401).json(errorPayload('UNAUTHORIZED', message, details, _ridFromRes(res)));
}

function forbidden(res, message = 'Forbidden', details) {
  return res.status(403).json(errorPayload('FORBIDDEN', message, details, _ridFromRes(res)));
}

function notFound(res, message, details) {
  return res.status(404).json(errorPayload('NOT_FOUND', message, details, _ridFromRes(res)));
}

function tooManyRequests(res, message = 'Rate limit exceeded', details) {
  return res.status(429).json(errorPayload('RATE_LIMIT', message, details, _ridFromRes(res)));
}

function serverError(res, message = 'Internal server error', details) {
  return res.status(500).json(errorPayload('INTERNAL_ERROR', message, details, _ridFromRes(res)));
}

function serviceUnavailable(res, message = 'Service unavailable', details) {
  return res.status(503).json(errorPayload('SERVICE_UNAVAILABLE', message, details, _ridFromRes(res)));
}

function ok(res, data = {}, meta = {}) {
  const requestId = _ridFromRes(res);
  return res.status(200).json({
    success: true,
    data,
    ...(requestId ? { requestId } : {}),
    ...meta
  });
}

module.exports = {
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  tooManyRequests,
  serverError,
  serviceUnavailable,
  ok,
  errorPayload
};
