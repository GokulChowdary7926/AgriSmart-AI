
const logger = require('../../utils/logger');
const fallbackManager = require('./fallbackManager');

class APIErrorHandler {
  handleError(error, serviceName, context = {}) {
    const errorInfo = this.parseError(error);
    
    logger.error(`[${serviceName}] API Error:`, {
      message: errorInfo.message,
      code: errorInfo.code,
      status: errorInfo.status,
      context
    });

    const useFallback = fallbackManager.shouldUseFallback(
      error, 
      context.retryCount || 0
    );

    if (useFallback) {
      const fallbackData = fallbackManager.getFallback(serviceName, context.params);
      
      return {
        success: false,
        error: errorInfo.message,
        fallback: true,
        data: fallbackData,
        original_error: process.env.NODE_ENV === 'development' ? errorInfo : undefined
      };
    }

    return {
      success: false,
      error: this.getUserFriendlyMessage(errorInfo),
      code: errorInfo.code,
      status: errorInfo.status,
      retryable: this.isRetryable(errorInfo)
    };
  }

  parseError(error) {
    if (error.response) {
      return {
        message: error.response.data?.error || error.response.data?.message || error.message,
        code: error.response.data?.code || `HTTP_${error.response.status}`,
        status: error.response.status,
        data: error.response.data
      };
    } else if (error.request) {
      return {
        message: 'No response from server',
        code: 'NO_RESPONSE',
        status: 0
      };
    } else {
      return {
        message: error.message || 'Unknown error',
        code: error.code || 'UNKNOWN_ERROR',
        status: 0
      };
    }
  }

  getUserFriendlyMessage(errorInfo) {
    const { code, status, message } = errorInfo;

    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
      return 'Unable to connect to service. Please check your internet connection.';
    }

    if (code === 'ETIMEDOUT') {
      return 'Request timed out. Please try again.';
    }

    if (status === 401) {
      return 'Authentication required. Please login again.';
    }

    if (status === 403) {
      return 'You do not have permission to access this resource.';
    }

    if (status === 404) {
      return 'The requested resource was not found.';
    }

    if (status === 429) {
      return 'Too many requests. Please wait a moment before trying again.';
    }

    if (status >= 500) {
      return 'Server error. Please try again later.';
    }

    if (status >= 400) {
      return message || 'Invalid request. Please check your input.';
    }

    return message || 'An unexpected error occurred. Please try again.';
  }

  isRetryable(errorInfo) {
    const { code, status } = errorInfo;

    if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'NO_RESPONSE'].includes(code)) {
      return true;
    }

    if (status >= 500) {
      return true;
    }

    if (status === 429) {
      return true;
    }

    return false;
  }

  getRetryDelay(retryCount, errorInfo) {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    
    if (errorInfo.status === 429) {
      const retryAfter = errorInfo.data?.retry_after || 5;
      return retryAfter * 1000;
    }

    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    return delay;
  }
}

module.exports = new APIErrorHandler();








