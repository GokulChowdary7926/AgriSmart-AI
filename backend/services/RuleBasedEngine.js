const TamilAgriChatbotService = require('./TamilAgriChatbotService');

class RuleBasedEngine {
  async processMessage(message, context = {}) {
    const result = await TamilAgriChatbotService.processMessage(message, context);
    return {
      success: true,
      response: result.reply || result.message || 'Unable to process the request.',
      intent: result.intent || 'general',
      confidence: result.confidence || 0.65,
      entities: result.entities || {}
    };
  }
}

module.exports = RuleBasedEngine;
