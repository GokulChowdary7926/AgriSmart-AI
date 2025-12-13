
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cropKnowledgeBase = require('../data/cropKnowledgeBase');
const completeCropDatabase = require('../data/completeCropDatabase');
const logger = require('../utils/logger');

class EnhancedAgriGPTService {
  constructor() {
    this.initializeAIClients();
    this.conversations = new Map();
    this.cropDB = cropKnowledgeBase;
    this.completeCropDB = completeCropDatabase; // Use complete database
  }

  initializeAIClients() {
    if (process.env.GOOGLE_AI_KEY && process.env.GOOGLE_AI_KEY !== 'your_google_ai_key_here') {
      try {
        this.geminiAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
        this.geminiModel = this.geminiAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        logger.info('[EnhancedAgriGPT] ✅ Google Gemini AI initialized');
      } catch (error) {
        logger.warn('[EnhancedAgriGPT] ⚠️ Google Gemini AI not available:', error.message);
      }
    }

    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      try {
        const { OpenAI } = require('openai');
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        logger.info('[EnhancedAgriGPT] ✅ OpenAI ChatGPT initialized');
      } catch (error) {
        logger.warn('[EnhancedAgriGPT] ⚠️ OpenAI not available:', error.message);
      }
    }

    if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'your_deepseek_api_key_here') {
      try {
        this.deepseekAPI = process.env.DEEPSEEK_API_KEY;
        this.deepseekBaseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
        logger.info('[EnhancedAgriGPT] ✅ DeepSeek AI initialized');
      } catch (error) {
        logger.warn('[EnhancedAgriGPT] ⚠️ DeepSeek not available:', error.message);
      }
    }
  }

  async chat(message, context = {}) {
    try {
      const cropInfo = this.extractCropFromMessage(message);
      
      let cropKnowledge = null;
      if (cropInfo) {
        cropKnowledge = this.completeCropDB.getCropInfo(cropInfo) || 
                       this.cropDB.getCropInfo(cropInfo);
      }
      
      const enhancedContext = {
        ...context,
        cropInfo: cropInfo,
        cropKnowledge: cropKnowledge,
        timestamp: new Date().toISOString(),
        season: this.getCurrentSeason(),
        location: context.location || 'India'
      };

      const aiPromises = [
        this.chatWithGemini(message, enhancedContext),
        this.chatWithChatGPT(message, enhancedContext),
        this.chatWithDeepSeek(message, enhancedContext)
      ];

      const results = await Promise.allSettled(aiPromises);
      
      const bestResponse = this.selectBestResponse(results, message, enhancedContext);
      
      if (cropInfo && enhancedContext.cropKnowledge) {
        bestResponse.cropDetails = this.formatCropDetails(enhancedContext.cropKnowledge);
        bestResponse.response = this.enhanceResponseWithCropData(
          bestResponse.response,
          enhancedContext.cropKnowledge
        );
      }

      return bestResponse;

    } catch (error) {
      logger.error('[EnhancedAgriGPT] Error in chat:', error);
      return this.getFallbackResponse(message, context);
    }
  }

  async chatWithGemini(message, context) {
    if (!this.geminiModel) {
      throw new Error('Gemini not available');
    }

    const prompt = this.buildPrompt(message, context, 'gemini');
    
    try {
      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        source: 'Google Gemini',
        response: text,
        confidence: 0.9,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[EnhancedAgriGPT] Gemini error:', error);
      throw error;
    }
  }

  async chatWithChatGPT(message, context) {
    if (!this.openai) {
      throw new Error('ChatGPT not available');
    }

    const prompt = this.buildPrompt(message, context, 'chatgpt');
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are Agri-GPT, an expert agricultural AI assistant for Indian farmers. Provide accurate, practical farming advice with specific numbers, dates, and actionable steps.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      return {
        source: 'OpenAI ChatGPT',
        response: completion.choices[0].message.content,
        confidence: 0.9,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[EnhancedAgriGPT] ChatGPT error:', error);
      throw error;
    }
  }

  async chatWithDeepSeek(message, context) {
    if (!this.deepseekAPI) {
      throw new Error('DeepSeek not available');
    }

    const prompt = this.buildPrompt(message, context, 'deepseek');
    
    try {
      const response = await axios.post(
        `${this.deepseekBaseURL}/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are Agri-GPT, an expert agricultural AI assistant for Indian farmers. Provide accurate, practical farming advice with specific numbers, dates, and actionable steps.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.deepseekAPI}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        source: 'DeepSeek AI',
        response: response.data.choices[0].message.content,
        confidence: 0.85,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[EnhancedAgriGPT] DeepSeek error:', error);
      throw error;
    }
  }

  buildPrompt(message, context, aiType) {
    const currentDate = new Date().toISOString().split('T')[0];
    const season = context.season || this.getCurrentSeason();
    
    let prompt = `You are an expert agricultural AI assistant for Indian farmers.

IMPORTANT:
- Do NOT introduce yourself or repeat greetings in every response
- Respond naturally and conversationally, like a real-time chat
- Get straight to the point - answer the question directly
- Be concise and avoid repetitive phrases

Current Date: ${currentDate}
Season: ${season}
Location: ${context.location || 'India'}

`;

    if (context.cropKnowledge) {
      prompt += `CROP INFORMATION AVAILABLE:
Name: ${context.cropKnowledge.name}
Category: ${context.cropKnowledge.category}

Ideal Climate: ${JSON.stringify(context.cropKnowledge.idealClimate, null, 2)}
Soil Requirements: ${JSON.stringify(context.cropKnowledge.soil, null, 2)}
Land Preparation: ${JSON.stringify(context.cropKnowledge.landPreparation, null, 2)}
Seed Rate: ${JSON.stringify(context.cropKnowledge.seedRate, null, 2)}
Nutrient Schedule: ${JSON.stringify(context.cropKnowledge.nutrientSchedule, null, 2)}
Irrigation: ${JSON.stringify(context.cropKnowledge.irrigation, null, 2)}
Pests & Diseases: ${context.cropKnowledge.pests?.join(', ') || 'None'} / ${context.cropKnowledge.diseases?.join(', ') || 'None'}
Treatment/IPM: ${context.cropKnowledge.treatment?.ipm?.join('; ') || 'N/A'}
Harvest: ${JSON.stringify(context.cropKnowledge.harvest, null, 2)}
Expected Yield: ${JSON.stringify(context.cropKnowledge.yield, null, 2)}

`;
    }

    prompt += `USER QUESTION: ${message}

INSTRUCTIONS:
1. Provide comprehensive, detailed, and well-structured agricultural advice
2. Format responses like DeepSeek AI - thorough, educational, with clear sections
3. Start with engaging acknowledgment (e.g., "Excellent choice!" or "Great question!")
4. Use ### for major section headers
5. Use **bold** for important terms and concepts
6. Use bullet points (*) for lists
7. Use --- for section separators
8. Include these sections for crop questions:
   - Core Concept (explain fundamental principles and why)
   - Detailed Stages/Processes (comprehensive step-by-step with explanations)
   - Key Challenges (with solutions)
   - Innovations & Best Practices (modern techniques)
   - Summary or key takeaways
9. Explain the "why" behind practices, not just the "how"
10. Reference specific numbers, dates, quantities, and actionable steps
11. Use crop information provided to give detailed, specific advice
12. Consider Indian farming conditions, seasons (Kharif/Rabi), and regional variations
13. Mention safety precautions for chemical treatments
14. Include both organic and chemical solutions when relevant
15. Reference government schemes if applicable
16. Include sustainability considerations and environmental impact
17. Be comprehensive - provide detailed, educational responses (aim for thorough coverage)
18. Do NOT introduce yourself or repeat greetings

RESPONSE FORMAT:
*   **Key Point 1:** Detailed explanation with why and how
*   **Key Point 2:** Detailed explanation

---


**1. Stage Name**
*   Comprehensive explanation of what, why, and how
*   Specific quantities, timings, and practices
*   Regional variations if applicable

**2. Next Stage**
*   Detailed explanation

---

*   **Challenge 1:** Explanation with solutions
*   **Challenge 2:** Explanation with solutions

---

*   **Innovation 1:** Detailed explanation
*   **Best Practice 2:** Detailed explanation

---

**In summary, [key takeaways and conclusion]**

RESPONSE:`;

    return prompt;
  }

  extractCropFromMessage(message) {
    const crops = [
      'rice', 'wheat', 'maize', 'corn', 'jowar', 'sorghum', 'bajra', 'pearl millet',
      'ragi', 'finger millet', 'barley', 'oats', 'little millet', 'foxtail millet',
      'chickpea', 'chana', 'pigeon pea', 'arhar', 'toor', 'green gram', 'moong',
      'black gram', 'urad', 'lentil', 'masoor', 'horse gram', 'field pea', 'cowpea',
      'lobia', 'soybean', 'moth bean', 'potato', 'sweet potato', 'yam', 'tapioca',
      'cassava', 'taro', 'radish', 'beetroot', 'carrot', 'turnip', 'ginger',
      'spinach', 'palak', 'amaranthus', 'chaulai', 'cabbage', 'cauliflower',
      'onion', 'garlic', 'tomato', 'brinjal', 'eggplant', 'okra', 'ladyfinger',
      'bhindi', 'peas', 'bottle gourd', 'bitter gourd', 'ridge gourd', 'pumpkin',
      'cucumber', 'snake gourd', 'ash gourd', 'pointed gourd', 'parwal',
      'banana', 'mango', 'papaya', 'guava', 'pomegranate', 'orange', 'mandarin',
      'grapes', 'apple', 'watermelon', 'musk melon', 'cantaloupe', 'groundnut',
      'mustard', 'rapeseed', 'sunflower', 'sesame', 'til', 'castor', 'linseed',
      'flax', 'cotton', 'sugarcane', 'jute', 'turmeric', 'red chilli', 'cumin',
      'jeera', 'coriander', 'black pepper', 'cardamom', 'clove', 'fenugreek',
      'methi', 'tea', 'coffee', 'rubber', 'coconut', 'arecanut', 'betel nut',
      'cashew', 'aloe vera', 'stevia', 'ashwagandha', 'hemp', 'moringa',
      'drumstick', 'saffron', 'dragon fruit', 'blueberry', 'strawberry', 'vanilla'
    ];

    const lowerMessage = message.toLowerCase();
    for (const crop of crops) {
      if (lowerMessage.includes(crop)) {
        return crop;
      }
    }
    return null;
  }

  selectBestResponse(results, message, context) {
    const successful = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    if (successful.length === 0) {
      return this.getFallbackResponse(message, context);
    }

    successful.sort((a, b) => {
      const aLength = a.response?.length || 0;
      const bLength = b.response?.length || 0;
      return (b.confidence * 1000 + bLength) - (a.confidence * 1000 + aLength);
    });

    const best = successful[0];
    
    return {
      ...best,
      allSources: successful.map(s => s.source),
      sourceCount: successful.length
    };
  }

  enhanceResponseWithCropData(response, cropKnowledge) {
    if (!cropKnowledge) return response;

    let enhanced = response + '\n\n';
    enhanced += '📊 **DETAILED CROP INFORMATION:**\n\n';
    
    if (cropKnowledge.idealClimate) {
      enhanced += `🌡️ **Ideal Climate:** ${cropKnowledge.idealClimate.temperature || cropKnowledge.idealClimate.condition}\n`;
    }
    
    if (cropKnowledge.soil) {
      enhanced += `🌱 **Soil:** ${cropKnowledge.soil.type} (pH ${cropKnowledge.soil.pH})\n`;
    }
    
    if (cropKnowledge.seedRate) {
      enhanced += `🌾 **Seed Rate:** ${JSON.stringify(cropKnowledge.seedRate, null, 2)}\n`;
    }
    
    if (cropKnowledge.nutrientSchedule) {
      enhanced += `💊 **Nutrients:** ${JSON.stringify(cropKnowledge.nutrientSchedule, null, 2)}\n`;
    }
    
    if (cropKnowledge.yield) {
      enhanced += `📈 **Expected Yield:** ${JSON.stringify(cropKnowledge.yield, null, 2)}\n`;
    }

    return enhanced;
  }

  formatCropDetails(cropKnowledge) {
    return {
      name: cropKnowledge.name,
      category: cropKnowledge.category,
      climate: cropKnowledge.idealClimate,
      soil: cropKnowledge.soil,
      seedRate: cropKnowledge.seedRate,
      nutrients: cropKnowledge.nutrientSchedule,
      irrigation: cropKnowledge.irrigation,
      pests: cropKnowledge.pests,
      diseases: cropKnowledge.diseases,
      treatment: cropKnowledge.treatment,
      harvest: cropKnowledge.harvest,
      yield: cropKnowledge.yield
    };
  }

  getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 10) return 'Kharif';
    if (month >= 11 || month <= 3) return 'Rabi';
    return 'Zaid';
  }

  getFallbackResponse(message, context) {
    return {
      source: 'Fallback',
      response: `I'm currently updating my agricultural knowledge base. For real-time advice, please check:

🌤️ Weather: OpenWeatherMap
💰 Market: Agmarknet
🌾 Crops: Local agricultural department
🩺 Diseases: Plantix app

Your question: "${message.substring(0, 50)}..."

For detailed crop information, please specify the crop name in your question.`,
      confidence: 0.5,
      timestamp: new Date().toISOString(),
      allSources: ['Fallback'],
      sourceCount: 1
    };
  }
}

module.exports = new EnhancedAgriGPTService();







