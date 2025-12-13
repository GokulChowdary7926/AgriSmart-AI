let logger;

try {
  const LoggerService = require('../services/LoggerService');
  logger = LoggerService.logger;
} catch (error) {
  logger = {
    info: (message, ...args) => {
      console.log(`[INFO] ${message}`, ...args);
    },
    error: (message, ...args) => {
      console.error(`[ERROR] ${message}`, ...args);
    },
    warn: (message, ...args) => {
      console.warn(`[WARN] ${message}`, ...args);
    },
    debug: (message, ...args) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] ${message}`, ...args);
      }
    },
    apiCall: (service, endpoint, status, duration, meta = {}) => {
      console.log(`[API] ${service} ${endpoint} - ${status} (${duration}ms)`, meta);
    },
    mlPrediction: (model, input, output, duration, confidence, meta = {}) => {
      console.log(`[ML] ${model} - Confidence: ${confidence} (${duration}ms)`, meta);
    }
  };
}

module.exports = logger;









