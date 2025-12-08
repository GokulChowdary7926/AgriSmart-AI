const chatbotAPIService = require('./chatbotAPIService');
const logger = require('../utils/logger');

/**
 * AGRI-GPT Service
 * Main service for handling agricultural chatbot queries
 */
class AgriGPTService {
  constructor() {
    this.context = {};
  }

  /**
   * Process chat message with real-time AI
   */
  async processMessage(message, language = 'en', userId = null) {
    try {
      // Try real-time AI API first
      const aiResponse = await chatbotAPIService.getAIResponse(message, {
        language: language,
        userId: userId
      });

      if (aiResponse) {
        return {
          text: aiResponse.text,
          source: aiResponse.source,
          confidence: aiResponse.confidence,
          timestamp: new Date().toISOString()
        };
      }

      // Fallback to rule-based responses
      return this.getFallbackResponse(message, language);
    } catch (error) {
      logger.error('Error processing message:', error);
      return this.getFallbackResponse(message, language);
    }
  }

  /**
   * Fallback rule-based responses with detailed information
   */
  getFallbackResponse(message, language) {
    const messageLower = message.toLowerCase();
    
    // Crop-related queries
    if (messageLower.includes('crop') || messageLower.includes('grow') || messageLower.includes('plant')) {
      if (messageLower.includes('rice')) {
        return {
          text: `For rice cultivation in India:
1. Season: Kharif (June-November)
2. Water: Requires standing water (5-10cm depth)
3. Soil: Clayey or loamy soil with pH 5.5-6.5
4. Varieties: Pusa Basmati, Swarna, Samba Mahsuri
5. Yield: 4-6 tonnes per hectare

Current market price: ₹45-55 per kg

Visit the Crop Recommendation page for location-specific advice!`,
          source: 'rule_based',
          confidence: 0.8,
          timestamp: new Date().toISOString()
        };
      }
      return {
        text: 'I can help you with crop recommendations! Please visit the Crop Recommendation page and share your location for personalized advice.',
        source: 'rule_based',
        confidence: 0.7,
        timestamp: new Date().toISOString()
      };
    }

    // Disease-related queries
    if (messageLower.includes('disease') || messageLower.includes('sick') || messageLower.includes('pest')) {
      return {
        text: `Common plant diseases and treatments:
1. Leaf Blight: Use Copper Oxychloride (3g/liter water)
2. Powdery Mildew: Apply Sulfur-based fungicide
3. Bacterial Blight: Streptomycin spray

Upload a photo on our Disease Detection page for specific diagnosis and treatment recommendations.`,
        source: 'rule_based',
        confidence: 0.8,
        timestamp: new Date().toISOString()
      };
    }

    // Weather queries
    if (messageLower.includes('weather') || messageLower.includes('rain') || messageLower.includes('temperature')) {
      return {
        text: 'Check the Weather page for real-time weather information and forecasts for your location.',
        source: 'rule_based',
        confidence: 0.7,
        timestamp: new Date().toISOString()
      };
    }

    // Market price queries
    if (messageLower.includes('price') || messageLower.includes('market') || messageLower.includes('sell')) {
      return {
        text: `Current market prices (approximate per kg):
• Rice: ₹45-55
• Wheat: ₹25-35
• Cotton: ₹70-80
• Sugarcane: ₹3-5
• Tomato: ₹25-35
• Potato: ₹20-25
• Onion: ₹30-40

Check Market Prices page for real-time rates from mandis and price predictions.`,
        source: 'rule_based',
        confidence: 0.8,
        timestamp: new Date().toISOString()
      };
    }

    // Government scheme queries
    if (messageLower.includes('scheme') || messageLower.includes('subsidy') || messageLower.includes('government')) {
      return {
        text: `Key government schemes for farmers:
1. PM-KISAN: ₹6,000/year direct benefit (3 installments of ₹2,000)
2. PMFBY: Crop insurance with premium subsidy (2% for Kharif, 1.5% for Rabi)
3. Soil Health Card: Free soil testing and recommendations
4. PKVY: Paramparagat Krishi Vikas Yojana for organic farming
5. PMKSY: Pradhan Mantri Krishi Sinchai Yojana for irrigation

Visit Government Schemes page for eligibility check and application.`,
        source: 'rule_based',
        confidence: 0.8,
        timestamp: new Date().toISOString()
      };
    }

    // Default response
    return {
      text: 'I\'m here to help with agricultural questions! Ask me about crops, diseases, weather, market prices, or government schemes.',
      source: 'rule_based',
      confidence: 0.5,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Process image for disease detection
   */
  async processImage(imageBase64, language = 'en') {
    try {
      // Try real-time AI vision API
      const aiResponse = await chatbotAPIService.detectDiseaseFromImage(imageBase64, {
        language: language
      });

      if (aiResponse) {
        return {
          disease: aiResponse.disease,
          source: aiResponse.source,
          confidence: aiResponse.confidence,
          timestamp: new Date().toISOString()
        };
      }

      // Fallback
      return {
        disease: 'Please use the Disease Detection page for accurate image-based disease diagnosis.',
        source: 'fallback',
        confidence: 0.3,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error processing image:', error);
      return {
        disease: 'Error processing image. Please try again.',
        source: 'error',
        confidence: 0,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new AgriGPTService();

