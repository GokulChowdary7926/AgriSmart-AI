const crypto = require('crypto');
const logger = require('../utils/logger');

class AgriGPTService {
  constructor() {
    this.conversations = new Map();
    this.contextWindow = 10;
    
    this.initializeAIClients();
    
    this.knowledgeBase = this.initializeKnowledgeBase();
    
    this.cache = new Map();
    this.cacheDuration = 5 * 60 * 1000;
  }

  initializeAIClients() {
    try {
      if (process.env.GOOGLE_AI_KEY && process.env.GOOGLE_AI_KEY !== 'your_google_ai_key_here' && process.env.GOOGLE_AI_KEY.trim().length > 0) {
        try {
          const { GoogleGenerativeAI } = require('@google/generative-ai');
          this.geminiAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
          this.geminiModel = this.geminiAI.getGenerativeModel({ model: 'gemini-flash-latest' });
          logger.info('[AGRI-GPT] ✅ Google Gemini AI initialized');
        } catch (error) {
          logger.warn('[AGRI-GPT] ⚠️ Google Gemini AI not available:', error.message);
        }
      } else {
        logger.info('[AGRI-GPT] ⚠️ Google AI key not configured, using fallback');
      }
      
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' && process.env.OPENAI_API_KEY.trim().length > 0) {
        try {
          const { OpenAI } = require('openai');
          this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          logger.info('[AGRI-GPT] ✅ OpenAI initialized');
        } catch (error) {
          logger.warn('[AGRI-GPT] ⚠️ OpenAI not available:', error.message);
        }
      } else {
        logger.info('[AGRI-GPT] ⚠️ OpenAI key not configured, using fallback');
      }
      
      this.localModel = this.createLocalModel();
      logger.info('[AGRI-GPT] ✅ Local AI model ready for fallback');
      
    } catch (error) {
      logger.error('[AGRI-GPT] Failed to initialize AI clients:', error);
      this.localModel = this.createLocalModel();
    }
  }

  async chat(message, sessionId, language = 'en', userContext = {}) {
    try {
      logger.info(`[AGRI-GPT] Processing: "${message.substring(0, 50)}..."`);
      
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return this.getFallbackResponse("Please ask a question about agriculture.", language);
      }
      
      let conversation = this.conversations.get(sessionId);
      if (!conversation) {
        conversation = [];
        this.conversations.set(sessionId, conversation);
      }
      
      let intent;
      try {
        intent = await this.analyzeIntentWithContext(message, conversation, userContext);
      } catch (intentError) {
        logger.error('[AGRI-GPT] Intent analysis error:', intentError);
        intent = { name: 'general_query', confidence: 0.5 };
      }
      
      let realTimeData = {};
      try {
        realTimeData = await Promise.race([
          this.fetchRealTimeData(intent, userContext),
          new Promise(resolve => setTimeout(() => resolve({}), 5000)) // 5s timeout
        ]);
      } catch (dataError) {
        logger.error('[AGRI-GPT] Real-time data fetch error:', dataError);
        realTimeData = this.getDefaultData(intent.name);
      }
      
      let response;
      try {
        response = await this.generateResponse(
          message, 
          intent, 
          conversation, 
          realTimeData, 
          language, 
          userContext
        );
      } catch (responseError) {
        logger.error('[AGRI-GPT] Response generation error:', responseError);
        response = await this.useLocalAI(message, intent, conversation, realTimeData, language, userContext);
      }
      
      conversation.push({ 
        role: 'user', 
        content: message,
        timestamp: new Date().toISOString(),
        intent: intent.name
      });
      
      conversation.push({ 
        role: 'assistant', 
        content: response.text,
        timestamp: new Date().toISOString(),
        data: response.data || {},
        source: response.source || 'AgriSmart AI'
      });
      
      if (conversation.length > 40) {
        conversation = conversation.slice(-40);
        this.conversations.set(sessionId, conversation);
      }
      
      this.logInteraction(sessionId, message, response, intent);
      
      return {
        response: response.text,
        data: response.data,
        intent: intent,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        suggestions: this.generateSuggestions(intent, conversation),
        confidence: response.confidence || 0.85,
        source: response.source || 'AgriSmart AI'
      };
      
    } catch (error) {
      logger.error('[AGRI-GPT] Chat error:', error);
      return this.getFallbackResponse(message, language);
    }
  }

  async analyzeIntentWithContext(message, conversation, userContext) {
    const lowerMessage = message.toLowerCase();
    const recentContext = conversation.slice(-4).map(m => m.content).join(' ');
    
    const intents = [
      {
        name: 'crop_advice',
        patterns: ['crop', 'grow', 'plant', 'sow', 'harvest', 'cultivate', 'plantation'],
        priority: 1,
        requiresLocation: true
      },
      {
        name: 'disease_diagnosis',
        patterns: ['disease', 'sick', 'yellow', 'brown', 'spots', 'fungus', 'worm', 'pest', 'infected'],
        priority: 2,
        requiresImage: false
      },
      {
        name: 'weather_info',
        patterns: ['weather', 'rain', 'temperature', 'humidity', 'monsoon', 'forecast', 'climate'],
        priority: 3,
        requiresLocation: true
      },
      {
        name: 'market_prices',
        patterns: ['price', 'rate', 'market', 'sell', 'buy', 'mandi', 'cost', 'rupees'],
        priority: 4,
        requiresCommodity: true
      },
      {
        name: 'government_schemes',
        patterns: ['scheme', 'subsidy', 'loan', 'insurance', 'government', 'pm-kisan', 'pmfby'],
        priority: 5,
        requiresProfile: true
      },
      {
        name: 'soil_health',
        patterns: ['soil', 'ph', 'nutrient', 'fertilizer', 'manure', 'compost', 'npk'],
        priority: 6,
        requiresLocation: true
      },
      {
        name: 'irrigation',
        patterns: ['water', 'irrigation', 'drip', 'sprinkler', 'rainfall', 'drought'],
        priority: 7
      },
      {
        name: 'pest_control',
        patterns: ['pest', 'insect', 'bug', 'spray', 'pesticide', 'insecticide'],
        priority: 8
      },
      {
        name: 'general_advice',
        patterns: ['how to', 'best practice', 'advice', 'tips', 'suggest', 'recommend'],
        priority: 9
      }
    ];
    
    const scoredIntents = intents.map(intent => {
      let score = 0;
      
      intent.patterns.forEach(pattern => {
        if (lowerMessage.includes(pattern)) score += 2;
        if (recentContext.toLowerCase().includes(pattern)) score += 1;
      });
      
      if (intent.requiresLocation && userContext.location) score += 3;
      if (intent.requiresProfile && userContext.profile) score += 2;
      
      return { ...intent, score };
    });
    
    scoredIntents.sort((a, b) => b.score - a.score);
    
    const primaryIntent = scoredIntents[0];
    const secondaryIntents = scoredIntents.slice(1, 3).filter(i => i.score > 0);
    
    return {
      name: primaryIntent.score > 0 ? primaryIntent.name : 'general_query',
      confidence: Math.min(primaryIntent.score / 10, 1),
      primary: primaryIntent,
      secondary: secondaryIntents,
      requires: {
        location: primaryIntent.requiresLocation,
        image: primaryIntent.requiresImage,
        commodity: primaryIntent.requiresCommodity,
        profile: primaryIntent.requiresProfile
      }
    };
  }

  _buildCacheKey(intent, userContext) {
    const safeContext = {
      state: userContext?.location?.state || userContext?.state || null,
      country: userContext?.location?.country || null,
      crop: userContext?.crop || userContext?.profile?.crop || null,
      language: userContext?.language || null,
      role: userContext?.profile?.role || null
    };
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(safeContext))
      .digest('hex')
      .slice(0, 16);
    return `${intent.name}:${hash}`;
  }

  async fetchRealTimeData(intent, userContext) {
    const cacheKey = this._buildCacheKey(intent, userContext);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }
    
    try {
      let data = {};
      
      switch (intent.name) {
        case 'weather_info':
          data = await this.fetchWeatherData(userContext.location);
          break;
          
        case 'market_prices':
          data = await this.fetchMarketData(userContext.location);
          break;
          
        case 'government_schemes':
          data = await this.fetchSchemeData(userContext.profile);
          break;
          
        case 'crop_advice':
          data = await this.fetchCropData(userContext.location, userContext.profile);
          break;
          
        case 'soil_health':
          data = await this.fetchSoilData(userContext.location);
          break;
          
        case 'disease_diagnosis':
          data = await this.fetchDiseaseData();
          break;
      }
      
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        data: data
      });
      
      return data;
    } catch (error) {
      logger.error(`[AGRI-GPT] Failed to fetch ${intent.name} data:`, error);
      return this.getDefaultData(intent.name);
    }
  }

  async fetchWeatherData(location = { lat: 20.5937, lng: 78.9629 }) {
    try {
      const WeatherService = require('./WeatherService');
      const lat = location.lat ?? location.latitude ?? 20.5937;
      const lng = location.lng ?? location.longitude ?? 78.9629;
      const weatherData = await WeatherService.getWeatherByCoords(parseFloat(lat), parseFloat(lng));
      if (weatherData) {
        return {
          current: {
            temp: weatherData.temperature,
            feels_like: weatherData.feels_like,
            humidity: weatherData.humidity,
            pressure: weatherData.pressure,
            wind_speed: weatherData.wind_speed || 0,
            description: weatherData.description || weatherData.weather,
            icon: weatherData.icon || ''
          },
          location: weatherData.location || 'Location',
          farmingConditions: this.assessFarmingConditionsFromParsed(weatherData)
        };
      }
    } catch (error) {
      logger.warn('[AGRI-GPT] Weather service error, using default:', error.message);
    }
    return this.getDefaultWeather();
  }

  assessFarmingConditionsFromParsed(data) {
    const conditions = [];
    if (data.temperature > 35) conditions.push({ type: 'warning', message: 'High temperature may stress crops. Increase irrigation.' });
    if (data.temperature < 10) conditions.push({ type: 'warning', message: 'Low temperature risk. Protect sensitive crops from frost.' });
    if (data.rainfall > 50) conditions.push({ type: 'info', message: 'Heavy rainfall. Ensure drainage.' });
    if (data.humidity > 85) conditions.push({ type: 'info', message: 'High humidity. Watch for fungal diseases.' });
    if (conditions.length === 0) conditions.push({ type: 'info', message: 'Weather suitable for most field operations.' });
    return conditions;
  }

  async fetchMarketData(location) {
    try {
      const MarketPrice = require('../models/MarketPrice');
      const recentPrices = await MarketPrice.find()
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      
      if (recentPrices && recentPrices.length > 0) {
        const prices = recentPrices.map(item => ({
          commodity: item.commodity || item.name,
          pricePerKg: item.price || 0,
          market: item.market || 'Local Market',
          state: item.state || location?.state || 'India',
          date: item.createdAt
        }));
        
        return {
          prices: prices,
          trends: this.calculatePriceTrends(prices),
          recommendations: this.generateMarketRecommendations(prices)
        };
      }
      
      return this.getDefaultMarketData();
    } catch (error) {
      logger.warn('[AGRI-GPT] Market data error, using default:', error.message);
      return this.getDefaultMarketData();
    }
  }

  async fetchSchemeData(_profile = {}) {
    try {
      const GovernmentScheme = require('../models/SchemeApplication');
      const schemes = await GovernmentScheme.find()
        .limit(10)
        .lean();
      
      if (schemes && schemes.length > 0) {
        return {
          schemes: schemes.map(s => ({
            name: s.name || s.title,
            description: s.description,
            eligibility: s.eligibility || 'All farmers',
            benefits: s.benefits || 'As per scheme guidelines',
            deadline: s.deadline || 'Ongoing',
            link: s.link || '#'
          })),
          totalSchemes: schemes.length,
          eligibleCount: schemes.length
        };
      }
      
      return this.getDefaultSchemeData();
    } catch (error) {
      logger.warn('[AGRI-GPT] Scheme data error, using default:', error.message);
      return this.getDefaultSchemeData();
    }
  }

  async fetchCropData(location, profile) {
    try {
      const season = this.getCurrentSeason(location);
      
      return {
        season: season,
        recommendedCrops: this.getCropsForSeason(season, location),
        sowingCalendar: this.getSowingCalendar(season),
        yieldPredictions: await this.predictYields(location, profile)
      };
    } catch (error) {
      logger.warn('[AGRI-GPT] Crop data error:', error.message);
      return this.getDefaultCropData();
    }
  }

  async fetchSoilData(_location) {
    return {
      ph: 6.5,
      nutrients: {
        nitrogen: 'Medium',
        phosphorus: 'Low',
        potassium: 'Medium'
      },
      recommendations: [
        'Apply NPK 20-20-20 fertilizer',
        'Add organic compost',
        'Test soil pH regularly'
      ]
    };
  }

  async fetchDiseaseData() {
    try {
      const Disease = require('../models/Disease');
      const diseases = await Disease.find()
        .limit(10)
        .lean();
      
      return {
        commonDiseases: diseases.map(d => ({
          name: d.name,
          type: d.type,
          symptoms: d.symptoms?.visual?.map(s => s.description) || []
        }))
      };
    } catch (error) {
      return { commonDiseases: [] };
    }
  }

  async _withTimeout(promise, timeoutMs, label = 'ai-call') {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer);
    }
  }

  async generateResponse(message, intent, conversation, realTimeData, language, userContext) {
    const providerTimeoutMs = parseInt(process.env.AI_PROVIDER_TIMEOUT_MS || '12000', 10);

    const aiServices = [
      { name: 'gemini', fn: () => this.useGeminiAI(message, intent, conversation, realTimeData, language) },
      { name: 'openai', fn: () => this.useOpenAI(message, intent, conversation, realTimeData, language) },
      { name: 'local', fn: () => this.useLocalAI(message, intent, conversation, realTimeData, language, userContext) }
    ];

    for (const service of aiServices) {
      try {
        const response = service.name === 'local'
          ? await service.fn()
          : await this._withTimeout(service.fn(), providerTimeoutMs, `ai:${service.name}`);
        if (response) {
          if (service.name !== 'local') {
            response.source = response.source || 'AgriSmart AI';
            response.provider = service.name;
          } else {
            response.provider = 'local';
            response.isFallback = true;
            response.degradedReason = response.degradedReason || 'upstream_ai_unavailable';
          }
          return response;
        }
      } catch (error) {
        logger.warn(`[AGRI-GPT] AI provider ${service.name} failed, trying next...`, { message: error.message });
      }
    }

    throw new Error('All AI services failed');
  }

  async useGeminiAI(message, intent, conversation, realTimeData, language) {
    if (!this.geminiModel) throw new Error('Gemini AI not configured');
    
    const prompt = this.buildPrompt(message, intent, conversation, realTimeData, language);
    
    const result = await this.geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
      return {
      text: text,
      data: realTimeData,
      confidence: 0.9,
      source: 'AgriSmart AI'
    };
  }

  async useOpenAI(message, intent, conversation, realTimeData, language) {
    if (!this.openai) throw new Error('OpenAI not configured');
    
    const prompt = this.buildPrompt(message, intent, conversation, realTimeData, language);
    
    const completion = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are Agri-GPT, an expert agricultural assistant for Indian farmers. Provide accurate, practical advice in simple language."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
      return {
      text: completion.choices[0].message.content,
      data: realTimeData,
      confidence: 0.85,
      source: 'AgriSmart AI'
    };
  }

  async useLocalAI(message, intent, conversation, realTimeData, language, userContext) {
    const context = conversation.slice(-3).map(m => m.content).join('\n');
    
    let response = '';
    
    switch (intent.name) {
      case 'weather_info':
        response = this.generateWeatherResponse(realTimeData, language);
        break;
        
      case 'market_prices':
        response = this.generateMarketResponse(realTimeData, language);
        break;
        
      case 'crop_advice':
        response = this.generateCropResponse(realTimeData, userContext, language);
        break;
        
      case 'disease_diagnosis':
        response = this.generateDiseaseResponse(message, realTimeData, language);
        break;
        
      case 'government_schemes':
        response = this.generateSchemeResponse(realTimeData, language);
        break;
        
      default:
        response = this.generateGeneralResponse(message, context, language);
    }
    
    return {
      text: response,
      data: realTimeData,
      confidence: 0.7,
      source: 'AgriSmart AI'
    };
  }

  generateWeatherResponse(weatherData, _language) {
    const current = weatherData.current;
    
    return `🌤️ **Current Weather${weatherData.location ? ` for ${weatherData.location}` : ''}:**

• Temperature: ${current.temp}°C (Feels like ${current.feels_like}°C)
• Humidity: ${current.humidity}%
• Wind: ${current.wind_speed} m/s
• Conditions: ${current.description}

🌾 **Farming Advice:**

${weatherData.farmingConditions?.advice || 'Good conditions for farming activities.'}`;
  }

  generateMarketResponse(marketData, _language) {
    const topPrices = marketData.prices?.slice(0, 5) || [];
    
    if (topPrices.length === 0) {
      return '💰 Market price data is currently unavailable. Please check the Market Prices page for real-time rates.';
    }
    
    return `💰 **Current Market Prices (Top 5):**

${topPrices.map(item => 
  `• ${item.commodity}: ₹${item.pricePerKg}/kg (${item.market || 'Market'}, ${item.state || 'India'})`
).join('\n')}

📈 **Market Trends:**

${marketData.trends?.upward?.length > 0 ? 
  `↗️ Rising: ${marketData.trends.upward.join(', ')}` : 'No significant upward trends'}
${marketData.trends?.downward?.length > 0 ? 
  `\n↙️ Falling: ${marketData.trends.downward.join(', ')}` : ''}

💡 **Recommendation:** ${marketData.recommendations?.topPick || 'Check market prices regularly for best selling opportunities'}`;
  }

  generateCropResponse(cropData, _userContext, _language) {
    return `🌱 **Crop Recommendations for ${cropData.season} season:**

**Best Crops to Grow:**

${cropData.recommendedCrops?.map(crop => 
  `• ${crop.name}: ${crop.duration} days, Yield: ${crop.yield}/acre`
).join('\n') || '• Rice: 90-150 days, Yield: 25-35 quintals/acre\n• Wheat: 110-130 days, Yield: 35-45 quintals/acre'}

**Sowing Calendar:**

${Object.entries(cropData.sowingCalendar || {}).map(([month, crops]) => 
  `• ${month}: ${crops.join(', ')}`
).join('\n') || '• June-July: Rice, Maize, Cotton\n• October-November: Wheat, Mustard, Gram'}

**Tips:** ${cropData.tips || 'Maintain proper irrigation and fertilization for best yields.'}`;
  }

  generateDiseaseResponse(_message, realTimeData, _language) {
    const diseases = realTimeData.commonDiseases || [];
    
    if (diseases.length > 0) {
      return `🩺 **Common Plant Diseases:**

${diseases.slice(0, 5).map(d => 
  `• ${d.name} (${d.type}): ${d.symptoms?.[0] || 'See symptoms on Diseases page'}`
).join('\n')}

💡 **Recommendation:** Upload a photo on the Disease Detection page for specific diagnosis and treatment recommendations.`;
    }
    
    return `🩺 **Disease Diagnosis Help:**

I can help you identify plant diseases. Common issues include:
• Leaf spots and blights
• Fungal infections
• Pest damage
• Nutrient deficiencies

Please upload a photo on the Disease Detection page for accurate diagnosis and treatment recommendations.`;
  }

  generateSchemeResponse(schemeData, _language) {
    const schemes = schemeData.schemes || [];
    
    if (schemes.length === 0) {
      return '🏛️ Government scheme information is currently being updated. Please check the Government Schemes page for the latest information.';
    }
    
    return `🏛️ **Government Schemes for Farmers:**

${schemes.slice(0, 5).map(scheme => 
  `• **${scheme.name}**: ${scheme.description}\n  Benefits: ${scheme.benefits}\n  Eligibility: ${scheme.eligibility}`
).join('\n\n')}

💡 Visit the Government Schemes page for detailed eligibility check and application process.`;
  }

  generateGeneralResponse(_message, _context, _language) {
    return `I'm here to help with your agricultural questions! I can assist with:

🌾 Crop recommendations and cultivation advice
🩺 Disease diagnosis and treatment
🌤️ Weather forecasts and farming conditions
💰 Market prices and selling strategies
🏛️ Government schemes and subsidies
💧 Irrigation and water management
🌱 Soil health and fertilization

What specific topic would you like to know more about?`;
  }

  buildPrompt(message, intent, conversation, realTimeData, language) {
    const context = conversation.slice(-3).map(m => 
      `${m.role}: ${m.content}`
    ).join('\n');
    
    const dataContext = JSON.stringify(realTimeData, null, 2);
    const isFirstMessage = conversation.length === 0;
    
    return `You are an expert agricultural assistant for Indian farmers.

**IMPORTANT:**
- ${isFirstMessage ? 'This is the first message - you may greet briefly.' : 'Do NOT introduce yourself or repeat greetings. Respond naturally like a real-time chat.'}
- Get straight to the point - answer directly without repetitive introductions
- Be conversational and natural, not robotic

**User's Intent:** ${intent.name} (Confidence: ${intent.confidence})
**Real-time Data Available:** Yes
**User Language Preference:** ${language}

**Recent Conversation:**
${context || 'No previous conversation'}

**Current Real-time Agricultural Data:**
${dataContext}

**User Question:** ${message}

**Instructions:**
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
11. Include specific numbers, quantities, and facts
12. Consider Indian farming conditions, seasons (Kharif/Rabi), and regional variations
13. Mention government schemes if relevant
14. Provide safety precautions if needed
15. Include sustainability considerations
16. Be comprehensive - aim for detailed, educational responses
17. Do NOT introduce yourself or repeat greetings
18. Get straight to the content

**Response Format Example:**
*   **Key Point 1:** Detailed explanation
*   **Key Point 2:** Detailed explanation

---


**1. Stage Name**
*   Detailed explanation of what and why
*   Specific details, quantities, and practices

**2. Next Stage**
*   Comprehensive explanation

---

*   Challenge 1 with explanation
*   Challenge 2 with explanation

---

*   Innovation 1 with details
*   Best practice 2 with details

**Response:**`;
  }

  initializeKnowledgeBase() {
      return {
      crops: {
        rice: {
          seasons: ['Kharif', 'Rabi'],
          duration: '90-150 days',
          water: 'High (1200-2000mm)',
          soil: 'Clayey loam, pH 5.5-6.5',
          temperature: '20-35°C',
          varieties: ['Basmati', 'Non-Basmati', 'Hybrid'],
          diseases: ['Blast', 'Bacterial Blight', 'Sheath Blight']
        },
        wheat: {
          seasons: ['Rabi'],
          duration: '110-130 days',
          water: 'Medium (450-650mm)',
          soil: 'Well-drained loam, pH 6.0-7.5',
          temperature: '15-25°C',
          varieties: ['HD', 'PBW', 'GW'],
          diseases: ['Rust', 'Karnal Bunt', 'Powdery Mildew']
        }
      },
      fertilizers: {
        npk: {
          '10-26-26': 'For flowering and fruiting',
          '20-20-20': 'Balanced growth',
          '46-0-0': 'Urea for nitrogen',
          '0-0-50': 'Potash for root development'
        },
        organic: {
          'Farmyard Manure': 'Improves soil structure',
          'Vermicompost': 'Rich in nutrients',
          'Neem Cake': 'Pest control + nutrition'
        }
      },
      pesticides: {
        fungicides: ['Carbendazim', 'Mancozeb', 'Copper Oxychloride'],
        insecticides: ['Imidacloprid', 'Chlorpyriphos', 'Neem Oil'],
        herbicides: ['Glyphosate', 'Pendimethalin']
      }
    };
  }

  getCurrentSeason(location) {
    const month = new Date().getMonth() + 1;
    
    if (location?.lat > 20) { // North India
      if (month >= 6 && month <= 10) return 'Kharif';
      if (month >= 11 || month <= 3) return 'Rabi';
      return 'Zaid';
    } else { // South India
      if (month >= 9 && month <= 12) return 'Samba';
      if (month >= 1 && month <= 4) return 'Navarai';
      if (month >= 5 && month <= 8) return 'Kuruvai';
    }
    
    return 'Kharif';
  }

  assessFarmingConditions(weatherData) {
    const conditions = {
      suitable: [],
      warnings: [],
      advice: ''
    };
    
    const main = weatherData.main || {};
    const current = weatherData.current || {};
    const temp = main.temp || current.temp || 28;
    const humidity = main.humidity || current.humidity || 65;
    
    if (temp > 35) {
      conditions.warnings.push('High temperature - risk of heat stress');
      conditions.advice += 'Water crops in early morning or late evening. ';
    }
    
    if (humidity > 80) {
      conditions.warnings.push('High humidity - risk of fungal diseases');
      conditions.advice += 'Apply fungicide preventively. ';
    }
    
    if (conditions.warnings.length === 0) {
      conditions.suitable.push('Good conditions for farming activities');
      conditions.advice = 'Ideal weather for crop growth and field work.';
    }
    
    return conditions;
  }

  calculatePriceTrends(prices) {
    return {
      upward: prices.slice(0, Math.min(3, Math.floor(prices.length / 2))).map(p => p.commodity),
      downward: [],
      stable: prices.slice(-2).map(p => p.commodity)
    };
  }

  generateMarketRecommendations(prices) {
    const recommendations = {
      topPick: '',
      hold: [],
      sell: []
    };
    
    if (prices.length > 0) {
      const sorted = [...prices].sort((a, b) => (b.pricePerKg || 0) - (a.pricePerKg || 0));
      recommendations.topPick = `Consider selling ${sorted[0].commodity} at current prices (₹${sorted[0].pricePerKg}/kg)`;
      recommendations.sell = sorted.slice(0, 2).map(p => p.commodity);
    }
    
    return recommendations;
  }

  getCropsForSeason(season, _location) {
    const seasonCrops = {
      Kharif: [
        { name: 'Rice', duration: '90-150 days', yield: '25-35 quintals/acre' },
        { name: 'Maize', duration: '80-100 days', yield: '20-25 quintals/acre' },
        { name: 'Cotton', duration: '150-180 days', yield: '8-12 quintals/acre' }
      ],
      Rabi: [
        { name: 'Wheat', duration: '110-130 days', yield: '35-45 quintals/acre' },
        { name: 'Mustard', duration: '90-110 days', yield: '10-15 quintals/acre' },
        { name: 'Gram', duration: '100-120 days', yield: '8-12 quintals/acre' }
      ]
    };
    
    return seasonCrops[season] || seasonCrops.Kharif;
  }

  getSowingCalendar(_season) {
        return {
      'June-July': ['Rice', 'Maize', 'Cotton'],
      'October-November': ['Wheat', 'Mustard', 'Gram'],
      'March-April': ['Vegetables', 'Pulses']
    };
  }

  async predictYields(_location, _profile) {
      return {
      'Rice': { expected: 28, confidence: 85 },
      'Wheat': { expected: 40, confidence: 80 },
      'Maize': { expected: 22, confidence: 75 }
    };
  }

  generateSuggestions(intent, _conversation) {
    const suggestions = [];
    
    switch (intent.name) {
      case 'crop_advice':
        suggestions.push('What is the best time to sow?', 'Which fertilizer to use?', 'How much water needed?');
        break;
      case 'weather_info':
        suggestions.push('7-day forecast', 'Rainfall prediction', 'Temperature trends');
        break;
      case 'market_prices':
        suggestions.push('Price trends', 'Best time to sell', 'Market locations');
        break;
      default:
        suggestions.push('Crop advice', 'Weather forecast', 'Disease diagnosis');
    }
    
    return suggestions.slice(0, 3);
  }

  logInteraction(sessionId, message, response, intent) {
    const log = {
      sessionId,
      timestamp: new Date().toISOString(),
      message: message.substring(0, 200),
      responseLength: response.text.length,
      intent: intent.name,
      confidence: intent.confidence,
      source: response.source
    };
    
    logger.info('[AGRI-GPT] Interaction logged:', log);
  }

  getFallbackResponse(message, language) {
    const responses = {
      en: "I'm currently experiencing technical difficulties. Please try again in a moment or use our other services like Crop Recommendation or Disease Detection.",
      hi: "मुझे वर्तमान में तकनीकी कठिनाइयों का सामना करना पड़ रहा है। कृपया कुछ समय बाद पुनः प्रयास करें या हमारी अन्य सेवाओं जैसे फसल सिफारिश या बीमारी पहचान का उपयोग करें।"
    };
    
      return {
      response: responses[language] || responses.en,
      data: null,
      intent: { name: 'error', confidence: 0 },
      sessionId: 'fallback',
      timestamp: new Date().toISOString(),
      suggestions: ['Try again', 'Check internet connection', 'Contact support'],
        confidence: 0,
      source: 'Fallback'
    };
  }

  getDefaultWeather() {
    return {
      current: {
        temp: 28,
        feels_like: 30,
        humidity: 65,
        pressure: 1013,
        wind_speed: 12,
        description: 'Partly cloudy',
        icon: '04d'
      },
      location: 'India',
      farmingConditions: {
        suitable: ['Good for irrigation'],
        warnings: [],
        advice: 'Normal farming conditions'
      }
    };
  }

  getDefaultMarketData() {
    return {
      prices: [
        { commodity: 'Rice', pricePerKg: 45, market: 'Delhi Mandi', state: 'Delhi' },
        { commodity: 'Wheat', pricePerKg: 30, market: 'Punjab Mandi', state: 'Punjab' },
        { commodity: 'Potato', pricePerKg: 20, market: 'UP Mandi', state: 'Uttar Pradesh' }
      ],
      trends: {
        upward: ['Rice', 'Onion'],
        downward: ['Potato'],
        stable: ['Wheat', 'Maize']
      },
      recommendations: {
        topPick: 'Consider selling Rice at current prices',
        hold: ['Potato', 'Tomato'],
        sell: ['Rice', 'Wheat']
      }
    };
  }

  getDefaultSchemeData() {
    return {
      schemes: [
        {
          name: 'PM-KISAN',
          description: 'Direct income support of ₹6,000 per year',
          eligibility: 'All farmer families',
          benefits: '₹2,000 every 4 months',
          deadline: 'Ongoing',
          link: 'https://pmkisan.gov.in'
        },
        {
          name: 'PMFBY',
          description: 'Crop insurance with premium subsidy',
          eligibility: 'All farmers',
          benefits: 'Up to 90% premium subsidy',
          deadline: 'Seasonal',
          link: 'https://pmfby.gov.in'
        }
      ],
      totalSchemes: 2,
      eligibleCount: 2
    };
  }

  getDefaultCropData() {
    return {
      season: 'Kharif',
      recommendedCrops: [
        { name: 'Rice', duration: '90-150 days', yield: '25-35 quintals/acre' },
        { name: 'Maize', duration: '80-100 days', yield: '20-25 quintals/acre' }
      ],
      sowingCalendar: {
        'June-July': ['Rice', 'Maize', 'Cotton']
      },
      yieldPredictions: {
        'Rice': { expected: 28, confidence: 85 }
      }
    };
  }

  getDefaultData(intentName) {
    switch (intentName) {
      case 'weather_info': return this.getDefaultWeather();
      case 'market_prices': return this.getDefaultMarketData();
      case 'government_schemes': return this.getDefaultSchemeData();
      case 'crop_advice': return this.getDefaultCropData();
      default: return {};
    }
  }

  createLocalModel() {
    return {
      predict: async (_input) => {
        return {
          response: "I'm here to help with your farming questions. Please ask about crops, weather, market prices, or agricultural advice.",
          confidence: 0.6
        };
      }
    };
  }
}

module.exports = new AgriGPTService();
