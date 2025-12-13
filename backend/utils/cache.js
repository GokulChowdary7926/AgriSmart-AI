const logger = require('./logger');

class Cache {
  constructor(redisClient) {
    this.client = redisClient;
    this.enabled = !!redisClient;
  }

  async get(key) {
    if (!this.enabled) return null;
    try {
      const value = await this.client.get(key);
      return value;
    } catch (error) {
      logger.warn('Cache get error:', error.message);
      return null;
    }
  }

  async set(key, value, expiry = 3600) {
    if (!this.enabled) return false;
    try {
      await this.client.setEx(key, expiry, value);
      return true;
    } catch (error) {
      logger.warn('Cache set error:', error.message);
      return false;
    }
  }

  async setex(key, expiry, value) {
    return this.set(key, value, expiry);
  }

  async del(key) {
    if (!this.enabled) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.warn('Cache del error:', error.message);
      return false;
    }
  }

  async delPattern(pattern) {
    if (!this.enabled) return false;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      logger.warn('Cache delPattern error:', error.message);
      return false;
    }
  }
}

let cacheInstance = null;

module.exports = {
  init: (redisClient) => {
    cacheInstance = new Cache(redisClient);
    return cacheInstance;
  },
  getInstance: () => {
    if (!cacheInstance) {
      cacheInstance = new Cache(null);
    }
    return cacheInstance;
  }
};

