const crypto = require('crypto');
const User = require('../models/User');
const logger = require('../utils/logger');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../utils/emailService');
const { badRequest, unauthorized, notFound, serverError, ok } = require('../utils/httpResponses');

class AuthController {
  static normalizeIndianPhone(phone) {
    if (!phone) return '';
    const cleaned = String(phone).replace(/[\s+\-]/g, '');
    if (/^91[6-9]\d{9}$/.test(cleaned)) return cleaned.slice(2);
    return cleaned;
  }

  static success(res, data, { source = 'AgriSmart AI', extra = {} } = {}) {
    return ok(res, data, {
      source,
      isFallback: false,
      ...extra
    });
  }

  static async register(req, res) {
    try {
      const body = req.body || {};
      const { email, password, name, phone, username, language } = body;
      
      logger.info('📝 Registration attempt:', {
        hasName: !!name,
        hasUsername: !!username,
        hasEmail: !!email,
        hasPhone: !!phone,
        hasPassword: !!password,
        username: username || 'N/A'
      });

      const missingFields = [];
      if (!name) missingFields.push('name');
      if (!username) missingFields.push('username');
      if (!email) missingFields.push('email');
      if (!phone) missingFields.push('phone');
      if (!password) missingFields.push('password');
      
      if (missingFields.length > 0) {
        logger.warn('❌ Missing required fields:', missingFields);
        return badRequest(res, `Missing required fields: ${missingFields.join(', ')}`);
      }

      const normalizedUsername = username.toLowerCase().trim();
      if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
        return badRequest(res, 'Username can only contain lowercase letters, numbers, and underscores');
      }

      if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
        return badRequest(res, 'Username must be between 3 and 30 characters');
      }

      const cleanedPhone = AuthController.normalizeIndianPhone(phone);
      if (!/^[6-9]\d{9}$/.test(cleanedPhone)) {
        return badRequest(res, 'Please provide a valid Indian phone number');
      }
      const phoneVariants = Array.from(new Set([cleanedPhone, `91${cleanedPhone}`]));

      const existingUser = await User.findOne({ 
        $or: [
          { email: { $regex: new RegExp(`^${email.toLowerCase()}$`, 'i') } },
          { phone: { $in: phoneVariants } },
          { username: normalizedUsername }
        ] 
      });
      
      if (existingUser) {
        if (existingUser.email === email.toLowerCase()) {
          return badRequest(res, 'An account with this email already exists');
        }
        if (existingUser.phone === cleanedPhone) {
          return badRequest(res, 'An account with this phone number already exists');
        }
        if (existingUser.username === normalizedUsername) {
          return badRequest(res, 'An account with this username already exists');
        }
      }

      const user = new User({
        email: email.toLowerCase(),
        password,
        name,
        username: normalizedUsername,
        phone: cleanedPhone,
        preferences: {
          language: language || 'en'
        },
        // Prevent self-escalation during public registration.
        role: 'farmer'
      });

      const verificationToken = crypto.randomBytes(32).toString('hex');
      user.verificationToken = verificationToken;
      user.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;

      await user.save();

      try {
        await sendVerificationEmail(user, verificationToken);
      } catch (emailError) {
        logger.error('Error sending verification email', {
          userId: user._id,
          email: user.email,
          error: emailError.message
        });
      }

      const token = user.generateAuthToken();

      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          name: user.name,
          phone: user.phone,
          language: user.preferences?.language || 'en',
          role: user.role
        }
      });
    } catch (error) {
      logger.error('Register error:', error);
      logger.error('Register error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        errors: error.errors
      });
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        const errorMessage = messages.length > 0 
          ? messages.join(', ') 
          : 'Validation failed. Please check your input.';
        return badRequest(res, errorMessage);
      }
      
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        let fieldName = 'field';
        if (field === 'email') fieldName = 'email';
        else if (field === 'phone') fieldName = 'phone number';
        else if (field === 'username') fieldName = 'username';
        return badRequest(res, `An account with this ${fieldName} already exists`);
      }
      
      const errorMessage = error.message || 'Registration failed. Please check your information and try again.';
      return serverError(res, errorMessage);
    }
  }

  static async login(req, res) {
    try {
      const body = req.body || {};
      const { email, phone, username, identifier, password } = body;

      const loginIdentifier = identifier || email || phone || username;

      logger.info('🔐 Login attempt:', {
        identifier: loginIdentifier ? 'provided' : 'N/A',
        timestamp: new Date().toISOString(),
        ip: req.ip
      });

      if (!loginIdentifier || !password) {
        logger.warn('❌ Missing identifier or password');
        return badRequest(res, 'Email/Phone/Username and password required');
      }

      let query = {};
      let identifierType = 'unknown';
      
      if (loginIdentifier.includes('@')) {
        const normalizedEmail = loginIdentifier.toLowerCase().trim();
        query = { email: normalizedEmail };
        identifierType = 'email';
        logger.info('📧 Searching for user by email:', normalizedEmail);
      }
      else if (/^[\d\s+\-]+$/.test(loginIdentifier) && loginIdentifier.replace(/[\s+\-]/g, '').length >= 10) {
        const cleanedPhone = AuthController.normalizeIndianPhone(loginIdentifier);
        query = { phone: { $in: [cleanedPhone, `91${cleanedPhone}`] } };
        identifierType = 'phone';
        logger.info('📱 Searching for user by phone:', cleanedPhone);
      }
      else {
        const normalizedUsername = loginIdentifier.toLowerCase().trim();
        query = { username: normalizedUsername };
        identifierType = 'username';
        logger.info('👤 Searching for user by username:', normalizedUsername);
      }
      
      const user = await User.findOne(query).select('+password');
      
      if (!user) {
        logger.warn('❌ User not found:', loginIdentifier);
        return unauthorized(res, 'Invalid credentials');
      }

      logger.info('👤 User found:', { 
        id: user._id, 
        email: user.email, 
        phone: user.phone,
        foundBy: identifierType 
      });
      logger.info('🔍 Verifying password...');

      const isValid = await user.comparePassword(password);
      
      if (!isValid) {
        logger.warn('❌ Password mismatch for user:', user.email);
        return unauthorized(res, 'Invalid credentials');
      }

      logger.info('✅ Password verified successfully');

      user.lastLogin = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();

      const token = user.generateAuthToken();
      logger.info('🎫 Token generated successfully');

      logger.info('✅ Login successful for:', user.email);

      const userPayload = {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        phone: user.phone,
        language: user.preferences?.language || 'en',
        role: user.role
      };
      const farmerPayload = user.role === 'farmer' ? {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      } : null;
      return AuthController.success(
        res,
        {
          message: 'Login successful',
          token,
          user: userPayload,
          farmer: farmerPayload
        },
        {
          extra: {
            message: 'Login successful',
            token,
            user: userPayload,
            farmer: farmerPayload
          }
        }
      );
    } catch (error) {
      logger.error('🔥 Login error:', error);
      logger.error('🔥 Error stack:', error.stack);
      return serverError(
        res,
        error.message || 'Internal server error',
        process.env.NODE_ENV === 'development' ? error.message : undefined
      );
    }
  }

  static async logout(req, res) {
    return AuthController.success(
      res,
      { message: 'Logout successful' },
      { extra: { message: 'Logout successful' } }
    );
  }

  static async getCurrentUser(req, res) {
    try {
      const userId = req.user?._id || req.userId;
      
      if (!userId) {
        return unauthorized(res, 'Not authenticated');
      }

      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        return notFound(res, 'User not found');
      }

      const userPayload = {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        phone: user.phone,
        language: user.preferences?.language || 'en',
        role: user.role
      };
      const farmerPayload = user.role === 'farmer' ? {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      } : null;
      return AuthController.success(
        res,
        { user: userPayload, farmer: farmerPayload },
        { extra: { user: userPayload, farmer: farmerPayload } }
      );
    } catch (error) {
      logger.error('Get current user error:', error);
      return serverError(res, error.message || 'Internal server error');
    }
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body || {};

      const user = await User.findOne({ email });
      if (!user) {
        return AuthController.success(
          res,
          { message: 'If user exists, password reset email will be sent' },
          { extra: { message: 'If user exists, password reset email will be sent' } }
        );
      }

      const resetToken = user.generatePasswordResetToken();
      await user.save({ validateBeforeSave: false });

      logger.info('Password reset token generated', {
        userId: user._id,
        email: user.email
      });

      try {
        await sendPasswordResetEmail(user, resetToken);
      } catch (emailError) {
        logger.error('Error sending password reset email', {
          userId: user._id,
          email: user.email,
          error: emailError.message
        });
      }

      return AuthController.success(
        res,
        { message: 'Password reset email sent' },
        { extra: { message: 'Password reset email sent' } }
      );
    } catch (error) {
      logger.error('Forgot password error:', error);
      return serverError(res, error.message || 'Internal server error');
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token, password } = req.body || {};

      if (!token || !password) {
        return badRequest(res, 'Token and password required');
      }

      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
      });

      if (!user) {
        return badRequest(res, 'Invalid or expired token');
      }

      user.password = password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      return AuthController.success(
        res,
        { message: 'Password reset successful' },
        { extra: { message: 'Password reset successful' } }
      );
    } catch (error) {
      logger.error('Reset password error:', error);
      return serverError(res, error.message || 'Internal server error');
    }
  }

  static async verifyPhone(req, res) {
    try {
      const { phone } = req.body || {};

      const user = await User.findOne({ phone });
      if (!user) {
        return notFound(res, 'User not found');
      }

      user.isVerified.phone = true;
      await user.save();

      return AuthController.success(
        res,
        { message: 'Phone verified successfully' },
        { extra: { message: 'Phone verified successfully' } }
      );
    } catch (error) {
      logger.error('Verify phone error:', error);
      return serverError(res, error.message || 'Internal server error');
    }
  }

  static async verifyEmail(req, res) {
    try {
      const { token } = req.body || {};

      const user = await User.findOne({
        verificationToken: token,
        verificationExpires: { $gt: Date.now() }
      });

      if (!user) {
        return badRequest(res, 'Invalid or expired token');
      }

      user.isVerified.email = true;
      user.verificationToken = undefined;
      user.verificationExpires = undefined;
      await user.save();

      return AuthController.success(
        res,
        { message: 'Email verified successfully' },
        { extra: { message: 'Email verified successfully' } }
      );
    } catch (error) {
      logger.error('Verify email error:', error);
      return serverError(res, error.message || 'Internal server error');
    }
  }

  static async refreshToken(req, res) {
    try {
      if (!process.env.JWT_SECRET) {
        return serverError(res, 'Authentication misconfigured');
      }

      const body = req.body || {};
      const headerToken = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
      const candidateToken = body.refreshToken || body.refresh_token || body.token || headerToken;

      if (!candidateToken) {
        return badRequest(res, 'Refresh token is required');
      }

      const authService = require('../services/AuthService');
      let session;
      try {
        session = await authService.refreshAccessToken(candidateToken);
      } catch (err) {
        const message = err && err.message ? err.message : 'Invalid refresh token';
        if (/reuse/i.test(message)) {
          return unauthorized(res, 'Refresh token reuse detected; please log in again');
        }
        if (/expired/i.test(message)) {
          return unauthorized(res, 'Refresh token expired');
        }
        return unauthorized(res, 'Invalid refresh token');
      }

      const userId = req.user?._id || req.userId;
      if (userId) {
        try {
          const user = await User.findById(userId);
          if (!user) {
            return notFound(res, 'User not found');
          }
        } catch (_e) {
          // user lookup is best-effort here; the refresh token itself is the source of truth
        }
      }

      return AuthController.success(
        res,
        {
          token: session.access_token,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          tokenType: 'Bearer',
          expiresIn: session.expires_in
        },
        {
          extra: {
            token: session.access_token,
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            tokenType: 'Bearer',
            expiresIn: session.expires_in
          }
        }
      );
    } catch (error) {
      logger.error('Refresh token error:', error);
      return serverError(res, error.message || 'Internal server error');
    }
  }

  static async getProfile(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || req.userId;
      if (!userId) {
        return unauthorized(res, 'Not authenticated');
      }

      const user = await User.findById(userId).select('-password');
      if (!user) {
        return notFound(res, 'User not found');
      }

      const userPayload = {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferences: user.preferences,
        farmerProfile: user.farmerProfile
      };
      return AuthController.success(res, { user: userPayload }, { extra: { user: userPayload } });
    } catch (error) {
      logger.error('Get profile error:', error);
      return serverError(res, error.message || 'Failed to fetch profile');
    }
  }

  static async updateProfile(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || req.userId;
      if (!userId) {
        return unauthorized(res, 'Not authenticated');
      }

      const { name, phone, location } = req.body || {};
      const updates = {};

      if (typeof name === 'string' && name.trim()) {
        updates.name = name.trim();
      }
      if (typeof phone === 'string' && phone.trim()) {
        updates.phone = phone.trim();
      }
      if (location && typeof location === 'object') {
        if (location.state !== undefined) updates['farmerProfile.location.state'] = location.state;
        if (location.district !== undefined) updates['farmerProfile.location.district'] = location.district;
        if (location.village !== undefined) updates['farmerProfile.location.village'] = location.village;
        if (location.pincode !== undefined) updates['farmerProfile.location.pincode'] = location.pincode;
      }

      if (Object.keys(updates).length === 0) {
        return badRequest(res, 'No valid profile fields provided');
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return notFound(res, 'User not found');
      }

      const userPayload = {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        farmerProfile: user.farmerProfile
      };
      return AuthController.success(
        res,
        { message: 'Profile updated successfully', user: userPayload },
        { extra: { message: 'Profile updated successfully', user: userPayload } }
      );
    } catch (error) {
      logger.error('Update profile error:', error);
      if (error.name === 'ValidationError') {
        return badRequest(res, error.message);
      }
      return serverError(res, error.message || 'Failed to update profile');
    }
  }

  static async updatePreferences(req, res) {
    try {
      const userId = req.user?._id || req.user?.userId || req.userId;
      if (!userId) {
        return unauthorized(res, 'Not authenticated');
      }

      const { notifications, language, voiceAssistant } = req.body || {};
      const updates = {};

      if (notifications && typeof notifications === 'object') {
        updates['preferences.notifications'] = notifications;
      }
      if (typeof language === 'string' && language) {
        updates['preferences.language'] = language;
      }
      if (voiceAssistant && typeof voiceAssistant === 'object') {
        updates['preferences.voiceAssistant'] = voiceAssistant;
      }

      if (Object.keys(updates).length === 0) {
        return badRequest(res, 'No valid preference fields provided');
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return notFound(res, 'User not found');
      }

      return AuthController.success(
        res,
        { message: 'Settings saved successfully', preferences: user.preferences },
        { extra: { message: 'Settings saved successfully', preferences: user.preferences } }
      );
    } catch (error) {
      logger.error('Update preferences error:', error);
      if (error.name === 'ValidationError') {
        return badRequest(res, error.message);
      }
      return serverError(res, error.message || 'Failed to update preferences');
    }
  }
}

module.exports = AuthController;
