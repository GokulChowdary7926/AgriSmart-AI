const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const AgriChatController = require('../controllers/AgriChatController');
const { authenticateToken } = require('../middleware/auth');

// Log route registration
logger.info('📝 Registering AgriChat routes...');

// Test endpoint (no auth required) to verify route is working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'AgriChat routes are working!',
    timestamp: new Date().toISOString()
  });
});

// All other routes require authentication
router.use(authenticateToken);

// Log successful registration
logger.info('✅ AgriChat routes registered: /test, /nearby, /search, /conversations, /conversation, /message');

// Get nearby sellers and dealers
router.get('/nearby', AgriChatController.getNearbyUsers);

// Search for users
router.get('/search', AgriChatController.searchUsers);

// Get user's conversations
router.get('/conversations', AgriChatController.getConversations);

// Get or create conversation
router.post('/conversation', AgriChatController.getOrCreateConversation);

// Get conversation messages
router.get('/conversation/:conversationId/messages', AgriChatController.getMessages);

// Send a message
router.post('/message', AgriChatController.sendMessage);

module.exports = router;

