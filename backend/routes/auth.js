const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const logger = require('../utils/logger');

router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    const requestBody = req.body || {};
    logger.info('📱 Auth Route:', {
      method: req.method,
      path: req.path,
      body: req.method === 'POST' ? { ...requestBody, password: requestBody.password ? '***' : undefined } : undefined
    });
  }
  next();
});

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
const { authenticateToken } = require('../middleware/auth');
router.post('/refresh', AuthController.refreshToken);
router.get('/me', authenticateToken, AuthController.getCurrentUser);
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/profile', authenticateToken, AuthController.updateProfile);
router.put('/preferences', authenticateToken, AuthController.updatePreferences);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/verify-phone', AuthController.verifyPhone);
router.post('/verify-email', AuthController.verifyEmail);

module.exports = router;
