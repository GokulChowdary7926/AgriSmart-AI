const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/ChatController');
const BilingualChatController = require('../controllers/BilingualChatController');
const { authenticateToken } = require('../middleware/auth');

router.get('/health', BilingualChatController.health);
router.get('/crops-supported', BilingualChatController.getSupportedCrops);
router.post('/message', BilingualChatController.chat);

router.use(authenticateToken);

router.post('/session', ChatController.getOrCreateSession);
router.post('/message/protected', BilingualChatController.chat);
router.post('/legacy/message', ChatController.sendMessage);
router.post('/bilingual', BilingualChatController.chat);
router.get('/suggestions', BilingualChatController.getSuggestions);
router.get('/sessions', ChatController.getUserSessions);
router.get('/session/:sessionId', ChatController.getHistory);
router.post('/session/:sessionId/end', ChatController.endSession);

module.exports = router;
