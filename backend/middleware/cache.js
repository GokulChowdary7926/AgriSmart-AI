const NodeCache = require('node-cache');
const logger = require('../utils/logger');

const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes default
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false // Better performance
});

let cacheStats = {
  hits: 0,
  misses: 0,
  keys: 0
};

const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    if (req.path.includes('/me') || req.path.includes('/sessions') || req.path.includes('/analytics')) {
      return next();
    }

    const key = req.originalUrl || req.url;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      cacheStats.hits++;
      logger.debug(`Cache hit for ${key}`);
      
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-Key', key);
      return res.json(cachedResponse);
    }

    const originalJson = res.json;
    res.json = function(body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, duration);
        cacheStats.misses++;
        cacheStats.keys = cache.keys().length;
        
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', key);
        res.set('X-Cache-TTL', duration);
        
        logger.debug(`Cache miss for ${key}, cached for ${duration}s`);
      }
      
      originalJson.call(this, body);
    };

    next();
  };
};

const clearCache = (pattern) => {
  if (pattern) {
    const keys = cache.keys();
    const regex = new RegExp(pattern);
    const matchingKeys = keys.filter(key => regex.test(key));
    
    matchingKeys.forEach(key => cache.del(key));
    logger.info(`Cleared ${matchingKeys.length} cache entries matching ${pattern}`);
    return matchingKeys.length;
  } else {
    cache.flushAll();
    logger.info('All cache cleared');
    return cache.keys().length;
  }
};

const getCacheStats = () => {
  return {
    ...cacheStats,
    keys: cache.keys().length,
    size: cache.getStats().keys,
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    hitRate: cacheStats.hits + cacheStats.misses > 0 
      ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2) + '%'
      : '0%'
  };
};

module.exports = {
  cache,
  cacheMiddleware,
  clearCache,
  getCacheStats
};







