const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const AgriChatController = require('../controllers/AgriChatController');
const { authenticateToken } = require('../middleware/auth');

logger.info('📝 Registering AgriChat routes...');

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'AgriChat routes are working!',
    timestamp: new Date().toISOString()
  });
});

router.use(authenticateToken);

logger.info('✅ AgriChat routes registered: /test, /nearby, /search, /conversations, /conversation, /message');

router.get('/nearby', AgriChatController.getNearbyUsers);

router.get('/search', AgriChatController.searchUsers);

router.get('/conversations', AgriChatController.getConversations);

router.post('/conversation', AgriChatController.getOrCreateConversation);

router.get('/conversation/:conversationId/messages', AgriChatController.getMessages);

router.post('/message', AgriChatController.sendMessage);

module.exports = router;

