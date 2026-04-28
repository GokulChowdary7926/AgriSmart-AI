const mongoose = require('mongoose');
const ChatSession = require('../models/ChatSession');
const logger = require('../utils/logger');
const { unauthorized, notFound, serverError, serviceUnavailable, ok } = require('../utils/httpResponses');

function mongoReady() {
  try {
    return mongoose && mongoose.connection && mongoose.connection.readyState === 1;
  } catch (_) {
    return false;
  }
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class ChatController {
  static success(res, data, { source = 'AgriSmart AI', isFallback = false, degradedReason = null, extra = {} } = {}) {
    return ok(res, data, {
      source,
      isFallback,
      ...(degradedReason ? { degradedReason } : {}),
      ...extra
    });
  }

  static parsePositiveInt(value, defaultValue, { min = 1, max = 100 } = {}) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return defaultValue;
    return Math.max(min, Math.min(max, parsed));
  }

  static getUserId(req) {
    return req.user?._id || req.user?.userId || req.user?.id || null;
  }

  static async getOrCreateSession(req, res) {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorized(res, 'User authentication required');
      }
      if (!mongoReady()) {
        return serviceUnavailable(res, 'Chat session store unavailable', { degradedReason: 'mongo_unavailable' });
      }
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
      
      return ChatController.success(res, session);
    } catch (error) {
      logger.error('Error getting/creating session:', error);
      return serverError(res, error.message);
    }
  }
  
  static async sendMessage(req, res) {
    try {
      const { sessionId, message, metadata } = req.body;
      const userId = req.user?._id || req.user?.userId || req.user?.id;
      
      if (!userId) {
        return unauthorized(res, 'User authentication required');
      }
      if (!mongoReady()) {
        return serviceUnavailable(res, 'Chat session store unavailable', { degradedReason: 'mongo_unavailable' });
      }
      
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
      
      await session.addMessage('user', message, metadata);
      
      const aiResponse = {
        content: `I received your message: "${message}". This is a placeholder response.`,
        metadata: {
          intent: 'general',
          confidence: 0.8
        }
      };
      
      await session.addMessage('assistant', aiResponse.content, aiResponse.metadata);
      
      return ChatController.success(res, {
        session,
        response: aiResponse
      });
    } catch (error) {
      logger.error('Error sending message:', error);
      return serverError(res, error.message);
    }
  }
  
  static async getHistory(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorized(res, 'User authentication required');
      }
      if (!mongoReady()) {
        return ChatController.success(res, { messages: [] }, { isFallback: true, degradedReason: 'mongo_unavailable' });
      }
      
      const session = await ChatSession.findOne({
        sessionId,
        user: userId
      });
      
      if (!session) {
        return notFound(res, 'Session not found');
      }
      
      return ChatController.success(res, session);
    } catch (error) {
      logger.error('Error fetching chat history:', error);
      return serverError(res, error.message);
    }
  }
  
  static async getUserSessions(req, res) {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorized(res, 'User authentication required');
      }
      if (!mongoReady()) {
        return ChatController.success(res, [], { isFallback: true, degradedReason: 'mongo_unavailable' });
      }
      const { limit = 20 } = req.query;
      const safeLimit = this.parsePositiveInt(limit, 20, { min: 1, max: 100 });
      
      const sessions = await ChatSession.getUserSessions(userId, safeLimit);
      
      return ChatController.success(res, sessions);
    } catch (error) {
      logger.error('Error fetching user sessions:', error);
      return serverError(res, error.message);
    }
  }
  
  static async endSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorized(res, 'User authentication required');
      }
      if (!mongoReady()) {
        return serviceUnavailable(res, 'Chat session store unavailable', { degradedReason: 'mongo_unavailable' });
      }
      
      const session = await ChatSession.findOne({
        sessionId,
        user: userId
      });
      
      if (!session) {
        return notFound(res, 'Session not found');
      }
      
      session.status = 'completed';
      session.endedAt = new Date();
      await session.save();
      
      return ChatController.success(
        res,
        { message: 'Session ended successfully' },
        { extra: { message: 'Session ended successfully' } }
      );
    } catch (error) {
      logger.error('Error ending session:', error);
      return serverError(res, error.message);
    }
  }
}

const { bindStaticMethods } = require('../utils/bindControllerMethods');
module.exports = bindStaticMethods(ChatController);
