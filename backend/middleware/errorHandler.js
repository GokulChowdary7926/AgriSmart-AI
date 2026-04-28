const logger = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const requestId = req?.requestId;
  const code = err.code || (status === 404 ? 'NOT_FOUND' : status === 401 ? 'UNAUTHORIZED' : status === 400 ? 'BAD_REQUEST' : 'INTERNAL_ERROR');

  logger.error('Unhandled request error', {
    requestId,
    status,
    message,
    code,
    method: req?.method,
    path: req?.originalUrl || req?.url,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' && err.stack ? { stack: err.stack } : {})
    },
    requestId
  });
};

module.exports = errorHandler;



















