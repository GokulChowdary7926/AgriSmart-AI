const ChatSession = require('../models/ChatSession');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Generate UUID v4 manually
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class ChatController {
  // Get or create active session
  static async getOrCreateSession(req, res) {
    try {
      const userId = req.user._id;
      const { language } = req.body;
      
      let session = await ChatSession.findActiveSession(userId);
      
      if (!session) {
        session = new ChatSession({
          user: userId,
          sessionId: uuidv4(),
          language: language || 'en',
          status: 'active'
        });
        await session.save();
      }
      
      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      logger.error('Error getting/creating session:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Send message
  static async sendMessage(req, res) {
    try {
      const { sessionId, message, metadata } = req.body;
      const userId = req.user._id;
      
      let session = await ChatSession.findOne({
        sessionId,
        user: userId
      });
      
      if (!session) {
        session = new ChatSession({
          user: userId,
          sessionId: sessionId || uuidv4(),
          language: metadata?.language || 'en'
        });
      }
      
      // Add user message
      await session.addMessage('user', message, metadata);
      
      // TODO: Process message with AI chatbot service
      // For now, return a simple response
      const aiResponse = {
        content: `I received your message: "${message}". This is a placeholder response.`,
        metadata: {
          intent: 'general',
          confidence: 0.8
        }
      };
      
      await session.addMessage('assistant', aiResponse.content, aiResponse.metadata);
      
      res.json({
        success: true,
        data: {
          session,
          response: aiResponse
        }
      });
    } catch (error) {
      logger.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Get session history
  static async getHistory(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user._id;
      
      const session = await ChatSession.findOne({
        sessionId,
        user: userId
      });
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
      
      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      logger.error('Error fetching chat history:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Get all user sessions
  static async getUserSessions(req, res) {
    try {
      const userId = req.user._id;
      const { limit = 20 } = req.query;
      
      const sessions = await ChatSession.getUserSessions(userId, parseInt(limit));
      
      res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      logger.error('Error fetching user sessions:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // End session
  static async endSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user._id;
      
      const session = await ChatSession.findOne({
        sessionId,
        user: userId
      });
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
      
      session.status = 'completed';
      session.endedAt = new Date();
      await session.save();
      
      res.json({
        success: true,
        message: 'Session ended successfully'
      });
    } catch (error) {
      logger.error('Error ending session:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = ChatController;
