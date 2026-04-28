
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const redis = require('redis');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    if (!process.env.JWT_SECRET) {
      const message = 'JWT_SECRET is not configured. AuthService cannot issue or verify tokens.';
      if (process.env.NODE_ENV === 'production') {
        throw new Error(message);
      }
      logger.error(`[AuthService] ${message}`);
    }
    this.secretKey = process.env.JWT_SECRET || null;
    this.algorithm = 'HS256';
    this.accessTokenExpireMinutes = 60 * 24 * 7;
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
      this.redisClient.on('error', (_err) => {
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

  _assertSecret() {
    if (!this.secretKey) {
      throw new Error('JWT_SECRET is not configured');
    }
  }

  createAccessToken(data) {
    this._assertSecret();
    const toEncode = { ...data };
    const expire = new Date();
    expire.setMinutes(expire.getMinutes() + this.accessTokenExpireMinutes);
    
    toEncode.exp = Math.floor(expire.getTime() / 1000);
    toEncode.type = 'access';
    toEncode.jti = data.jti || crypto.randomUUID();

    return jwt.sign(toEncode, this.secretKey, { algorithm: this.algorithm });
  }

  createRefreshToken(data) {
    this._assertSecret();
    const toEncode = { ...data };
    const expire = new Date();
    expire.setDate(expire.getDate() + this.refreshTokenExpireDays);
    
    toEncode.exp = Math.floor(expire.getTime() / 1000);
    toEncode.type = 'refresh';
    toEncode.jti = data.jti || crypto.randomUUID();

    return jwt.sign(toEncode, this.secretKey, { algorithm: this.algorithm });
  }

  _refreshAllowlistKey(userId, jti) {
    return `refresh_allow:${userId}:${jti}`;
  }

  async _isRefreshAllowed(userId, jti) {
    if (!this.redisClient || !jti) {
      return null;
    }
    try {
      const value = await this.redisClient.get(this._refreshAllowlistKey(userId, jti));
      return value === '1';
    } catch (_err) {
      return null;
    }
  }

  async _allowRefresh(userId, jti, ttlSeconds) {
    if (!this.redisClient || !jti) return;
    try {
      await this.redisClient.setEx(
        this._refreshAllowlistKey(userId, jti),
        ttlSeconds || this.refreshTokenExpireDays * 24 * 3600,
        '1'
      );
    } catch (_err) {
      // best effort
    }
  }

  async _revokeRefresh(userId, jti) {
    if (!this.redisClient || !jti) return;
    try {
      await this.redisClient.del(this._refreshAllowlistKey(userId, jti));
    } catch (_err) {
      // best effort
    }
  }

  async _revokeAllUserRefresh(userId) {
    if (!this.redisClient) return;
    try {
      const keys = await this.redisClient.keys(`refresh_allow:${userId}:*`);
      for (const key of keys) {
        await this.redisClient.del(key);
      }
    } catch (_err) {
      // best effort
    }
  }

  verifyToken(token) {
    try {
      this._assertSecret();
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

  generateOTP(_length = 6) {
    return crypto.randomInt(100000, 999999).toString();
  }

  async storeOTP(phone, otp, purpose = 'login') {
    if (!this.redisClient) {
      logger.warn('Redis not available, OTP not stored');
      return;
    }
    
    const key = `otp:${purpose}:${phone}`;
    await this.redisClient.setEx(key, 600, otp);
  }

  async verifyOTP(phone, otp, purpose = 'login') {
    if (!this.redisClient) {
      logger.warn('Redis not available, OTP verification skipped');
      return true;
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
    const refreshJti = crypto.randomUUID();
    const accessJti = crypto.randomUUID();

    const baseTokenData = {
      sub: userId.toString(),
      uid: `user_${userId}`,
      role: 'farmer',
      device_id: deviceId
    };

    const accessToken = this.createAccessToken({ ...baseTokenData, jti: accessJti });
    const refreshToken = this.createRefreshToken({ ...baseTokenData, jti: refreshJti });

    await this._allowRefresh(userId.toString(), refreshJti);

    if (this.redisClient) {
      const refreshKey = deviceId 
        ? `refresh_token:${userId}:${deviceId}` 
        : `refresh_token:${userId}`;
      try {
        await this.redisClient.setEx(
          refreshKey, 
          30 * 24 * 3600, 
          refreshToken
        );
      } catch (_err) {
        // best effort; allowlist is the primary source of truth
      }
    }
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: this.accessTokenExpireMinutes * 60
    };
  }

  async refreshAccessToken(refreshToken) {
    let payload;
    try {
      payload = this.verifyToken(refreshToken);
    } catch (_err) {
      throw new Error('Invalid refresh token');
    }

    if (!payload || payload.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    const userId = payload.sub;
    const deviceId = payload.device_id;
    const oldJti = payload.jti;

    const allowed = await this._isRefreshAllowed(userId, oldJti);
    if (allowed === false) {
      logger.warn('[AuthService] Refresh token reuse detected, revoking all sessions', { userId });
      await this._revokeAllUserRefresh(userId);
      throw new Error('Refresh token reuse detected');
    }

    if (allowed === true) {
      await this._revokeRefresh(userId, oldJti);
    }

    const newRefreshJti = crypto.randomUUID();
    const newAccessJti = crypto.randomUUID();

    const baseTokenData = {
      sub: userId,
      uid: payload.uid,
      role: payload.role,
      device_id: deviceId
    };

    const newAccessToken = this.createAccessToken({ ...baseTokenData, jti: newAccessJti });
    const newRefreshToken = this.createRefreshToken({ ...baseTokenData, jti: newRefreshJti });

    await this._allowRefresh(userId, newRefreshJti);

    if (this.redisClient) {
      const refreshKey = deviceId
        ? `refresh_token:${userId}:${deviceId}`
        : `refresh_token:${userId}`;
      try {
        await this.redisClient.setEx(refreshKey, 30 * 24 * 3600, newRefreshToken);
      } catch (_err) {
        // best effort
      }
    }

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'bearer',
      expires_in: this.accessTokenExpireMinutes * 60
    };
  }

  async logout(userId, deviceId = null) {
    if (!this.redisClient) return;

    try {
      if (deviceId) {
        await this.redisClient.del(`refresh_token:${userId}:${deviceId}`);
      } else {
        const keys = await this.redisClient.keys(`refresh_token:${userId}:*`);
        for (const key of keys) {
          await this.redisClient.del(key);
        }
        await this.redisClient.del(`refresh_token:${userId}`);
      }
    } catch (_err) {
      // best effort
    }

    await this._revokeAllUserRefresh(userId);
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

















