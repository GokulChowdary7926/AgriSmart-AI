const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { unauthorized, serverError, forbidden } = require('../utils/httpResponses');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return process.env.JWT_SECRET;
};

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return unauthorized(res, 'Access token is required');
    }

    const decoded = jwt.verify(token, getJwtSecret());

    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return unauthorized(res, 'User not found');
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return unauthorized(res, 'Invalid token');
    }
    
    if (error.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token expired');
    }

    return serverError(res, 'Authentication failed');
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return forbidden(res, 'Insufficient permissions');
    }

    next();
  };
};

const authenticate = authenticateToken;

module.exports = {
  authenticateToken,
  authenticate, // Alias
  authorize
};


