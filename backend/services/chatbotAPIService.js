const axios = require('axios');
const logger = require('../utils/logger');

class ChatbotAPIService {
  constructor() {
    this.apis = {
      openai: process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
      huggingface: 'https://api-inference.huggingface.co/models',
      custom: process.env.CUSTOM_AI_API_URL,
      fallback: true
    };
    
    this.apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async getOpenAIResponse(message, context = {}) {
    if (!this.apiKey) {
      return null;
    }

    try {
      const systemPrompt = `You are Agri-GPT, an AI agricultural expert assistant for Indian farmers. 
Provide accurate, practical advice about:
- Crop cultivation and management
- Disease detection and treatment
- Weather and climate
- Market prices and trends
- Government schemes
- Agricultural best practices

Always respond in ${context.language || 'English'}. Be concise, practical, and farmer-friendly. 
Use metric units. For prices, use INR (₹). For areas, use acres/hectares. 
For Indian context, consider regional variations and local practices.`;

      const response = await axios.post(
        this.apis.openai,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        return {
          text: response.data.choices[0].message.content,
          source: 'openai',
          confidence: 0.95
        };
      }

      return null;
    } catch (error) {
      logger.warn('OpenAI API error:', error.message);
      return null;
    }
  }

  async getHuggingFaceResponse(message, context = {}) {
    try {
      const model = 'microsoft/DialoGPT-medium';
      const response = await axios.post(
        `${this.apis.huggingface}/${model}`,
        {
          inputs: message,
          parameters: {
            max_length: 200,
            temperature: 0.7
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY || ''}`
          },
          timeout: 15000
        }
      );

      if (response.data && response.data.generated_text) {
        return {
          text: response.data.generated_text,
          source: 'huggingface',
          confidence: 0.85
        };
      }

      return null;
    } catch (error) {
      logger.warn('Hugging Face API error:', error.message);
      return null;
    }
  }

  async getAIResponse(message, context = {}) {
    const cacheKey = `${message}_${context.language || 'en'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      logger.info('Returning cached chatbot response');
      return cached.data;
    }

    let response = await this.getOpenAIResponse(message, context);
    
    if (!response) {
      response = await this.getHuggingFaceResponse(message, context);
    }
    
    if (!response) {
      logger.info('AI APIs unavailable, using local NLP');
      return null;
    }

    this.cache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

    return response;
  }

  async detectDiseaseFromImage(imageBase64, context = {}) {
    try {
      if (this.apiKey && this.apis.openai) {
        const response = await axios.post(
          this.apis.openai.replace('/chat/completions', '/chat/completions'),
          {
            model: 'gpt-4-vision-preview',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Identify the plant disease in this image. Provide the disease name, symptoms, and treatment recommendations.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${imageBase64}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 500
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        if (response.data && response.data.choices && response.data.choices.length > 0) {
          return {
            disease: response.data.choices[0].message.content,
            source: 'openai_vision',
            confidence: 0.90
          };
        }
      }

      return null;
    } catch (error) {
      logger.warn('Image detection API error:', error.message);
      return null;
    }
  }
}

module.exports = new ChatbotAPIService();

