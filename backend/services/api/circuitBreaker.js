
const logger = require('../../utils/logger');

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;

    this.threshold = options.threshold || 5; // Open after 5 failures
    this.timeout = options.timeout || 60000; // 1 minute before trying again
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds for half-open state
    this.successThreshold = options.successThreshold || 2; // Need 2 successes to close

    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      stateChanges: []
    };
  }

  async execute(fn, fallback = null) {
    this.stats.totalRequests++;

    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        logger.warn(`[CircuitBreaker:${this.name}] Circuit OPEN, using fallback`);
        this.recordStateChange('OPEN', 'FALLBACK');
        return fallback ? await this.handleFallback(fallback) : this.getFallbackResponse();
      } else {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.info(`[CircuitBreaker:${this.name}] Moving to HALF_OPEN state`);
        this.recordStateChange('HALF_OPEN', 'TIMEOUT_EXPIRED');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.stats.totalSuccesses++;
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        logger.info(`[CircuitBreaker:${this.name}] Circuit CLOSED - service recovered`);
        this.recordStateChange('CLOSED', 'SUCCESS_THRESHOLD');
      }
    }
  }

  onFailure() {
    this.stats.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.timeout;
      logger.error(`[CircuitBreaker:${this.name}] Circuit OPENED - service still failing`);
      this.recordStateChange('OPEN', 'FAILURE_IN_HALF_OPEN');
    } else if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.timeout;
      logger.error(`[CircuitBreaker:${this.name}] Circuit OPENED - ${this.failureCount} failures`);
      this.recordStateChange('OPEN', 'THRESHOLD_EXCEEDED');
    }
  }

  async handleFallback(fallback) {
    try {
      if (typeof fallback === 'function') {
        return await fallback();
      }
      return fallback;
    } catch (error) {
      logger.error(`[CircuitBreaker:${this.name}] Fallback also failed:`, error);
      return this.getFallbackResponse();
    }
  }

  getFallbackResponse() {
    return {
      success: false,
      error: `Service ${this.name} is temporarily unavailable`,
      fallback: true,
      circuit_breaker: 'OPEN'
    };
  }

  recordStateChange(newState, reason) {
    this.stats.stateChanges.push({
      timestamp: new Date().toISOString(),
      from: this.state,
      to: newState,
      reason
    });

    if (this.stats.stateChanges.length > 20) {
      this.stats.stateChanges.shift();
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      stats: {
        ...this.stats,
        successRate: this.stats.totalRequests > 0
          ? ((this.stats.totalSuccesses / this.stats.totalRequests) * 100).toFixed(2) + '%'
          : '0%'
      }
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    logger.info(`[CircuitBreaker:${this.name}] Manually reset`);
  }

  forceOpen() {
    this.state = 'OPEN';
    this.nextAttemptTime = Date.now() + this.timeout;
    logger.warn(`[CircuitBreaker:${this.name}] Force opened`);
  }
}

class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }

  getBreaker(name, options = {}) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name);
  }

  getAllStatuses() {
    const statuses = {};
    this.breakers.forEach((breaker, name) => {
      statuses[name] = breaker.getStatus();
    });
    return statuses;
  }

  resetAll() {
    this.breakers.forEach(breaker => breaker.reset());
  }
}

module.exports = {
  CircuitBreaker,
  CircuitBreakerManager: new CircuitBreakerManager()
};








