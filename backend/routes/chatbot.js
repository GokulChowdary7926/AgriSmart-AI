const express = require('express');
const router = express.Router();
const ChatbotController = require('../controllers/ChatbotController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Chatbot routes - specific routes first
router.post('/start', ChatbotController.startChat);
router.post('/message', ChatbotController.sendMessage); // Add direct message route
router.post('/recommendations', ChatbotController.getRecommendations);
router.get('/sessions', ChatbotController.listSessions);

// Parameterized routes - must come after specific routes
router.post('/:sessionId/message', ChatbotController.sendMessage);
router.get('/:sessionId/history', ChatbotController.getHistory);
router.put('/:sessionId', ChatbotController.updateSession);
router.delete('/:sessionId', ChatbotController.deleteSession);

module.exports = router;
