const aiService = require('../services/ai_service');
const logger = require('../utils/logger');

class AgriGPTController {
  async chat(req, res) {
    try {
      const { message, sessionId = `session_${Date.now()}`, language = 'en' } = req.body;
      
      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }
      
      logger.info(`[Chat Controller] Processing chat request: ${sessionId}`);
      
      let location = req.body.location || req.user?.location || null;
      
      if (location) {
        if (typeof location === 'string') {
          try {
            location = JSON.parse(location);
          } catch (e) {
            location = null;
          }
        }
        
        if (location && (location.latitude || location.lat)) {
          location = {
            lat: location.lat || location.latitude,
            lng: location.lng || location.longitude,
            city: location.city,
            state: location.state,
            district: location.district,
            country: location.country || 'India'
          };
        }
      }
      
      if (!location || !location.lat || !location.lng) {
        location = { lat: 20.5937, lng: 78.9629, country: 'India' };
      }
      
      const userContext = {
        user_id: req.user?.id || req.user?._id || 'anonymous',
        location: location,
        preferred_language: language,
        farm_size: req.user?.farm_size || 'Not specified',
        profile: req.body.profile || {}
      };
      
      const aiResponse = await aiService.chatWithAI(message.trim(), userContext);
      
      if (req.user) {
        await this.saveChatHistory(req.user.id || req.user._id, sessionId, message, {
          response: aiResponse.response,
          provider: aiResponse.provider,
          context: aiResponse.context
        });
      }
      
      res.json({
        success: aiResponse.success,
        message: aiResponse.response,
        response: aiResponse.response,
        provider: aiResponse.provider,
        context: aiResponse.context,
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('[Chat Controller] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process chat request',
        message: error.message
      });
    }
  }
  
  async chatWithImage(req, res) {
    try {
      const { message, sessionId: reqSessionId, language: reqLanguage } = req.body;
      const file = req.file;
      const sessionId = reqSessionId || `session_${Date.now()}`;
      const language = reqLanguage || 'en';

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'Image file is required'
        });
      }

      let location = { lat: 20.5937, lng: 78.9629 };
      let profile = {};
      
      if (req.body.location) {
        try {
          location = typeof req.body.location === 'string' 
            ? JSON.parse(req.body.location) 
            : req.body.location;
        } catch (e) {
          logger.warn('Failed to parse location:', e);
        }
      }
      
      if (req.body.profile) {
        try {
          profile = typeof req.body.profile === 'string' 
            ? JSON.parse(req.body.profile) 
            : req.body.profile;
        } catch (e) {
          logger.warn('Failed to parse profile:', e);
        }
      }

      let detectionResult = { primaryDisease: null };
      try {
        const diseaseDetectionService = require('../services/DiseaseDetectionService');
        detectionResult = await diseaseDetectionService.detectDiseaseFromImage(file.buffer);
      } catch (error) {
        logger.warn('[Chat with Image] Disease detection service unavailable:', error.message);
        detectionResult = { primaryDisease: { name: 'Unknown' } };
      }

      const userContext = {
        location: location,
        profile: profile,
        language: language
      };

      const queryMessage = message || `I found this disease on my plant: ${detectionResult.primaryDisease?.name || 'Unknown'}. What should I do?`;
      const chatResult = await aiService.chatWithAI(queryMessage, userContext);

      res.json({
        success: true,
        text: chatResult.response,
        response: chatResult.response,
        disease: detectionResult.primaryDisease,
        data: {
          ...detectionResult,
          chatResponse: chatResult
        },
        provider: chatResult.provider,
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('[Chat with Image] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process image',
        text: 'I apologize, but I couldn\'t process the image. Please try again.'
      });
    }
  }

  async chatWithContext(req, res) {
    try {
      const { messages, sessionId, language = 'en', context = {} } = req.body;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Messages array is required'
        });
      }
      
      const responses = [];
      
      for (const messageObj of messages) {
        const result = await aiService.chatWithAI(
          messageObj.content,
          { ...context, ...messageObj.context, preferred_language: language }
        );
        
        responses.push({
          response: result.response,
          provider: result.provider,
          context: result.context
        });
      }
      
      const summary = messages.length > 1 
        ? await this.generateConversationSummary(responses)
        : null;
      
      res.json({
        success: true,
        responses: responses,
        summary: summary,
        totalMessages: messages.length,
        sessionId: sessionId || responses[0].sessionId
      });
      
    } catch (error) {
      logger.error('[Chat Context] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process chat with context'
      });
    }
  }
  
  async getSessions(req, res) {
    try {
      const userId = req.user?.id || req.user?._id;
      const limit = parseInt(req.query.limit) || 20;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const ChatSession = require('../models/ChatSession');
      
      const sessions = await ChatSession.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .select('sessionId title messageCount lastMessage createdAt updatedAt')
        .lean();
      
      res.json({
        success: true,
        sessions: sessions || [],
        totalSessions: await ChatSession.countDocuments({ userId }).catch(() => 0)
      });
      
    } catch (error) {
      logger.error('[Get Sessions] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sessions',
        sessions: []
      });
    }
  }
  
  async getSessionDetails(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const ChatSession = require('../models/ChatSession');
      const ChatMessage = require('../models/ChatMessage');
      
      const session = await ChatSession.findOne({ 
        sessionId, 
        userId 
      }).lean();
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
      
      const messages = await ChatMessage.find({ sessionId, userId })
        .sort({ createdAt: 1 })
        .select('role content intent timestamp data -_id')
        .lean();
      
      const insights = await this.generateSessionInsights(messages);
      
      res.json({
        success: true,
        session: session,
        messages: messages || [],
        insights: insights,
        statistics: {
          totalMessages: messages.length,
          userMessages: messages.filter(m => m.role === 'user').length,
          assistantMessages: messages.filter(m => m.role === 'assistant').length,
          commonIntents: this.getCommonIntents(messages),
          duration: session.updatedAt - session.createdAt
        }
      });
      
    } catch (error) {
      logger.error('[Session Details] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch session details'
      });
    }
  }
  
  async deleteSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const ChatSession = require('../models/ChatSession');
      const ChatMessage = require('../models/ChatMessage');
      
      await ChatSession.deleteOne({ sessionId, userId }).catch(() => {});
      await ChatMessage.deleteMany({ sessionId, userId }).catch(() => {});
      
      res.json({
        success: true,
        message: 'Session deleted successfully'
      });
      
    } catch (error) {
      logger.error('[Delete Session] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete session'
      });
    }
  }
  
  async exportSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id || req.user?._id;
      const format = req.query.format || 'json';
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const ChatMessage = require('../models/ChatMessage');
      
      const messages = await ChatMessage.find({ sessionId, userId })
        .sort({ createdAt: 1 })
        .select('role content timestamp intent -_id')
        .lean();
      
      if (format === 'text') {
        const textContent = this.generateTextReport(sessionId, messages);
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=chat-${sessionId}.txt`);
        res.send(textContent);
        
      } else {
        res.json({
          success: true,
          sessionId: sessionId,
          exportDate: new Date().toISOString(),
          messageCount: messages.length,
          messages: messages
        });
      }
      
    } catch (error) {
      logger.error('[Export Session] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export session'
      });
    }
  }
  
  async getPopularQuestions(req, res) {
    try {
      const popularQuestions = [
        {
          question: 'What crops should I grow this season?',
          category: 'crop_advice',
          frequency: 1250
        },
        {
          question: 'How to treat yellow leaves on my plants?',
          category: 'disease_diagnosis',
          frequency: 980
        },
        {
          question: 'Current market prices for rice and wheat',
          category: 'market_prices',
          frequency: 850
        },
        {
          question: 'Weather forecast for next week',
          category: 'weather_info',
          frequency: 720
        },
        {
          question: 'Government schemes for farmers',
          category: 'government_schemes',
          frequency: 650
        }
      ];
      
      const getQuestionCategories = (questions) => {
        const categories = {};
        questions.forEach(q => {
          categories[q.category] = (categories[q.category] || 0) + 1;
        });
        return Object.entries(categories)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count);
      };
      
      res.json({
        success: true,
        popularQuestions: popularQuestions,
        categories: getQuestionCategories(popularQuestions),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('[Popular Questions] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch popular questions'
      });
    }
  }
  
  async getQuickReplies(req, res) {
    try {
      const { category } = req.query;
      
      const quickReplies = {
        general: [
          'Crop recommendations for my area',
          'How to improve soil fertility?',
          'Best time to harvest wheat',
          'Organic farming methods'
        ],
        diseases: [
          'How to treat fungal infections?',
          'Natural remedies for pests',
          'Identifying nutrient deficiencies',
          'Preventing common plant diseases'
        ],
        market: [
          'Current rice prices in Maharashtra',
          'When to sell potatoes for best price?',
          'Market trends for cotton',
          'Government procurement prices'
        ],
        weather: [
          'Rain forecast for next 3 days',
          'Is it good time to sow?',
          'Drought prevention measures',
          'Impact of temperature on crops'
        ]
      };
      
      const replies = category 
        ? quickReplies[category] || quickReplies.general
        : Object.values(quickReplies).flat();
      
      res.json({
        success: true,
        quickReplies: replies,
        category: category || 'all',
        count: replies.length
      });
      
    } catch (error) {
      logger.error('[Quick Replies] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch quick replies'
      });
    }
  }
  
  async saveChatHistory(userId, sessionId, message, result) {
    try {
      const ChatSession = require('../models/ChatSession');
      const ChatMessage = require('../models/ChatMessage');
      
      await ChatSession.findOneAndUpdate(
        { sessionId, userId },
        {
          $set: {
            title: this.generateSessionTitle(message),
            lastMessage: message.substring(0, 100),
            messageCount: await ChatMessage.countDocuments({ sessionId, userId }).catch(() => 0) + 2,
            updatedAt: new Date()
          },
          $setOnInsert: {
            userId,
            sessionId,
            createdAt: new Date()
          }
        },
        { upsert: true, new: true }
      );
      
      await ChatMessage.create([
        {
          sessionId,
          userId,
          role: 'user',
          content: message,
          intent: result.intent?.name || 'unknown',
          timestamp: new Date()
        },
        {
          sessionId,
          userId,
          role: 'assistant',
          content: result.response || result.message || 'Response',
          intent: result.context?.detected_crops?.[0] || 'unknown',
          data: result.context || {},
          timestamp: new Date()
        }
      ]).catch(err => logger.warn('Failed to save messages:', err));
      
    } catch (error) {
      logger.error('[Save Chat History] Error:', error);
    }
  }
  
  generateSessionTitle(message) {
    const words = message.split(' ').slice(0, 5).join(' ');
    return words.length > 30 ? words.substring(0, 30) + '...' : words;
  }
  
  async generateConversationSummary(responses) {
    const topics = responses
      .map(r => r.intent?.name)
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);
    
    return {
      topics: topics,
      totalQuestions: responses.length,
      mainTheme: topics[0] || 'General inquiry',
      adviceGiven: responses.some(r => r.intent?.name === 'crop_advice'),
      dataProvided: responses.some(r => r.data)
    };
  }
  
  async generateSessionInsights(messages) {
    const insights = [];
    
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    if (userMessages.length > 5) {
      insights.push('Detailed consultation session');
    }
    
    if (messages.some(m => m.intent === 'disease_diagnosis')) {
      insights.push('Disease diagnosis discussed');
    }
    
    if (messages.some(m => m.data)) {
      insights.push('Real-time data provided');
    }
    
    const hasFollowUps = userMessages.length >= 3;
    if (hasFollowUps) {
      insights.push('Multiple follow-up questions');
    }
    
    return insights.length > 0 ? insights : ['General farming discussion'];
  }
  
  getCommonIntents(messages) {
    const intentCounts = {};
    messages.forEach(msg => {
      const intent = msg.intent?.name || msg.intent;
      if (intent) {
        intentCounts[intent] = (intentCounts[intent] || 0) + 1;
      }
    });
    
    return Object.entries(intentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([intent, count]) => ({ intent, count }));
  }
  
  getQuestionCategories(questions) {
    const categories = {};
    questions.forEach(q => {
      categories[q.category] = (categories[q.category] || 0) + 1;
    });
    
    return Object.entries(categories)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }
  
  generateTextReport(sessionId, messages) {
    let report = `Agri-GPT Chat Session Report\n`;
    report += `Session ID: ${sessionId}\n`;
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Total Messages: ${messages.length}\n\n`;
    report += '='.repeat(50) + '\n\n';
    
    messages.forEach((msg, index) => {
      report += `${msg.role.toUpperCase()} (${new Date(msg.timestamp).toLocaleString()}):\n`;
      report += `${msg.content}\n`;
      if (msg.intent) {
        report += `[Intent: ${msg.intent.name || msg.intent}]\n`;
      }
      report += '\n' + '-'.repeat(40) + '\n\n';
    });
    
    return report;
  }
}

module.exports = new AgriGPTController();

