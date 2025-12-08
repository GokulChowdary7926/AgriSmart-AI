const crypto = require('crypto');
const User = require('../models/User');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

class AuthController {
  static async register(req, res) {
    try {
      const { email, password, name, phone, language, role } = req.body;

      // Validate input
      if (!email || !password || !name || !phone) {
        return res.status(400).json({ 
          success: false,
          error: 'All fields are required: name, email, phone, and password' 
        });
      }

      // Clean phone number (remove +, spaces, dashes)
      const cleanedPhone = phone.replace(/[\s+\-]/g, '');

      // Check if user exists
      const existingUser = await User.findOne({ 
        $or: [
          { email: email.toLowerCase() }, 
          { phone: cleanedPhone }
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
      }

      // Create user
      const user = new User({
        email: email.toLowerCase(),
        password,
        name,
        phone: cleanedPhone,
        preferences: {
          language: language || 'en'
        },
        role: role || 'farmer'
      });

      await user.save();

      // Generate token
      const token = user.generateAuthToken();

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        token,
        user: {
          id: user._id,
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
      
      // Handle validation errors
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
      
      // Handle duplicate key error
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        const fieldName = field === 'email' ? 'email' : field === 'phone' ? 'phone number' : field;
        return res.status(400).json({ 
          success: false,
          error: `An account with this ${fieldName} already exists` 
        });
      }
      
      // Return more specific error message
      const errorMessage = error.message || 'Registration failed. Please check your information and try again.';
      res.status(500).json({ 
        success: false,
        error: errorMessage
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, phone, password } = req.body;

      logger.info('🔐 Login attempt:', {
        email: email || 'N/A',
        phone: phone || 'N/A',
        timestamp: new Date().toISOString(),
        ip: req.ip
      });

      if ((!email && !phone) || !password) {
        logger.warn('❌ Missing email/phone or password');
        return res.status(400).json({ 
          success: false,
          error: 'Email/phone and password required' 
        });
      }

      // Find user - normalize email to lowercase
      const normalizedEmail = email ? email.toLowerCase().trim() : null;
      logger.info('📧 Searching for user with email:', normalizedEmail || phone);
      
      const user = await User.findOne(
        normalizedEmail ? { email: normalizedEmail } : { phone }
      ).select('+password');
      
      if (!user) {
        logger.warn('❌ User not found:', normalizedEmail || phone);
        return res.status(401).json({ 
          success: false,
          error: 'Invalid credentials' 
        });
      }

      logger.info('👤 User found:', user.email);
      logger.info('🔍 Verifying password...');

      // Verify password
      const isValid = await user.comparePassword(password);
      
      if (!isValid) {
        logger.warn('❌ Password mismatch for user:', user.email);
        return res.status(401).json({ 
          success: false,
          error: 'Invalid credentials' 
        });
      }

      logger.info('✅ Password verified successfully');

      // Update last login
      user.lastLogin = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();

      // Generate token
      const token = user.generateAuthToken();
      logger.info('🎫 Token generated successfully');

      logger.info('✅ Login successful for:', user.email);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
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
    // In a stateless JWT system, logout is handled client-side
    // But you can implement token blacklisting here
    res.json({ 
      success: true,
      message: 'Logout successful' 
    });
  }

  static async getCurrentUser(req, res) {
    try {
      // User is attached by authenticateToken middleware
      // Check both req.user and req.userId
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
        // Don't reveal if user exists
        return res.json({
          success: true,
          message: 'If user exists, password reset email will be sent'
        });
      }

      const resetToken = user.generatePasswordResetToken();
      await user.save({ validateBeforeSave: false });

      // TODO: Send email with reset token
      // await sendPasswordResetEmail(user.email, resetToken);

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

      // TODO: Implement OTP verification
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      // For now, just mark as verified
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
      // Get user from token
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
