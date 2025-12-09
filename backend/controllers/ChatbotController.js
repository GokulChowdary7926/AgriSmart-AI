const ChatSession = require('../models/ChatSession');
const User = require('../models/User');
const { translate, translateAgricultureTerm } = require('../utils/translation');
const { languagePreferences } = require('../config/languages');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class ChatbotController {
  // Start new chat session
  static async startChat(req, res) {
    try {
      const userId = req.user._id;
      const { context = {} } = req.body;
      
      // Detect language from user preference or request
      const language = context.language || req.user?.preferences?.language || req.language || 'en';
      
      // Create new session
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
      
      // Generate welcome message in user's language
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
      
      res.json({
        success: true,
        data: {
          sessionId: session.sessionId,
          sessionTitle: translate('chatbot.title', language),
          language: language,
          welcomeMessage: welcomeMessage,
          context: session.context
        }
      });
    } catch (error) {
      logger.error('Start chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start chat session'
      });
    }
  }
  
  // Send message and get AI response
  static async sendMessage(req, res) {
    try {
      const { sessionId } = req.params || {};
      const { content, attachments = [], sessionId: bodySessionId } = req.body;
      const userId = req.user?._id || req.user?.userId || req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
      }
      
      // Support both URL param and body sessionId
      const actualSessionId = sessionId || bodySessionId;
      
      if (!actualSessionId) {
        // Create or get active session for user
        let session = await ChatSession.findOne({
          user: userId,
          status: 'active'
        }).sort({ createdAt: -1 });
        
        if (!session) {
          // Create new session
          const language = req.user?.preferences?.language || req.language || 'en';
          session = new ChatSession({
            user: userId,
            sessionId: uuidv4(),
            language: language,
            status: 'active'
          });
          await session.save();
        }
        
        // Use this session
        const userMessage = {
          role: 'user',
          content: content,
          timestamp: new Date()
        };
        
        session.messages.push(userMessage);
        
        // Generate AI response (simplified)
        const aiResponse = {
          role: 'assistant',
          content: translate('chatbot.responses.unknown', session.language),
          timestamp: new Date()
        };
        
        session.messages.push(aiResponse);
        await session.save();
        
        return res.json({
          success: true,
          data: {
            sessionId: session.sessionId,
            message: aiResponse
          }
        });
      }
      
      // Find session by sessionId
      let session = await ChatSession.findOne({
        sessionId: actualSessionId,
        user: userId
      });
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Chat session not found'
        });
      }
      
      const language = session.language || req.user?.preferences?.language || 'en';
      
      // Add user message
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
      
      // Process with AI service (placeholder - integrate with actual AI service)
      const aiResponse = await this.processWithAI(content, language, session.context);
      
      // Add AI response
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
      
      // Update context
      if (aiResponse.intent) {
        session.context.previousIntents.push(aiResponse.intent);
      }
      
      session.lastActivity = new Date();
      session.analytics.messageCount = session.messages.length;
      
      await session.save();
      
      res.json({
        success: true,
        data: {
          userMessage: userMessage,
          aiResponse: assistantMessage,
          session: {
            sessionId: session.sessionId,
            language: language
          }
        }
      });
    } catch (error) {
      logger.error('Send message error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process message'
      });
    }
  }
  
  // Get chat history
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
          error: 'Chat session not found'
        });
      }
      
      res.json({
        success: true,
        data: {
          sessionId: session.sessionId,
          title: session.context.currentCrop 
            ? translate('chatbot.context.crop', session.language) 
            : translate('chatbot.title', session.language),
          language: session.language,
          messages: session.messages,
          context: session.context,
          startedAt: session.startedAt,
          lastActivity: session.lastActivity
        }
      });
    } catch (error) {
      logger.error('Get history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch chat history'
      });
    }
  }
  
  // List user's chat sessions
  static async listSessions(req, res) {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 20, status = 'active' } = req.query;
      
      const query = { user: userId };
      if (status !== 'all') {
        query.status = status;
      }
      
      const sessions = await ChatSession.find(query)
        .sort({ lastActivity: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .select('sessionId context language status startedAt lastActivity analytics.messageCount');
      
      const total = await ChatSession.countDocuments(query);
      
      res.json({
        success: true,
        data: sessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('List sessions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch chat sessions'
      });
    }
  }
  
  // Update chat session
  static async updateSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user._id;
      const updates = req.body;
      
      const session = await ChatSession.findOne({
        sessionId,
        user: userId
      });
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Chat session not found'
        });
      }
      
      // Update allowed fields
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
      
      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      logger.error('Update session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update chat session'
      });
    }
  }
  
  // Delete chat session
  static async deleteSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user._id;
      
      const session = await ChatSession.findOneAndDelete({
        sessionId,
        user: userId
      });
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Chat session not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Chat session deleted successfully'
      });
    } catch (error) {
      logger.error('Delete session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete chat session'
      });
    }
  }
  
  // Get AI recommendations
  static async getRecommendations(req, res) {
    try {
      const { query, context = {} } = req.body;
      const language = context.language || req.user?.preferences?.language || req.language || 'en';
      
      // Generate recommendations based on query and context
      const recommendations = await this.generateRecommendations(query, context, language);
      
      res.json({
        success: true,
        data: {
          recommendations,
          language
        }
      });
    } catch (error) {
      logger.error('Get recommendations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recommendations'
      });
    }
  }
  
  // Private methods
  
  // Process message with AI (placeholder - integrate with actual AI service)
  static async processWithAI(message, language, context) {
    // TODO: Integrate with actual AI service (GPT, custom ML model, etc.)
    // For now, return intelligent placeholder responses
    
    const lowerMessage = message.toLowerCase();
    
    // Simple intent detection
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
  
  // Detect intent from message
  static async detectIntent(message, language) {
    const lowerMessage = message.toLowerCase();
    
    // Simple keyword-based intent detection
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
  
  // Generate recommendations
  static async generateRecommendations(query, context, language) {
    // Generate context-aware recommendations
    const suggestions = translate('chatbot.suggestions', language);
    
    return Object.values(suggestions || {}).slice(0, 4);
  }
}

module.exports = ChatbotController;
