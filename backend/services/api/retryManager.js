
const logger = require('../../utils/logger');
const apiErrorHandler = require('./apiErrorHandler');

class RetryManager {
  constructor() {
    this.defaultConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
      factor: 2, // Exponential factor
      retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'NO_RESPONSE']
    };
  }

  async executeWithRetry(fn, config = {}) {
    const retryConfig = { ...this.defaultConfig, ...config };
    let lastError = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const result = await fn();
        return {
          success: true,
          data: result,
          attempts: attempt + 1
        };
      } catch (error) {
        lastError = error;
        const errorInfo = apiErrorHandler.parseError(error);

        if (!this.isRetryable(errorInfo, retryConfig)) {
          logger.warn(`[RetryManager] Error not retryable: ${errorInfo.code}`);
          throw error;
        }

        if (attempt >= retryConfig.maxRetries) {
          logger.error(`[RetryManager] Max retries (${retryConfig.maxRetries}) exceeded`);
          break;
        }

        const delay = this.calculateDelay(attempt, errorInfo, retryConfig);
        
        logger.info(`[RetryManager] Retry attempt ${attempt + 1}/${retryConfig.maxRetries} after ${delay}ms`);
        
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: retryConfig.maxRetries + 1
    };
  }

  isRetryable(errorInfo, config) {
    if (config.retryableErrors.includes(errorInfo.code)) {
      return true;
    }

    if (errorInfo.status >= 500) {
      return true;
    }

    if (errorInfo.status === 429) {
      return true;
    }

    if (errorInfo.status >= 400 && errorInfo.status < 500) {
      return false;
    }

    return false;
  }

  calculateDelay(attempt, errorInfo, config) {
    if (errorInfo.status === 429 && errorInfo.data?.retry_after) {
      return errorInfo.data.retry_after * 1000;
    }

    const exponentialDelay = config.baseDelay * Math.pow(config.factor, attempt);
    
    const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
    
    const totalDelay = exponentialDelay + jitter;
    
    return Math.min(totalDelay, config.maxDelay);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async batchWithRetry(requests, config = {}) {
    const batchConfig = {
      ...this.defaultConfig,
      ...config,
      concurrency: config.concurrency || 5 // Process 5 requests at a time
    };

    const results = [];
    const batches = this.chunkArray(requests, batchConfig.concurrency);

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(req => this.executeWithRetry(req.fn, { ...batchConfig, ...req.config }))
      );

      results.push(...batchResults.map((result, index) => ({
        request: batch[index],
        result: result.status === 'fulfilled' ? result.value : { success: false, error: result.reason }
      })));
    }

    return results;
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

module.exports = new RetryManager();







