const AgriAIService = require('../services/AgriAIService');
const TamilAgriChatbotService = require('../services/TamilAgriChatbotService');
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const { badRequest, ok, serverError } = require('../utils/httpResponses');

class BilingualChatController {
  generateSessionId() {
    return `bilingual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  async saveChatHistory(userId, sessionId, userMessage, botResult) {
    if (!userId || !sessionId) return;
    await ChatSession.findOneAndUpdate(
      { sessionId, userId },
      {
        $set: {
          title: String(userMessage || '').slice(0, 60) || 'Tamil-English chat',
          updatedAt: new Date()
        },
        $setOnInsert: {
          userId,
          sessionId,
          createdAt: new Date()
        }
      },
      { upsert: true, new: true }
    ).catch(() => null);

    await ChatMessage.create([
      {
        sessionId,
        userId,
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      },
      {
        sessionId,
        userId,
        role: 'assistant',
        content: botResult.reply,
        intent: botResult.intent,
        data: {
          type: botResult.type,
          structuredData: botResult.structuredData
        },
        timestamp: new Date()
      }
    ]).catch(() => null);
  }

  async chat(req, res) {
    try {
      const body = req.body || {};
      const message = String(body.message || '').trim();
      if (!message) {
        return badRequest(res, 'Message is required');
      }

      const sessionId = body.sessionId || this.generateSessionId();
      const context = {
        userId: req.user?.id || req.user?._id || null,
        sessionId,
        location: body.location || req.user?.farmerProfile?.location || {}
      };

      const aiResult = await AgriAIService.processMessage(message, context);
      const lightweightIntentResult = await TamilAgriChatbotService.processMessage(message, context);

      const result = {
        reply: aiResult.response,
        type: lightweightIntentResult.type || 'general_response',
        language: aiResult.language || lightweightIntentResult.language,
        intent: lightweightIntentResult.intent || aiResult?.metadata?.intent || 'general',
        confidence: aiResult?.metadata?.confidence || lightweightIntentResult.confidence || 0.65,
        entities: lightweightIntentResult.entities || {},
        structuredData: lightweightIntentResult.structuredData || {},
        quickReplies: lightweightIntentResult.quickReplies || TamilAgriChatbotService.buildSuggestions(aiResult.language || 'en'),
        metadata: {
          ...(aiResult.metadata || {}),
          source: aiResult.source,
          processingTimeMs: aiResult.processingTime,
          isFallback: Boolean(aiResult.isFallback)
        }
      };

      await this.saveChatHistory(context.userId, sessionId, message, result);

      return ok(res, {
        reply: result.reply,
        source: result.metadata?.source || 'rule_engine',
        isFallback: Boolean(result.metadata?.isFallback),
        type: result.type,
        language: result.language,
        intent: result.intent,
        confidence: result.confidence,
        entities: result.entities,
        structuredData: result.structuredData,
        quickReplies: result.quickReplies,
        metadata: result.metadata,
        sessionId
      });
    } catch (error) {
      return serverError(res, 'Failed to process bilingual chat', error.message);
    }
  }

  async getSuggestions(req, res) {
    try {
      const lang = String(req.query.lang || 'en').toLowerCase().startsWith('ta') ? 'ta' : 'en';
      const suggestions = TamilAgriChatbotService.buildSuggestions(lang);
      return ok(res, { suggestions, language: lang });
    } catch (error) {
      return serverError(res, 'Failed to load suggestions', error.message);
    }
  }

  async health(req, res) {
    try {
      const status = await AgriAIService.health();
      const overall = status.perplexity.status === 'healthy'
        ? 'healthy'
        : status.localLLM.status === 'healthy'
          ? 'degraded'
          : 'fallback_only';
      return ok(res, { ...status, overall });
    } catch (error) {
      return serverError(res, 'Failed to fetch bilingual chat health', error.message);
    }
  }

  async getSupportedCrops(req, res) {
    try {
      const payload = TamilAgriChatbotService.getSupportedCrops();
      return ok(res, payload);
    } catch (error) {
      return serverError(res, 'Failed to load supported crops', error.message);
    }
  }
}

module.exports = new BilingualChatController();
