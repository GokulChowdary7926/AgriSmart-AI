const express = require('express');
const router = express.Router();
const ChatbotController = require('../controllers/ChatbotController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/start', ChatbotController.startChat);
router.post('/message', ChatbotController.sendMessage); // Add direct message route
router.post('/recommendations', ChatbotController.getRecommendations);
router.get('/sessions', ChatbotController.listSessions);

router.post('/:sessionId/message', ChatbotController.sendMessage);
router.get('/:sessionId/history', ChatbotController.getHistory);
router.put('/:sessionId', ChatbotController.updateSession);
router.delete('/:sessionId', ChatbotController.deleteSession);

module.exports = router;
