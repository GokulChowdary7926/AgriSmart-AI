
const logger = require('../../utils/logger');

class ApiMonitor {
  constructor() {
    this.metrics = {
      requests: {},
      errors: {},
      responseTimes: {},
      cacheHits: {},
      fallbacks: {}
    };
    this.startTime = Date.now();
  }

  recordRequest(apiName, success, responseTime, usedFallback = false) {
    if (!this.metrics.requests[apiName]) {
      this.metrics.requests[apiName] = { total: 0, success: 0, failed: 0 };
    }
    
    this.metrics.requests[apiName].total++;
    if (success) {
      this.metrics.requests[apiName].success++;
    } else {
      this.metrics.requests[apiName].failed++;
    }

    if (!this.metrics.responseTimes[apiName]) {
      this.metrics.responseTimes[apiName] = [];
    }
    this.metrics.responseTimes[apiName].push(responseTime);
    
    if (this.metrics.responseTimes[apiName].length > 100) {
      this.metrics.responseTimes[apiName].shift();
    }

    if (usedFallback) {
      if (!this.metrics.fallbacks[apiName]) {
        this.metrics.fallbacks[apiName] = 0;
      }
      this.metrics.fallbacks[apiName]++;
    }
  }

  recordError(apiName, error) {
    if (!this.metrics.errors[apiName]) {
      this.metrics.errors[apiName] = [];
    }
    
    this.metrics.errors[apiName].push({
      timestamp: new Date().toISOString(),
      message: error.message || 'Unknown error',
      code: error.code || 'UNKNOWN',
      status: error.status || 0
    });
    
    if (this.metrics.errors[apiName].length > 50) {
      this.metrics.errors[apiName].shift();
    }
  }

  recordCacheHit(apiName, hit) {
    if (!this.metrics.cacheHits[apiName]) {
      this.metrics.cacheHits[apiName] = { hits: 0, misses: 0 };
    }
    
    if (hit) {
      this.metrics.cacheHits[apiName].hits++;
    } else {
      this.metrics.cacheHits[apiName].misses++;
    }
  }

  getMetrics() {
    const uptime = Date.now() - this.startTime;
    
    return {
      uptime: this.formatUptime(uptime),
      apis: Object.keys(this.metrics.requests).map(apiName => ({
        name: apiName,
        ...this.metrics.requests[apiName],
        success_rate: this.calculateSuccessRate(apiName),
        avg_response_time: this.calculateAvgResponseTime(apiName),
        cache_hit_rate: this.calculateCacheHitRate(apiName),
        fallback_usage: this.metrics.fallbacks[apiName] || 0,
        recent_errors: this.metrics.errors[apiName]?.slice(-5) || []
      })),
      summary: {
        total_requests: this.getTotalRequests(),
        overall_success_rate: this.getOverallSuccessRate(),
        most_reliable_api: this.getMostReliableApi(),
        least_reliable_api: this.getLeastReliableApi(),
        total_fallbacks: this.getTotalFallbacks()
      }
    };
  }

  calculateSuccessRate(apiName) {
    const stats = this.metrics.requests[apiName];
    if (!stats || stats.total === 0) return 0;
    return ((stats.success / stats.total) * 100).toFixed(2);
  }

  calculateAvgResponseTime(apiName) {
    const times = this.metrics.responseTimes[apiName];
    if (!times || times.length === 0) return 0;
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return Math.round(avg);
  }

  calculateCacheHitRate(apiName) {
    const cache = this.metrics.cacheHits[apiName];
    if (!cache || (cache.hits + cache.misses) === 0) return 0;
    return ((cache.hits / (cache.hits + cache.misses)) * 100).toFixed(2);
  }

  getTotalRequests() {
    return Object.values(this.metrics.requests)
      .reduce((total, stats) => total + stats.total, 0);
  }

  getOverallSuccessRate() {
    const totals = Object.values(this.metrics.requests);
    if (totals.length === 0) return 100;
    
    const totalSuccess = totals.reduce((sum, stats) => sum + stats.success, 0);
    const totalRequests = totals.reduce((sum, stats) => sum + stats.total, 0);
    
    return totalRequests > 0 ? ((totalSuccess / totalRequests) * 100).toFixed(2) : 100;
  }

  getMostReliableApi() {
    const apis = Object.keys(this.metrics.requests);
    if (apis.length === 0) return null;
    
    return apis.reduce((best, current) => {
      const bestRate = parseFloat(this.calculateSuccessRate(best));
      const currentRate = parseFloat(this.calculateSuccessRate(current));
      return currentRate > bestRate ? current : best;
    });
  }

  getLeastReliableApi() {
    const apis = Object.keys(this.metrics.requests);
    if (apis.length === 0) return null;
    
    return apis.reduce((worst, current) => {
      const worstRate = parseFloat(this.calculateSuccessRate(worst));
      const currentRate = parseFloat(this.calculateSuccessRate(current));
      return currentRate < worstRate ? current : worst;
    });
  }

  getTotalFallbacks() {
    return Object.values(this.metrics.fallbacks)
      .reduce((total, count) => total + count, 0);
  }

  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }

  reset() {
    this.metrics = {
      requests: {},
      errors: {},
      responseTimes: {},
      cacheHits: {},
      fallbacks: {}
    };
    this.startTime = Date.now();
    logger.info('API Monitor metrics reset');
  }
}

module.exports = new ApiMonitor();







