const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/ChatController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

router.post('/session', ChatController.getOrCreateSession);
router.post('/message', ChatController.sendMessage);
router.get('/sessions', ChatController.getUserSessions);
router.get('/session/:sessionId', ChatController.getHistory);
router.post('/session/:sessionId/end', ChatController.endSession);

module.exports = router;
