const logger = require('../utils/logger');

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  logger.error('Error:', err);

  // Default error
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;


