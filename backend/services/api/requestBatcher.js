
const logger = require('../../utils/logger');

class RequestBatcher {
  constructor() {
    this.batches = new Map();
    this.batchTimeouts = new Map();
    this.defaultBatchSize = 10;
    this.defaultBatchDelay = 100; // 100ms to wait for more requests
  }

  async addToBatch(batchKey, requestFn, options = {}) {
    const batchSize = options.batchSize || this.defaultBatchSize;
    const batchDelay = options.batchDelay || this.defaultBatchDelay;

    if (!this.batches.has(batchKey)) {
      this.batches.set(batchKey, {
        requests: [],
        resolve: [],
        reject: [],
        options
      });
    }

    const batch = this.batches.get(batchKey);

    return new Promise((resolve, reject) => {
      batch.requests.push(requestFn);
      batch.resolve.push(resolve);
      batch.reject.push(reject);

      if (batch.requests.length >= batchSize) {
        this.executeBatch(batchKey);
      } else {
        this.scheduleBatchExecution(batchKey, batchDelay);
      }
    });
  }

  scheduleBatchExecution(batchKey, delay) {
    if (this.batchTimeouts.has(batchKey)) {
      clearTimeout(this.batchTimeouts.get(batchKey));
    }

    const timeout = setTimeout(() => {
      this.executeBatch(batchKey);
    }, delay);

    this.batchTimeouts.set(timeout);
  }

  async executeBatch(batchKey) {
    const batch = this.batches.get(batchKey);
    if (!batch || batch.requests.length === 0) {
      return;
    }

    if (this.batchTimeouts.has(batchKey)) {
      clearTimeout(this.batchTimeouts.get(batchKey));
      this.batchTimeouts.delete(batchKey);
    }

    const requests = [...batch.requests];
    const resolves = [...batch.resolve];
    const rejects = [...batch.reject];

    this.batches.delete(batchKey);

    logger.info(`[RequestBatcher] Executing batch ${batchKey} with ${requests.length} requests`);

    try {
      const results = await Promise.allSettled(
        requests.map(fn => fn())
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          resolves[index](result.value);
        } else {
          rejects[index](result.reason);
        }
      });
    } catch (error) {
      logger.error(`[RequestBatcher] Batch execution error:`, error);
      rejects.forEach(reject => reject(error));
    }
  }

  async batchMarketRequests(commodities, location) {
    const batchKey = `market_${location}_${Date.now()}`;
    
    const requests = commodities.map(commodity => 
      this.addToBatch(batchKey, async () => {
        const marketService = require('../marketPriceAPIService');
        return await marketService.getPrice(commodity, location);
      }, {
        batchSize: 5,
        batchDelay: 200
      })
    );

    return Promise.all(requests);
  }

  async batchWeatherRequests(locations) {
    const batchKey = `weather_${Date.now()}`;
    
    const requests = locations.map(({ lat, lng }) =>
      this.addToBatch(batchKey, async () => {
        const weatherService = require('../WeatherService');
        return await weatherService.getWeatherByCoords(lat, lng);
      }, {
        batchSize: 10,
        batchDelay: 150
      })
    );

    return Promise.all(requests);
  }

  getStats() {
    return {
      activeBatches: this.batches.size,
      scheduledTimeouts: this.batchTimeouts.size,
      batches: Array.from(this.batches.entries()).map(([key, batch]) => ({
        key,
        size: batch.requests.length,
        options: batch.options
      }))
    };
  }
}

module.exports = new RequestBatcher();







