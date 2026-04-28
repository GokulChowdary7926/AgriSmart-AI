const mongoose = require('mongoose');
const ChatSession = require('../models/ChatSession');
const { translate } = require('../utils/translation');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { unauthorized, notFound, serverError, serviceUnavailable, ok } = require('../utils/httpResponses');

function mongoReady() {
  try {
    return mongoose && mongoose.connection && mongoose.connection.readyState === 1;
  } catch (_) {
    return false;
  }
}

class ChatbotController {
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

  static async startChat(req, res) {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorized(res, 'User authentication required');
      }
      if (!mongoReady()) {
        return serviceUnavailable(res, 'Chat session store unavailable', { degradedReason: 'mongo_unavailable' });
      }
      const { context = {} } = req.body;
      
      const language = context.language || req.user?.preferences?.language || req.language || 'en';
      
      const session = new ChatSession({
        user: userId,
        sessionId: uuidv4(),
        language: language,
        context: {
          currentCrop: context.cropType,
          currentLocation: context.location,
          season: context.season,
          previousIntents: [],
          userPreferences: context.preferences || {}
        },
        status: 'active'
      });
      
      const welcomeMessage = {
        role: 'assistant',
        content: translate('chatbot.responses.welcome', language),
        timestamp: new Date(),
        metadata: {
          intent: 'greeting',
          confidence: 1.0,
          language: language
        }
      };
      
      session.messages.push(welcomeMessage);
      await session.save();
      
      return ChatbotController.success(res, {
        sessionId: session.sessionId,
        sessionTitle: translate('chatbot.title', language),
        language: language,
        welcomeMessage: welcomeMessage,
        context: session.context
      });
    } catch (error) {
      logger.error('Start chat error:', error);
      return serverError(res, 'Failed to start chat session');
    }
  }
  
  static async sendMessage(req, res) {
    try {
      const { sessionId } = req.params || {};
      const { content, attachments = [], sessionId: bodySessionId } = req.body;
      const userId = req.user?._id || req.user?.userId || req.user?.id;
      
      if (!userId) {
        return unauthorized(res, 'User authentication required');
      }
      if (!mongoReady()) {
        return serviceUnavailable(res, 'Chat session store unavailable', { degradedReason: 'mongo_unavailable' });
      }
      
      const actualSessionId = sessionId || bodySessionId;
      
      if (!actualSessionId) {
        let session = await ChatSession.findOne({
          user: userId,
          status: 'active'
        }).sort({ createdAt: -1 });
        
        if (!session) {
          const language = req.user?.preferences?.language || req.language || 'en';
          session = new ChatSession({
            user: userId,
            sessionId: uuidv4(),
            language: language,
            status: 'active'
          });
          await session.save();
        }
        
        const userMessage = {
          role: 'user',
          content: content,
          timestamp: new Date()
        };
        
        session.messages.push(userMessage);
        
        const aiResponse = {
          role: 'assistant',
          content: translate('chatbot.responses.unknown', session.language),
          timestamp: new Date()
        };
        
        session.messages.push(aiResponse);
        await session.save();
        
        return ChatbotController.success(
          res,
          {
            sessionId: session.sessionId,
            message: aiResponse
          },
          {
            isFallback: true,
            degradedReason: 'chatbot_default_response'
          }
        );
      }
      
      let session = await ChatSession.findOne({
        sessionId: actualSessionId,
        user: userId
      });
      
      if (!session) {
        return notFound(res, 'Chat session not found');
      }
      
      const language = session.language || req.user?.preferences?.language || 'en';
      
      const userMessage = {
        role: 'user',
        content: content,
        timestamp: new Date(),
        metadata: {
          intent: await this.detectIntent(content, language),
          language: language,
          attachments: attachments
        }
      };
      
      session.messages.push(userMessage);
      
      const aiResponse = await this.processWithAI(content, language, session.context);
      
      const assistantMessage = {
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        metadata: {
          intent: aiResponse.intent,
          confidence: aiResponse.confidence,
          language: language,
          entities: aiResponse.entities || []
        }
      };
      
      session.messages.push(assistantMessage);
      
      if (aiResponse.intent) {
        session.context.previousIntents.push(aiResponse.intent);
      }
      
      session.lastActivity = new Date();
      session.analytics.messageCount = session.messages.length;
      
      await session.save();
      
      return ChatbotController.success(res, {
        userMessage: userMessage,
        aiResponse: assistantMessage,
        session: {
          sessionId: session.sessionId,
          language: language
        }
      });
    } catch (error) {
      logger.error('Send message error:', error);
      return serverError(res, 'Failed to process message');
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
        return ChatbotController.success(res, { messages: [] }, { isFallback: true, degradedReason: 'mongo_unavailable' });
      }
      
      const session = await ChatSession.findOne({
        sessionId,
        user: userId
      });
      
      if (!session) {
        return notFound(res, 'Chat session not found');
      }
      
      return ChatbotController.success(res, {
        sessionId: session.sessionId,
        title: session.context.currentCrop 
          ? translate('chatbot.context.crop', session.language) 
          : translate('chatbot.title', session.language),
        language: session.language,
        messages: session.messages,
        context: session.context,
        startedAt: session.startedAt,
        lastActivity: session.lastActivity
      });
    } catch (error) {
      logger.error('Get history error:', error);
      return serverError(res, 'Failed to fetch chat history');
    }
  }
  
  static async listSessions(req, res) {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorized(res, 'User authentication required');
      }
      if (!mongoReady()) {
        return ChatbotController.success(res, [], { isFallback: true, degradedReason: 'mongo_unavailable', extra: { pagination: { page: 1, limit: 0, total: 0, pages: 0 } } });
      }
      const { page = 1, limit = 20, status = 'active' } = req.query;
      const safePage = this.parsePositiveInt(page, 1, { min: 1, max: 100000 });
      const safeLimit = this.parsePositiveInt(limit, 20, { min: 1, max: 100 });
      
      const query = { user: userId };
      if (status !== 'all') {
        query.status = status;
      }
      
      const sessions = await ChatSession.find(query)
        .sort({ lastActivity: -1 })
        .limit(safeLimit)
        .skip((safePage - 1) * safeLimit)
        .select('sessionId context language status startedAt lastActivity analytics.messageCount');
      
      const total = await ChatSession.countDocuments(query);
      
      return ChatbotController.success(
        res,
        sessions,
        {
          extra: {
            pagination: {
              page: safePage,
              limit: safeLimit,
              total,
              pages: Math.ceil(total / safeLimit)
            }
          }
        }
      );
    } catch (error) {
      logger.error('List sessions error:', error);
      return serverError(res, 'Failed to fetch chat sessions');
    }
  }
  
  static async updateSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorized(res, 'User authentication required');
      }
      if (!mongoReady()) {
        return serviceUnavailable(res, 'Chat session store unavailable', { degradedReason: 'mongo_unavailable' });
      }
      const updates = req.body;
      
      const session = await ChatSession.findOne({
        sessionId,
        user: userId
      });
      
      if (!session) {
        return notFound(res, 'Chat session not found');
      }
      
      if (updates.context) {
        session.context = { ...session.context, ...updates.context };
      }
      if (updates.status) {
        session.status = updates.status;
      }
      if (updates.language) {
        session.language = updates.language;
      }
      
      await session.save();
      
      return ChatbotController.success(res, session);
    } catch (error) {
      logger.error('Update session error:', error);
      return serverError(res, 'Failed to update chat session');
    }
  }
  
  static async deleteSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorized(res, 'User authentication required');
      }
      if (!mongoReady()) {
        return serviceUnavailable(res, 'Chat session store unavailable', { degradedReason: 'mongo_unavailable' });
      }
      
      const session = await ChatSession.findOneAndDelete({
        sessionId,
        user: userId
      });
      
      if (!session) {
        return notFound(res, 'Chat session not found');
      }
      
      return ChatbotController.success(
        res,
        { message: 'Chat session deleted successfully' },
        { extra: { message: 'Chat session deleted successfully' } }
      );
    } catch (error) {
      logger.error('Delete session error:', error);
      return serverError(res, 'Failed to delete chat session');
    }
  }
  
  static async getRecommendations(req, res) {
    try {
      const { query, context = {} } = req.body;
      const language = context.language || req.user?.preferences?.language || req.language || 'en';
      
      const recommendations = await this.generateRecommendations(query, context, language);
      
      return ChatbotController.success(res, {
        recommendations,
        language
      });
    } catch (error) {
      logger.error('Get recommendations error:', error);
      return serverError(res, 'Failed to get recommendations');
    }
  }
  
  
  static async processWithAI(message, language, context) {
    
    const lowerMessage = message.toLowerCase();
    
    let intent = 'general';
    let response = '';
    
    if (lowerMessage.includes('disease') || lowerMessage.includes('रोग') || lowerMessage.includes('நோய்')) {
      intent = 'disease';
      response = translate('chatbot.responses.disease', language, {
        crop: context.currentCrop || translate('crops.title', language)
      });
    } else if (lowerMessage.includes('weather') || lowerMessage.includes('मौसम') || lowerMessage.includes('வானிலை')) {
      intent = 'weather';
      response = translate('chatbot.responses.weather', language);
    } else if (lowerMessage.includes('price') || lowerMessage.includes('मूल्य') || lowerMessage.includes('விலை')) {
      intent = 'market';
      response = translate('chatbot.responses.market', language);
    } else if (lowerMessage.includes('crop') || lowerMessage.includes('फसल') || lowerMessage.includes('பயிர்')) {
      intent = 'crop';
      response = translate('chatbot.responses.crop', language);
    } else {
      response = translate('chatbot.responses.help', language);
    }
    
    return {
      content: response,
      intent: intent,
      confidence: 0.85,
      entities: []
    };
  }
  
  static async detectIntent(message, _language) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('disease') || lowerMessage.includes('रोग') || lowerMessage.includes('நோய்')) {
      return 'disease';
    }
    if (lowerMessage.includes('weather') || lowerMessage.includes('मौसम') || lowerMessage.includes('வானிலை')) {
      return 'weather';
    }
    if (lowerMessage.includes('price') || lowerMessage.includes('मूल्य') || lowerMessage.includes('விலை')) {
      return 'market';
    }
    if (lowerMessage.includes('crop') || lowerMessage.includes('फसल') || lowerMessage.includes('பயிர்')) {
      return 'crop';
    }
    
    return 'general';
  }
  
  static async generateRecommendations(query, context, language) {
    const suggestions = translate('chatbot.suggestions', language);
    
    return Object.values(suggestions || {}).slice(0, 4);
  }
}

const { bindStaticMethods } = require('../utils/bindControllerMethods');
module.exports = bindStaticMethods(ChatbotController);
