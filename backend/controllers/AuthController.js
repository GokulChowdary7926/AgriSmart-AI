const crypto = require('crypto');
const User = require('../models/User');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

class AuthController {
  static async register(req, res) {
    try {
      const { email, password, name, phone, username, language, role } = req.body;
      
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
        return res.status(400).json({ 
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}` 
        });
      }

      const normalizedUsername = username.toLowerCase().trim();
      if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
        return res.status(400).json({ 
          success: false,
          error: 'Username can only contain lowercase letters, numbers, and underscores' 
        });
      }

      if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
        return res.status(400).json({ 
          success: false,
          error: 'Username must be between 3 and 30 characters' 
        });
      }

      const cleanedPhone = phone.replace(/[\s+\-]/g, '');

      const existingUser = await User.findOne({ 
        $or: [
          { email: email.toLowerCase() }, 
          { phone: cleanedPhone },
          { username: normalizedUsername }
        ] 
      });
      
      if (existingUser) {
        if (existingUser.email === email.toLowerCase()) {
          return res.status(400).json({ 
            success: false,
            error: 'An account with this email already exists' 
          });
        }
        if (existingUser.phone === cleanedPhone) {
          return res.status(400).json({ 
            success: false,
            error: 'An account with this phone number already exists' 
          });
        }
        if (existingUser.username === normalizedUsername) {
          return res.status(400).json({ 
            success: false,
            error: 'An account with this username already exists' 
          });
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
        role: role || 'farmer'
      });

      await user.save();

      const token = user.generateAuthToken();

      res.status(201).json({
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
        return res.status(400).json({ 
          success: false,
          error: errorMessage 
        });
      }
      
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        let fieldName = 'field';
        if (field === 'email') fieldName = 'email';
        else if (field === 'phone') fieldName = 'phone number';
        else if (field === 'username') fieldName = 'username';
        return res.status(400).json({ 
          success: false,
          error: `An account with this ${fieldName} already exists` 
        });
      }
      
      const errorMessage = error.message || 'Registration failed. Please check your information and try again.';
      res.status(500).json({ 
        success: false,
        error: errorMessage
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, phone, username, identifier, password } = req.body;

      const loginIdentifier = identifier || email || phone || username;

      logger.info('🔐 Login attempt:', {
        identifier: loginIdentifier ? 'provided' : 'N/A',
        timestamp: new Date().toISOString(),
        ip: req.ip
      });

      if (!loginIdentifier || !password) {
        logger.warn('❌ Missing identifier or password');
        return res.status(400).json({ 
          success: false,
          error: 'Email/Phone/Username and password required' 
        });
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
        const cleanedPhone = loginIdentifier.replace(/[\s+\-]/g, '');
        query = { phone: cleanedPhone };
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
        return res.status(401).json({ 
          success: false,
          error: 'Invalid credentials' 
        });
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
        return res.status(401).json({ 
          success: false,
          error: 'Invalid credentials' 
        });
      }

      logger.info('✅ Password verified successfully');

      user.lastLogin = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();

      const token = user.generateAuthToken();
      logger.info('🎫 Token generated successfully');

      logger.info('✅ Login successful for:', user.email);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          name: user.name,
          phone: user.phone,
          language: user.preferences?.language || 'en',
          role: user.role
        },
        farmer: user.role === 'farmer' ? {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone
        } : null
      });
    } catch (error) {
      logger.error('🔥 Login error:', error);
      logger.error('🔥 Error stack:', error.stack);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Internal server error',
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  static async logout(req, res) {
    res.json({ 
      success: true,
      message: 'Logout successful' 
    });
  }

  static async getCurrentUser(req, res) {
    try {
      const userId = req.user?._id || req.userId;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false,
          error: 'Not authenticated' 
        });
      }

      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      res.json({ 
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          name: user.name,
          phone: user.phone,
          language: user.preferences?.language || 'en',
          role: user.role
        },
        farmer: user.role === 'farmer' ? {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone
        } : null
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Internal server error' 
      });
    }
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.json({
          success: true,
          message: 'If user exists, password reset email will be sent'
        });
      }

      const resetToken = user.generatePasswordResetToken();
      await user.save({ validateBeforeSave: false });


      res.json({
        success: true,
        message: 'Password reset email sent'
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Internal server error' 
      });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ 
          success: false,
          error: 'Token and password required' 
        });
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
        return res.status(400).json({ 
          success: false,
          error: 'Invalid or expired token' 
        });
      }

      user.password = password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      res.json({
        success: true,
        message: 'Password reset successful'
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Internal server error' 
      });
    }
  }

  static async verifyPhone(req, res) {
    try {
      const { phone, code } = req.body;

      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      user.isVerified.phone = true;
      await user.save();

      res.json({
        success: true,
        message: 'Phone verified successfully'
      });
    } catch (error) {
      logger.error('Verify phone error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Internal server error' 
      });
    }
  }

  static async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      const user = await User.findOne({
        verificationToken: token,
        verificationExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid or expired token' 
        });
      }

      user.isVerified.email = true;
      user.verificationToken = undefined;
      user.verificationExpires = undefined;
      await user.save();

      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      logger.error('Verify email error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Internal server error' 
      });
    }
  }

  static async refreshToken(req, res) {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      const token = user.generateAuthToken();

      res.json({
        success: true,
        token
      });
    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Internal server error' 
      });
    }
  }
}

module.exports = AuthController;
