
const redis = require('redis');
const logger = require('../utils/logger');

class SecurityMiddleware {
  constructor() {
    this.redisClient = null;
    
    this.redisErrorLogged = false;
    if (process.env.REDIS_URL) {
      try {
        this.redisClient = redis.createClient({ 
          url: process.env.REDIS_URL,
          socket: {
            connectTimeout: 2000,
            reconnectStrategy: false
          }
        });
        this.redisClient.on('error', (err) => {
          if (!this.redisErrorLogged) {
            logger.warn('⚠️ Redis not available, continuing without rate limiting cache');
            this.redisErrorLogged = true;
          }
          this.redisClient.quit().catch(() => {});
        });
        this.redisClient.on('connect', () => {
          logger.info('✅ Redis Connected (Security Middleware)');
          this.redisErrorLogged = false;
        });
        this.redisClient.connect().catch(() => {
          this.redisClient.quit().catch(() => {});
        });
      } catch (error) {
        logger.warn('⚠️ Redis not available, continuing without rate limiting cache');
        this.redisClient = null;
      }
    }
    
    this.rateLimits = {
      'auth/login': 5,
      'auth/otp': 3,
      'ml/detect': 10,
      'default': 100
    };
  }

  checkSQLInjection(req, res, next) {
    const sqlPatterns = [
      /(\bSELECT\b.*\bFROM\b)/i,
      /(\bINSERT\s+INTO\b)/i,
      /(\bDELETE\s+FROM\b)/i,
      /(\bUPDATE\b.*\bSET\b)/i,
      /(\bDROP\s+(TABLE|DATABASE)\b)/i,
      /(\bUNION\s+SELECT\b)/i,
      /(\bOR\s+['"]?\d+['"]?\s*=\s*['"]?\d+)/i,
      /(\bAND\s+['"]?\d+['"]?\s*=\s*['"]?\d+)/i,
      /(--\s)/,
      /(\/\*.*\*\/)/,
      /(;\s*(DROP|DELETE|INSERT|UPDATE|SELECT))/i
    ];
    
    for (const param of Object.values(req.query)) {
      if (typeof param === 'string') {
        for (const pattern of sqlPatterns) {
          if (pattern.test(param)) {
            logger.warn('⚠️ Potential SQL injection attempt in query params');
            return res.status(400).json({ 
              success: false,
              error: 'Invalid input detected' 
            });
          }
        }
      }
    }
    
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const path = req.path || req.url || '';
      if (path.includes('/auth/register') || path.includes('/auth/login') || path.includes('/api/auth/register') || path.includes('/api/auth/login')) {
        return next();
      }
      
      const bodyStr = JSON.stringify(req.body || {});
      for (const pattern of sqlPatterns) {
        if (pattern.test(bodyStr)) {
          logger.warn('⚠️ Potential SQL injection attempt in request body');
          return res.status(400).json({ 
            success: false,
            error: 'Invalid input detected' 
          });
        }
      }
    }
    
    next();
  }

  checkXSS(req, res, next) {
    const xssPatterns = [
      /<script.*?>.*?<\/script>/gi,
      /javascript:/gi,
      /onload=/gi,
      /onerror=/gi,
      /onclick=/gi,
      /eval\(/gi,
      /alert\(/gi
    ];
    
    for (const param of Object.values(req.query)) {
      if (typeof param === 'string') {
        for (const pattern of xssPatterns) {
          if (pattern.test(param)) {
            return res.status(400).json({ error: 'Invalid input' });
          }
        }
      }
    }
    
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const bodyStr = JSON.stringify(req.body || {});
      for (const pattern of xssPatterns) {
        if (pattern.test(bodyStr)) {
          return res.status(400).json({ error: 'Invalid input' });
        }
      }
    }
    
    next();
  }

  async ipRateLimit(req, res, next) {
    if (!this.redisClient) {
      return next();
    }
    
    try {
      const ip = req.ip || req.connection.remoteAddress;
      const endpoint = req.path;
      
      let limit = this.rateLimits['default'];
      for (const [key, value] of Object.entries(this.rateLimits)) {
        if (endpoint.includes(key)) {
          limit = value;
          break;
        }
      }
      
      const key = `ratelimit:${ip}:${endpoint}`;
      const current = await this.redisClient.incr(key);
      
      if (current === 1) {
        await this.redisClient.expire(key, 60); // 1 minute window
      }
      
      if (current > limit) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retry_after: 60
        });
      }
      
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current));
      
      next();
    } catch (error) {
      logger.error(`Rate limiting error: ${error.message}`);
      next();
    }
  }

  security() {
    return [
      this.checkSQLInjection.bind(this),
      this.checkXSS.bind(this),
      this.ipRateLimit.bind(this)
    ];
  }
}

module.exports = new SecurityMiddleware();













