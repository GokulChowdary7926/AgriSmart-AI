
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const redis = require('redis');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    this.secretKey = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.algorithm = 'HS256';
    this.accessTokenExpireMinutes = 60 * 24 * 7; // 7 days
    this.refreshTokenExpireDays = 30;
    
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
            logger.warn('⚠️ Redis not available, continuing without OTP cache');
            this.redisErrorLogged = true;
          }
          this.redisClient.quit().catch(() => {});
        });
        this.redisClient.on('connect', () => {
          logger.info('✅ Redis Connected (Auth Service)');
          this.redisErrorLogged = false;
        });
        this.redisClient.connect().catch(() => {
          this.redisClient.quit().catch(() => {});
        });
      } catch (error) {
        logger.warn('⚠️ Redis not available, continuing without OTP cache');
        this.redisClient = null;
      }
    }
  }

  createAccessToken(data) {
    const toEncode = { ...data };
    const expire = new Date();
    expire.setMinutes(expire.getMinutes() + this.accessTokenExpireMinutes);
    
    toEncode.exp = Math.floor(expire.getTime() / 1000);
    toEncode.type = 'access';
    
    return jwt.sign(toEncode, this.secretKey, { algorithm: this.algorithm });
  }

  createRefreshToken(data) {
    const toEncode = { ...data };
    const expire = new Date();
    expire.setDate(expire.getDate() + this.refreshTokenExpireDays);
    
    toEncode.exp = Math.floor(expire.getTime() / 1000);
    toEncode.type = 'refresh';
    
    return jwt.sign(toEncode, this.secretKey, { algorithm: this.algorithm });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.secretKey, { algorithms: [this.algorithm] });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  generateOTP(length = 6) {
    return crypto.randomInt(100000, 999999).toString();
  }

  async storeOTP(phone, otp, purpose = 'login') {
    if (!this.redisClient) {
      logger.warn('Redis not available, OTP not stored');
      return;
    }
    
    const key = `otp:${purpose}:${phone}`;
    await this.redisClient.setEx(key, 600, otp); // 10 minutes
  }

  async verifyOTP(phone, otp, purpose = 'login') {
    if (!this.redisClient) {
      logger.warn('Redis not available, OTP verification skipped');
      return true; // In development, allow without Redis
    }
    
    const key = `otp:${purpose}:${phone}`;
    const storedOTP = await this.redisClient.get(key);
    
    if (storedOTP && storedOTP === otp) {
      await this.redisClient.del(key);
      return true;
    }
    return false;
  }

  async createSession(userId, deviceId = null) {
    const tokenData = {
      sub: userId.toString(),
      uid: `user_${userId}`,
      role: 'farmer',
      device_id: deviceId
    };
    
    const accessToken = this.createAccessToken(tokenData);
    const refreshToken = this.createRefreshToken(tokenData);
    
    if (this.redisClient) {
      const refreshKey = deviceId 
        ? `refresh_token:${userId}:${deviceId}` 
        : `refresh_token:${userId}`;
      await this.redisClient.setEx(
        refreshKey, 
        30 * 24 * 3600, 
        refreshToken
      ); // 30 days
    }
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: this.accessTokenExpireMinutes * 60
    };
  }

  async refreshAccessToken(refreshToken) {
    try {
      const payload = this.verifyToken(refreshToken);
      
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      const userId = payload.sub;
      const deviceId = payload.device_id;
      
      if (this.redisClient) {
        const refreshKey = deviceId 
          ? `refresh_token:${userId}:${deviceId}` 
          : `refresh_token:${userId}`;
        const storedRefresh = await this.redisClient.get(refreshKey);
        
        if (!storedRefresh || storedRefresh !== refreshToken) {
          throw new Error('Invalid refresh token');
        }
      }
      
      const newTokenData = {
        sub: userId,
        uid: payload.uid,
        role: payload.role,
        device_id: deviceId
      };
      
      const newAccessToken = this.createAccessToken(newTokenData);
      const newRefreshToken = this.createRefreshToken(newTokenData);
      
      if (this.redisClient) {
        const refreshKey = deviceId 
          ? `refresh_token:${userId}:${deviceId}` 
          : `refresh_token:${userId}`;
        await this.redisClient.setEx(refreshKey, 30 * 24 * 3600, newRefreshToken);
      }
      
      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        token_type: 'bearer'
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async logout(userId, deviceId = null) {
    if (!this.redisClient) return;
    
    if (deviceId) {
      await this.redisClient.del(`refresh_token:${userId}:${deviceId}`);
    } else {
      const keys = await this.redisClient.keys(`refresh_token:${userId}:*`);
      for (const key of keys) {
        await this.redisClient.del(key);
      }
      await this.redisClient.del(`refresh_token:${userId}`);
    }
  }

  getCurrentUser(token) {
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    const payload = this.verifyToken(token);
    
    return {
      id: parseInt(payload.sub),
      uid: payload.uid,
      role: payload.role,
      device_id: payload.device_id
    };
  }

  formatPhoneNumber(phone) {
    const digits = phone.replace(/\D/g, '');
    
    if (!phone.startsWith('+')) {
      if (digits.startsWith('91')) {
        return `+${digits}`;
      } else if (digits.length === 10) {
        return `+91${digits}`;
      } else {
        return `+${digits}`;
      }
    }
    
    return phone;
  }
}

module.exports = new AuthService();














