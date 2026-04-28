const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const AgriChatController = require('../controllers/AgriChatController');
const { authenticateToken } = require('../middleware/auth');
const { ok } = require('../utils/httpResponses');

logger.info('📝 Registering AgriChat routes...');

router.get('/test', (req, res) => {
  return ok(
    res,
    {
      message: 'AgriChat routes are working!',
      timestamp: new Date().toISOString()
    },
    { source: 'AgriSmart AI', isFallback: false }
  );
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

