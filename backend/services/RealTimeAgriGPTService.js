const axios = require('axios');
const logger = require('../utils/logger');

let GoogleGenerativeAI;
try {
  const genAI = require('@google/generative-ai');
  GoogleGenerativeAI = genAI.GoogleGenerativeAI;
} catch (error) {
  logger.warn('Google Generative AI not available');
}

class RealTimeAgriGPTService {
  constructor() {
    if (GoogleGenerativeAI && process.env.GOOGLE_AI_KEY && process.env.GOOGLE_AI_KEY !== 'your_google_ai_key_here') {
      try {
        this.geminiAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
        this.geminiModel = this.geminiAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        logger.info('✅ Real-time Agri-GPT: Google Gemini initialized');
      } catch (error) {
        logger.warn('⚠️ Gemini AI initialization failed:', error.message);
        this.geminiModel = null;
      }
    } else {
      this.geminiModel = null;
    }
    this.conversations = new Map();
  }

  async chatWithRealAI(message, context = {}) {
    try {
      const realTimeData = await this.fetchRealTimeData(context);
      
      const prompt = this.buildEnhancedPrompt(message, realTimeData, context);
      
      if (this.geminiModel) {
        try {
          const result = await this.geminiModel.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          const structuredData = this.extractStructuredData(text, realTimeData);
          
          return {
            response: text,
            data: structuredData,
            sources: realTimeData.sources,
            timestamp: new Date().toISOString(),
            confidence: 0.85,
            followUpQuestions: this.generateFollowUpQuestions(text, context)
          };
        } catch (geminiError) {
          logger.warn('Gemini API error, using fallback:', geminiError.message);
          return this.getFallbackResponse(message, context, realTimeData);
        }
      } else {
        return this.getFallbackResponse(message, context, realTimeData);
      }
    } catch (error) {
      logger.error('Real AI chat error:', error);
      return this.getFallbackResponse(message, context);
    }
  }

  async fetchRealTimeData(context) {
    const dataPromises = [];
    const sources = [];
    
    if (this.needsWeatherData(context)) {
      dataPromises.push(
        axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${context.lat || 20.5937}&lon=${context.lng || 78.9629}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`, { timeout: 10000 })
          .then(res => ({ type: 'weather', data: res.data, source: 'OpenWeatherMap' }))
          .catch(err => ({ type: 'weather', data: null, source: 'OpenWeatherMap', error: err.message }))
      );
    }

    if (this.needsMarketData(context)) {
      dataPromises.push(
        axios.get('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070', {
          params: {
            'api-key': process.env.AGMARKNET_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b',
            format: 'json',
            limit: 20
          },
          timeout: 8000 // Reduced timeout for faster fallback
        })
        .then(res => {
          if (res.data && res.data.records && res.data.records.length > 0) {
            return { type: 'market', data: res.data, source: 'Data.gov.in' };
          }
          return { type: 'market', data: null, source: 'Data.gov.in', error: 'No data returned' };
        })
        .catch(err => {
          logger.debug(`Data.gov.in API unavailable: ${err.message}`);
          return { type: 'market', data: null, source: 'Data.gov.in', error: err.message, useFallback: true };
        })
      );
    }

    const results = await Promise.allSettled(dataPromises);
    
    const realTimeData = {
      weather: null,
      market: null,
      crop: null,
      disease: null,
      sources: []
    };

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const { type, data, source, useFallback } = result.value;
        if (data && !result.value.error) {
          realTimeData[type] = data;
          realTimeData.sources.push(source);
        } else if (useFallback && type === 'market') {
          logger.info('Using fallback market data service');
          realTimeData.marketFallback = true;
        }
      }
    });

    return realTimeData;
  }

  buildEnhancedPrompt(message, realTimeData, context) {
    const currentDate = new Date().toISOString().split('T')[0];
    const season = this.getCurrentSeason();
    
    let dataContext = '';
    if (realTimeData.weather) {
      dataContext += `Current Weather: ${realTimeData.weather.main?.temp}°C, ${realTimeData.weather.weather?.[0]?.description || 'N/A'}\n`;
    }
    if (realTimeData.market) {
      dataContext += `Market Prices: Available for ${realTimeData.market.records?.length || 0} commodities\n`;
    }

    return `You are an expert agricultural AI assistant for Indian farmers.

IMPORTANT:
- Do NOT introduce yourself or repeat greetings in every response
- Respond naturally and conversationally, like a real-time chat
- Get straight to the point - answer the question directly
- Be concise and avoid repetitive phrases

Current Date: ${currentDate}
Season: ${season}
Location: ${context.location || 'India'}
Farmer Profile: ${context.profile || 'General farmer'}

REAL-TIME DATA:
${dataContext}

USER QUESTION: ${message}

INSTRUCTIONS:
1. Provide comprehensive, detailed, and well-structured agricultural advice
2. Format responses like DeepSeek AI - thorough, educational, with clear sections
3. Start with engaging acknowledgment (e.g., "Excellent choice!" or "Great question!")
4. Use ### for major section headers
5. Use **bold** for important terms and concepts
6. Use bullet points (*) for lists
7. Use --- for section separators
8. Include these sections for crop questions:
   - Core Concept (explain fundamental principles)
   - Detailed Stages/Processes (step-by-step with explanations)
   - Key Challenges
   - Innovations & Best Practices
   - Summary
9. Explain the "why" behind practices, not just the "how"
10. Reference real-time data when available
11. Give specific numbers, dates, quantities, and actionable steps
12. Consider Indian farming conditions, seasons (Kharif/Rabi), and regional variations
13. Mention safety precautions for chemical treatments
14. Include both organic and chemical solutions
15. Reference government schemes if relevant
16. Include sustainability considerations
17. Be comprehensive - provide detailed, educational responses
18. Do NOT introduce yourself or repeat greetings

RESPONSE FORMAT:
*   **Key Point:** Detailed explanation with why and how

---


**1. Stage Name**
*   Detailed explanation
*   Specific quantities and practices

**2. Next Stage**
*   Comprehensive explanation

---

*   Challenge with explanation

---

*   Innovation with details

RESPONSE:`;
  }

  extractStructuredData(text, realTimeData) {
    const structured = {
      recommendations: [],
      warnings: [],
      deadlines: [],
      measurements: [],
      sources: realTimeData.sources
    };

    const recRegex = /(?:•|✓|\d+\.)\s*(.+?)(?=\.|$)/g;
    let match;
    while ((match = recRegex.exec(text)) !== null) {
      structured.recommendations.push(match[1].trim());
    }

    if (text.includes('warning') || text.includes('alert') || text.includes('danger')) {
      structured.warnings.push('Follow safety guidelines and local regulations');
    }

    const dateRegex = /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/gi;
    while ((match = dateRegex.exec(text)) !== null) {
      structured.deadlines.push(match[1]);
    }

    const measureRegex = /(\d+(?:\.\d+)?)\s*(?:kg|ha|°C|mm|%|₹)/g;
    while ((match = measureRegex.exec(text)) !== null) {
      structured.measurements.push(match[0]);
    }

    return structured;
  }

  generateFollowUpQuestions(text, context) {
    const questions = [];
    
    if (text.includes('weather') || text.includes('rain')) {
      questions.push('What about next week forecast?');
      questions.push('How will this affect my crops?');
    }
    
    if (text.includes('price') || text.includes('market')) {
      questions.push('What are the price trends?');
      questions.push('When is the best time to sell?');
    }
    
    if (text.includes('disease') || text.includes('treatment')) {
      questions.push('Are there organic alternatives?');
      questions.push('How to prevent recurrence?');
    }
    
    return questions.slice(0, 3);
  }

  needsWeatherData(context) {
    if (!context.message) return true;
    const weatherKeywords = ['weather', 'rain', 'temperature', 'humidity', 'forecast', 'monsoon'];
    return weatherKeywords.some(keyword => context.message.toLowerCase().includes(keyword));
  }

  needsMarketData(context) {
    if (!context.message) return false;
    const marketKeywords = ['price', 'market', 'sell', 'buy', 'cost', 'rupees', 'mandi'];
    return marketKeywords.some(keyword => context.message.toLowerCase().includes(keyword));
  }

  getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 10) return 'Kharif';
    if (month >= 11 || month <= 3) return 'Rabi';
    return 'Zaid';
  }

  getFallbackResponse(message, context, realTimeData = {}) {
    return {
      response: `I'm currently updating my agricultural knowledge base. For real-time advice, please check:\n\n🌤️ Weather: OpenWeatherMap\n💰 Market: Agmarknet\n🌱 Crops: Local agricultural department\n🩺 Diseases: Plantix app\n\nYour question: "${message.substring(0, 50)}..."`,
      data: {
        recommendations: ['Check local agricultural extension office', 'Consult with experienced farmers'],
        sources: realTimeData.sources || ['Fallback service']
      },
      sources: realTimeData.sources || ['Fallback service'],
      timestamp: new Date().toISOString(),
      confidence: 0.5,
      followUpQuestions: ['Try rephrasing your question', 'Check specific agricultural services']
    };
  }
}

module.exports = new RealTimeAgriGPTService();






