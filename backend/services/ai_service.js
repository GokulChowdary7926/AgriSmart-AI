const logger = require('../utils/logger');
const fallbackManager = require('./api/fallbackManager');
const { CircuitBreakerManager } = require('./api/circuitBreaker');
const apiMonitor = require('./monitoring/apiMonitor');
const ruleBasedChatbot = require('./ruleBasedChatbot');
const resilientHttpClient = require('./api/resilientHttpClient');
const localAgriLLM = require('./LocalAgriLLMService');
const marketPriceAPIService = require('./marketPriceAPIService');
const governmentSchemeService = require('./governmentSchemeService');

function getPerplexityApiKey() {
    const key = process.env.PERPLEXITY_API_KEY;
    if (!key || key === 'your_perplexity_api_key_here' || key.trim() === '') return null;
    return key.startsWith('pplx-') ? key : null;
}

class AIService {
    constructor() {
        const perplexityKey = getPerplexityApiKey();
        this.providers = perplexityKey ? [{ name: 'perplexity' }] : [];
        
        this.circuitBreakers = {};
        this.providers.forEach(provider => {
            this.circuitBreakers[provider.name] = CircuitBreakerManager.getBreaker(
                `ai_${provider.name}`,
                { threshold: 5, timeout: 60000 }
            );
        });
        
        if (this.providers.length > 0) {
            logger.info('[AI Service] Initialized with Perplexity AI for AgriGPT chat');
        } else {
            logger.info('[AI Service] Initialized in LOCAL-ONLY mode (set PERPLEXITY_API_KEY for AI chat)');
        }
    }

    async chatWithAI(message, context = {}) {
        const language = (context.preferred_language || context.language || 'en').toLowerCase().split('-')[0];
        if (!this._isAgricultureQuery(message, context)) {
            return {
                success: true,
                isFallback: true,
                fallback: true,
                response: this._getNonAgricultureResponse(language),
                provider: 'AgriSmart AI',
                source: 'AgriSmart AI',
                degradedReason: 'non_agriculture_query',
                confidence: 1
            };
        }

        const normalizedMessage = String(message || '').toLowerCase();
        const inferredState = await this._inferStateFromContextOrQuery(context, normalizedMessage);
        if (this._isMarketPriceQuery(normalizedMessage)) {
            return await this._handleMarketPriceQuery({
                message: normalizedMessage,
                language,
                state: inferredState
            });
        }
        if (this._isGovernmentSchemeQuery(normalizedMessage)) {
            return await this._handleGovernmentSchemeQuery({
                language,
                state: inferredState,
                context
            });
        }

        let locationInfo = '';
        if (context.location && (context.location.lat || context.location.latitude)) {
            const lat = context.location.lat || context.location.latitude;
            const lng = context.location.lng || context.location.longitude;
            
            try {
                const locationService = require('./locationService');
                const addressData = await locationService.getLocationFromCoordinates(lat, lng).catch(() => null);
                
                if (addressData) {
                    locationInfo = `\n\nUSER LOCATION CONTEXT:
- Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}
- City: ${addressData.city || 'Not specified'}
- District: ${addressData.district || 'Not specified'}
- State: ${addressData.state || 'Not specified'}
- Country: ${addressData.country || 'India'}
- Full Address: ${addressData.address || 'Not available'}

IMPORTANT: Use this location information to provide region-specific advice. Mention the state, district, or region when relevant. Consider local climate, soil conditions, and agricultural practices specific to this location. For crop recommendations, weather advice, and market prices, tailor your response to this specific location.`;
                } else {
                    locationInfo = `\n\nUSER LOCATION: ${lat.toFixed(6)}, ${lng.toFixed(6)} (coordinates provided - use for location-aware advice)`;
                }
            } catch (error) {
                locationInfo = `\n\nUSER LOCATION: ${lat.toFixed(6)}, ${lng.toFixed(6)} (coordinates provided)`;
            }
        }

        const systemPrompt = `You are an expert agricultural assistant providing comprehensive, detailed, and well-structured agricultural advice. Your responses MUST be formatted exactly like DeepSeek AI - with clear visual hierarchy, detailed explanations, tables, code blocks, and comprehensive coverage.

═══════════════════════════════════════════════════════════════
DEEPSEEK RESPONSE FORMAT - STRICT REQUIREMENTS
═══════════════════════════════════════════════════════════════

1. RESPONSE STRUCTURE (MANDATORY):
   - Start with: ### **Main Topic Title** (use ### for all major sections)
   - Use clear section breaks: --- or *** between major sections
   - End with: **Summary** or **Key Takeaways** section

2. HEADERS (MUST USE):
   - ### **Section Title** - For major sections (with bold title)
   - #### Subsection - For subsections
   - **Bold Subheading:** - For inline subsections
   - NEVER use # or ## - only ### and ####

3. TEXT FORMATTING (REQUIRED):
   - **Bold** for: Important terms, key concepts, crop names, disease names, quantities
   - *Italic* for: Emphasis, scientific names, technical terms
   - \`Inline Code\` for: Commands, technical terms, units, measurements
   - Use proper spacing: One blank line between sections

4. LISTS (MANDATORY FORMAT):
   - Bullet points: Use * (asterisk) for features, benefits, items
     Example:
     * **First important point** with details
     * **Second point** with explanation
     * **Third point** with context
   
   - Numbered lists: Use 1., 2., 3. for step-by-step processes
     Example:
     1. **Step One:** Detailed explanation
     2. **Step Two:** More details
     3. **Step Three:** Final step

5. TABLES (MANDATORY FOR COMPARISONS):
   - ALWAYS use tables for: Comparisons, features, differences, data
   - NEVER use bullet points for comparisons
   - Format:
     | Feature | Option A | Option B | Option C |
     |---------|----------|----------|----------|
     | **Cost** | Low | Medium | High |
     | **Quality** | Good | Better | Best |
     | **Time** | Fast | Medium | Slow |

6. CODE BLOCKS (REQUIRED FOR):
   - Commands: \`\`\`bash
   - Recipes/Formulas: \`\`\`text or \`\`\`json
   - Data structures: \`\`\`json
   - Always include language specification

7. SECTION BREAKS:
   - Use --- (three dashes) between major sections
   - Use *** (three asterisks) for emphasis breaks

8. RESPONSE FLOW (TEMPLATE):
   
   [Brief engaging opening - 1-2 sentences acknowledging the question]
   
   **Core Concept:**
   [Explain the fundamental principles - 2-3 paragraphs]
   
   ---
   
   
   **Step-by-Step Guide:**
   1. **Step One:** [Detailed explanation]
   2. **Step Two:** [More details]
   3. **Step Three:** [Final step]
   
   **Key Features:**
   * **Feature 1:** Description
   * **Feature 2:** Description
   * **Feature 3:** Description
   
   ---
   
   
   | Aspect | Option A | Option B |
   |--------|----------|----------|
   | **Cost** | Details | Details |
   | **Quality** | Details | Details |
   
   ---
   
   
   [Detailed recommendations with location context if available]
   
   ---
   
   **Summary:**
   [Key takeaways - 2-3 bullet points]

═══════════════════════════════════════════════════════════════
CONTENT REQUIREMENTS
═══════════════════════════════════════════════════════════════

- Be comprehensive: Provide detailed explanations, not brief answers
- Explain "why": Don't just say "what" - explain the reasoning
- Use location context: If location provided, tailor ALL advice to that region
- Indian context: Mention states, districts, local practices, regional variations
- Units: Use Indian units (kg/acre, litres, quintals, hectares)
- Seasons: Reference Kharif/Rabi/Zaid seasons
- Safety first: Always emphasize safety and consulting local officers
- Organic priority: Recommend organic solutions first, then chemical if needed

═══════════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════════

1. NEVER use # or ## headers - ONLY ### and ####
2. ALWAYS use tables for comparisons - NEVER bullet points
3. ALWAYS use ### **Bold Title** format for major sections
4. ALWAYS include section breaks (---) between major sections
5. ALWAYS use **bold** for important terms and key concepts
6. ALWAYS provide comprehensive, detailed answers
7. ALWAYS use location context when provided
8. NEVER introduce yourself or repeat greetings
9. Get straight to content - be direct and informative
10. ALWAYS end with a summary or key takeaways

User Context: ${JSON.stringify(context)}${locationInfo}

Remember: Format your response EXACTLY like DeepSeek AI - with clear visual hierarchy, comprehensive details, proper formatting, and educational depth. Every response should be a complete, well-structured guide that helps farmers understand both what to do and why.`;

        const userMessage = {
            role: 'user',
            parts: [{ text: message }]
        };

        for (const provider of this.providers) {
            const startTime = Date.now();
            const breaker = this.circuitBreakers[provider.name];
            
            try {
                logger.info(`[AI Service] Attempting request with provider: ${provider.name}`);
                
                const result = await breaker.execute(async () => {
                    logger.info(`[AI Service] Calling ${provider.name} API...`);
                let response;

                    if (provider.name === 'perplexity') {
                        response = await this._callPerplexityAI(systemPrompt, message);
                    } else if (provider.name === 'google') {
                    response = await this._callGoogleAI(systemPrompt, userMessage);
                } else if (provider.name === 'openai') {
                    response = await this._callOpenAI(systemPrompt, userMessage);
                } else if (provider.name === 'deepseek') {
                    response = await this._callDeepSeek(systemPrompt, userMessage);
                }

                    if (!response || !response.success) {
                        throw new Error('Invalid response from AI provider');
                    }
                    
                    return response;
                }, async () => {
                    throw new Error('Circuit breaker fallback');
                });

                if (!result || !result.success) {
                    throw new Error('Invalid response from AI provider');
                }

                if (!result.text) {
                    throw new Error('No text response from AI provider');
                }

                const cleanedResponse = this._cleanResponse(result.text);
                const responseTime = Date.now() - startTime;
                
                apiMonitor.recordRequest(provider.name, true, responseTime, false);
                
                    return { 
                        success: true, 
                    response: cleanedResponse,
                        provider: 'AgriSmart AI',
                        source: 'AgriSmart AI',
                    context: this._extractCropContext(cleanedResponse)
                };
                
            } catch (error) {
                const responseTime = Date.now() - startTime;
                const errorMessage = error.message || 'Unknown error';
                logger.error(`[AI Service] Error with ${provider.name}:`, errorMessage);
                if (error.response) {
                    logger.error(`[AI Service] ${provider.name} API response:`, JSON.stringify(error.response.data).substring(0, 200));
                }
                
                apiMonitor.recordRequest(provider.name, false, responseTime, false);
                apiMonitor.recordError(provider.name, error);
                
                if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('exceeded')) {
                    logger.warn(`[AI Service] Quota exceeded for ${provider.name}, trying next provider...`);
                    if (provider !== this.providers[this.providers.length - 1]) {
                        continue;
                    }
                }
                
                if (provider === this.providers[this.providers.length - 1]) {
                    logger.info('[AI Service] All AI providers failed, trying rule-based chatbot...');
                    const localResult = localAgriLLM.answer(message, {
                        language,
                        location: context.location || null
                    });
                    if (localResult?.success) {
                        apiMonitor.recordRequest('local-llm', true, 0, true);
                        return {
                            success: true,
                            isFallback: true,
                            fallback: true,
                            response: localResult.response,
                            provider: 'AgriSmart AI',
                            source: 'Local Agri LLM',
                            degradedReason: 'ai_provider_unavailable',
                            confidence: localResult.confidence || 0.6,
                            context: {
                                localSources: localResult.sources || []
                            }
                        };
                    }
                    
                    const ruleBasedResponse = ruleBasedChatbot.getResponse(message);
                    
                    if (ruleBasedResponse.success) {
                        if (language === 'ta') {
                            const localized = this._localizeRuleBasedFallback(ruleBasedResponse.response);
                            if (localized) {
                                ruleBasedResponse.response = localized;
                            }
                        }
                        logger.info('[AI Service] Rule-based chatbot provided answer');
                        apiMonitor.recordRequest('rule-based', true, 0, true);
                        return ruleBasedResponse;
                    }
                    
                    fallbackManager.getFallback('ai');
                    apiMonitor.recordRequest('fallback', true, 0, true);
                    
                    let fallbackMessage = ruleBasedResponse.response;
                    
                    if (errorMessage.includes('quota') || errorMessage.includes('429')) {
                        fallbackMessage = "I've reached the API request limit for today. However, I can still help you with:\n\n?? **Crop Information** - Ask about Rice, Wheat, Tomato, Potato, Cotton\n?? **Disease Help** - Ask about specific diseases\n?? **General Topics** - Soil, Fertilizer, Irrigation, Harvesting\n\nOr use our features:\n- Crop Recommendations\n- Disease Detection\n- Weather Forecast\n- Market Prices\n\nPlease try again in a few minutes for AI-powered responses.";
                    }
                    
                    return {
                        success: ruleBasedResponse.success,
                        isFallback: true,
                        fallback: !ruleBasedResponse.success,
                        response: fallbackMessage,
                        provider: 'AgriSmart AI',
                        source: 'AgriSmart AI',
                        degradedReason: 'ai_provider_unavailable',
                        error: errorMessage.includes('quota') ? 'quota_exceeded' : 'service_unavailable'
                    };
                }
                
                continue;
            }
        }

        logger.info('[AI Service] No providers available, using rule-based chatbot...');
        const ruleBasedResponse = ruleBasedChatbot.getResponse(message);
        
        return {
            success: ruleBasedResponse.success,
            isFallback: true,
            response: ruleBasedResponse.response,
            provider: 'AgriSmart AI',
            source: 'AgriSmart AI',
            degradedReason: 'ai_provider_not_configured'
        };
    }

    async _callPerplexityAI(systemPrompt, message) {
        const apiKey = process.env.PERPLEXITY_API_KEY;
        if (!apiKey || apiKey === 'your_perplexity_api_key_here') {
            throw new Error('Perplexity API key not configured');
        }

        try {
            // Perplexity can reject oversized prompts with query length errors.
            // Keep both system + user prompts compact for reliability.
            const compactSystemPrompt = this._buildCompactPerplexityPrompt(systemPrompt);
            const compactUserMessage = String(message || '').replace(/\s+/g, ' ').trim().slice(0, 220);

            const result = await resilientHttpClient.request({
                serviceName: 'perplexity-ai-chat',
                method: 'post',
                url: 'https://api.perplexity.ai/chat/completions',
                data: {
                    model: 'sonar',
                    messages: [
                        { role: 'system', content: compactSystemPrompt },
                        { role: 'user', content: compactUserMessage }
                    ],
                    temperature: 0.7,
                    max_tokens: 1024,
                    top_p: 0.9,
                    stream: false
                },
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            if (!result.success) {
                throw new Error(result.error?.message || 'Perplexity AI request failed');
            }
            const response = result.response;

            if (!response.data || !response.data.choices || !response.data.choices[0]) {
                throw new Error('Invalid response from Perplexity AI');
            }

            const choice = response.data.choices[0];
            if (!choice.message || !choice.message.content) {
                throw new Error('No content in Perplexity AI response');
            }

            const text = choice.message.content;
            return { success: true, text };
        } catch (error) {
            const rawMessage = String(
                error?.response?.data?.error?.message ||
                error?.response?.data?.message ||
                error?.message ||
                ''
            ).toLowerCase();

            if (rawMessage.includes('query length limit exceeded') || rawMessage.includes('max allowed query')) {
                throw new Error('AI request too long. Please try a shorter question.');
            }

            if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'] || 60;
                logger.warn(`[Perplexity AI] Rate limit exceeded. Retry after ${retryAfter} seconds.`);
                throw new Error(`API quota exceeded. Please try again in ${Math.ceil(retryAfter)} seconds.`);
            }
            throw error;
        }
    }

    _buildCompactPerplexityPrompt(systemPrompt) {
        const basePrompt = `You are AgriSmart AI, an agriculture assistant for Indian farmers.
Provide practical, concise, accurate advice with clear bullet points.
Use Indian farming context (Kharif/Rabi, local conditions) when relevant.
Prioritize safe and actionable recommendations.`;
        if (!systemPrompt || typeof systemPrompt !== 'string') return basePrompt;
        const compact = systemPrompt.replace(/\s+/g, ' ').trim().slice(0, 120);
        return `${basePrompt}\nContext: ${compact}`;
    }

    async _callGoogleAI(systemPrompt, userMessage) {
        const apiKey = process.env.GOOGLE_AI_KEY;
        if (!apiKey || apiKey === 'your_google_ai_key_here') {
            throw new Error('Google AI key not configured');
        }

        try {
        const result = await resilientHttpClient.request({
                serviceName: 'google-ai-chat',
                method: 'post',
                url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            data: {
                contents: [userMessage],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            },
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });
        if (!result.success) {
            throw new Error(result.error?.message || 'Google AI request failed');
        }
        const response = result.response;

        if (!response.data.candidates || !response.data.candidates[0]) {
            throw new Error('Invalid response from Google AI');
        }

        const text = response.data.candidates[0].content.parts[0].text;
        return { success: true, text };
        } catch (error) {
            if (error.response?.status === 429) {
                const errorData = error.response.data?.error || {};
                const retryAfter = errorData.details?.[0]?.retryDelay?.seconds || 60;
                logger.warn(`[Google AI] Rate limit exceeded. Retry after ${retryAfter} seconds.`);
                throw new Error(`API quota exceeded. Please try again in ${Math.ceil(retryAfter)} seconds.`);
            }
            throw error;
        }
    }

    async _callOpenAI(systemPrompt, userMessage) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey || apiKey === 'your_openai_api_key_here') {
            throw new Error('OpenAI key not configured');
        }

        const result = await resilientHttpClient.request({
            serviceName: 'openai-chat',
            method: 'post',
            url: 'https://api.openai.com/v1/chat/completions',
            data: {
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage.parts[0].text }
                ],
                max_tokens: 1000,
                temperature: 0.7
            },
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        if (!result.success) {
            throw new Error(result.error?.message || 'OpenAI request failed');
        }
        const response = result.response;

        return { success: true, text: response.data.choices[0].message.content };
    }

    async _callDeepSeek(systemPrompt, userMessage) {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey || apiKey === 'your_deepseek_key_here') {
            throw new Error('DeepSeek key not configured');
        }

        const result = await resilientHttpClient.request({
            serviceName: 'deepseek-chat',
            method: 'post',
            url: 'https://api.deepseek.com/chat/completions',
            data: {
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage.parts[0].text }
                ],
                max_tokens: 1000,
                temperature: 0.7
            },
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        if (!result.success) {
            throw new Error(result.error?.message || 'DeepSeek request failed');
        }
        const response = result.response;

        return { success: true, text: response.data.choices[0].message.content };
    }

    _cleanResponse(text) {
        if (!text) return text;
        
        const patterns = [
        ];
        
        let cleaned = text;
        patterns.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });
        
        cleaned = cleaned.trim().replace(/\s{2,}/g, ' ');
        
        return cleaned;
    }

    _extractCropContext(aiResponse) {
        const crops = ['rice', 'wheat', 'tomato', 'potato', 'maize', 'cotton', 'sugarcane', 'pulses'];
        const foundCrops = crops.filter(crop => 
            aiResponse.toLowerCase().includes(crop)
        );

        return {
            detected_crops: foundCrops,
            has_disease_advice: aiResponse.toLowerCase().includes('disease') || 
                               aiResponse.toLowerCase().includes('symptom'),
            has_market_advice: aiResponse.toLowerCase().includes('price') || 
                              aiResponse.toLowerCase().includes('market')
        };
    }

    _isAgricultureQuery(message, context = {}) {
        const text = String(message || '').trim().toLowerCase();
        if (!text) return false;
        const normalized = text.replace(/[\s\-_/]+/g, '');
        const containsKeyword = (keyword) => {
            const key = String(keyword || '').toLowerCase();
            if (!key) return false;
            return text.includes(key) || normalized.includes(key.replace(/[\s\-_/]+/g, ''));
        };

        const explicitNonAgri = [
            'coding', 'programming', 'javascript', 'python code', 'interview question',
            'movie', 'song', 'cricket score', 'football score', 'stock tips', 'crypto', 'bitcoin'
        ];
        if (explicitNonAgri.some((keyword) => containsKeyword(keyword))) {
            return false;
        }

        const agriKeywords = [
            // English
            'agri', 'agriculture', 'farm', 'farming', 'farmer', 'crop', 'crops', 'seed', 'sowing',
            'harvest', 'harvesting', 'irrigation', 'soil', 'fertility', 'fertilizer', 'fertiliser',
            'pest', 'disease', 'plant', 'weather', 'rainfall', 'market price', 'mandi', 'yield',
            'organic farming', 'compost', 'manure', 'npk', 'ph', 'livestock', 'dairy',
            // Core crop names
            'rice', 'paddy', 'wheat', 'maize', 'onion', 'tomato', 'potato', 'groundnut', 'cotton', 'sugarcane',
            'pearlmillet', 'pearl millet', 'kambu', 'cumbu', 'sorghum', 'millet',
            // Tamil
            'விவசாய', 'பயிர்', 'விதை', 'நடவு', 'அறுவடை', 'மண்', 'உரம்', 'பாசனம்',
            'நோய்', 'பூச்சி', 'விளைச்சல்', 'சந்தை', 'வானிலை', 'கால்நடை', 'பசளை',
            'கம்போஸ்ட்', 'நெல்', 'அரிசி', 'கோதுமை', 'கரும்பு', 'பருத்தி', 'மக்காச்சோளம்', 'வெங்காயம்', 'தக்காளி', 'கம்பு', 'சோளம்'
        ];

        const followUpKeywords = [
            'detail', 'details', 'detailed', 'explain', 'explanation', 'more', 'elaborate',
            'விவரம்', 'விரிவாக', 'விரிவான', 'விளக்கம்', 'மேலும்'
        ];
        const hasRecentAgriContext = Boolean(context?.hasRecentAgriContext) || this._hasRecentAgricultureContext(context);
        if (followUpKeywords.some((keyword) => containsKeyword(keyword))) {
            return hasRecentAgriContext;
        }

        const likelyCropTokens = [
            'pearlmillet', 'bajra', 'cumbu', 'kambu', 'sorghum', 'ragi',
            'rice', 'paddy', 'wheat', 'maize', 'millet',
            'நெல்', 'கோதுமை', 'மக்காச்சோளம்', 'கம்பு', 'சோளம்', 'கேழ்வரகு'
        ];
        const compactToken = normalized;
        if (compactToken && likelyCropTokens.some((token) => compactToken === token || compactToken.includes(token))) {
            return true;
        }

        return agriKeywords.some((keyword) => containsKeyword(keyword));
    }

    _hasRecentAgricultureContext(context = {}) {
        const recent = Array.isArray(context?.recentMessages) ? context.recentMessages.slice(-8) : [];
        if (!recent.length) return false;
        return recent.some((msg) => {
            if (String(msg?.role || '').toLowerCase() !== 'assistant') return false;
            const content = String(msg?.content || '').toLowerCase();
            if (!content) return false;
            return [
                'agri', 'agriculture', 'farm', 'crop', 'soil', 'fertilizer', 'irrigation',
                'pest', 'disease', 'weather', 'market', 'scheme',
                'விவசாய', 'பயிர்', 'மண்', 'உரம்', 'பாசனம்', 'நோய்', 'பூச்சி', 'சந்தை',
                'நெல்', 'அரிசி', 'கோதுமை', 'கரும்பு', 'தக்காளி', 'கம்பு', 'சோளம்', 'pearlmillet', 'pearl millet', 'millet'
            ].some((keyword) => content.includes(keyword));
        });
    }

    _getNonAgricultureResponse(language) {
        if (language === 'ta') {
            return [
                '### **இது விவசாய உதவி சாட்பாட்**',
                '',
                'இந்த சாட்பாட் **விவசாயம் தொடர்பான கேள்விகளுக்கே** பதில் வழங்கும்.',
                '',
                '**தயவு செய்து கீழே உள்ள தலைப்புகளில் கேளுங்கள்:**',
                '- பயிர் பரிந்துரை',
                '- மண் வளம் மற்றும் உர மேலாண்மை',
                '- நோய் / பூச்சி கட்டுப்பாடு',
                '- பாசனம் மற்றும் வானிலை ஆலோசனை',
                '- சந்தை விலை மற்றும் அரசு திட்டங்கள்'
            ].join('\n');
        }

        return [
            '### **This is an agriculture-focused chatbot**',
            '',
            'I answer **agriculture-related questions only**.',
            '',
            '**Please ask about topics like:**',
            '- Crop recommendations',
            '- Soil fertility and fertilizer planning',
            '- Pest and disease management',
            '- Irrigation and weather guidance',
            '- Market prices and government schemes'
        ].join('\n');
    }

    _localizeRuleBasedFallback(responseText) {
        const text = String(responseText || '');
        if (!text) return null;
        if (!text.includes('### **Agricultural Guidance**')) return null;

        return [
            '### **விவசாய ஆலோசனை**',
            '',
            'உங்கள் கேள்விக்கு துல்லியமான ஆலோசனை வழங்க, தயவுசெய்து கீழேயுள்ள விவரங்களில் குறைந்தது ஒன்றை குறிப்பிடவும்:',
            '',
            '- பயிர் பெயர் (எ.கா., நெல், கோதுமை, கரும்பு, தக்காளி)',
            '- தலைப்பு (பருவம், மண், பாசனம், உரம், நோய், விளைச்சல்)',
            '- உங்கள் இடம் (மாவட்டம்/மாநிலம்)',
            '',
            '**உதாரண கேள்விகள்:**',
            '- கரும்புக்கு உர அட்டவணை என்ன?',
            '- நெல் நோய் கட்டுப்பாடு எப்படி செய்யலாம்?',
            '- என் பகுதியில் இப்போது எந்த பயிர் சிறந்தது?',
            '- சந்தை விலை நிலவரம் என்ன?'
        ].join('\n');
    }

    _isMarketPriceQuery(text) {
        const keywords = [
            'market price', 'price today', 'commodity price', 'mandi', 'agmarknet', 'market rate',
            'சந்தை விலை', 'விலை என்ன', 'இன்றைய விலை', 'மண்டி விலை'
        ];
        return keywords.some((k) => text.includes(k));
    }

    _isGovernmentSchemeQuery(text) {
        const keywords = [
            'government scheme', 'farmer scheme', 'subsidy', 'pm kisan', 'insurance scheme', 'yojana',
            'அரசுத் திட்டம்', 'அரசு திட்டம்', 'மானியம்', 'விவசாய திட்டம்', 'திட்டங்கள்', 'அரசு உதவி'
        ];
        return keywords.some((k) => text.includes(k));
    }

    async _inferStateFromContextOrQuery(context, normalizedMessage) {
        const contextState = String(context?.location?.state || '').trim();
        if (contextState) return contextState;
        const lat = Number(context?.location?.lat || context?.location?.latitude);
        const lng = Number(context?.location?.lng || context?.location?.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            try {
                const locationService = require('./locationService');
                const addressData = await locationService.getLocationFromCoordinates(lat, lng).catch(() => null);
                const resolvedState = String(addressData?.state || '').trim();
                if (resolvedState) return resolvedState;
            } catch (_) {
                // Best-effort reverse geocode for state inference.
            }
        }
        if (normalizedMessage.includes('tamil nadu') || normalizedMessage.includes('தமிழ்நாடு') || normalizedMessage.includes('தமிழ் நாடு')) {
            return 'Tamil Nadu';
        }
        return 'Tamil Nadu';
    }

    _extractCommodity(normalizedMessage) {
        const commodityMap = [
            { keys: ['நெல்', 'அரிசி', 'rice', 'paddy'], value: 'Rice' },
            { keys: ['கோதுமை', 'wheat'], value: 'Wheat' },
            { keys: ['மக்காச்சோளம்', 'maize'], value: 'Maize' },
            { keys: ['வெங்காயம்', 'onion'], value: 'Onion' },
            { keys: ['தக்காளி', 'tomato'], value: 'Tomato' },
            { keys: ['உருளைக்கிழங்கு', 'potato'], value: 'Potato' },
            { keys: ['நிலக்கடலை', 'groundnut'], value: 'Groundnut' },
            { keys: ['பருத்தி', 'cotton'], value: 'Cotton' },
            { keys: ['கரும்பு', 'sugarcane'], value: 'Sugarcane' }
        ];

        const found = commodityMap.find((item) => item.keys.some((k) => normalizedMessage.includes(k)));
        return found ? found.value : null;
    }

    async _handleMarketPriceQuery({ message, language, state }) {
        const commodity = this._extractCommodity(message);
        let prices = [];
        try {
            if (commodity) {
                prices = await marketPriceAPIService.getRealTimePrices(commodity, state);
            } else {
                prices = ['Rice', 'Wheat', 'Maize', 'Tomato', 'Onion'].flatMap((name) =>
                    marketPriceAPIService.generateMockPrices(name, state)
                );
            }
        } catch (_) {
            prices = commodity
                ? marketPriceAPIService.generateMockPrices(commodity, state)
                : ['Rice', 'Wheat', 'Maize', 'Tomato', 'Onion'].flatMap((name) => marketPriceAPIService.generateMockPrices(name, state));
        }

        const filtered = (prices || []).filter((p) => {
            const itemCommodity = String(p.commodity || p.name || '').toLowerCase();
            const itemState = String(p.state || p.market?.state || p.market?.location || '').toLowerCase();
            const targetState = String(state || 'Tamil Nadu').toLowerCase();
            const commodityMatch = commodity ? itemCommodity.includes(String(commodity).toLowerCase()) : true;
            const stateMatch = itemState ? (itemState.includes(targetState) || targetState.includes(itemState)) : true;
            return commodityMatch && stateMatch;
        });

        const sourceRows = filtered.length > 0 ? filtered : (prices || []);
        const top = sourceRows.slice(0, 6).map((p) => {
            const comm = p.commodity || p.name || 'Commodity';
            const value = typeof p.price === 'object' ? p.price.value : p.price;
            const district = p.district || p.market?.location || p.market?.state || p.state || '-';
            return { comm, value: Number(value || 0), district };
        });

        if (language === 'ta') {
            const lines = top.map((row) => `- **${row.comm}**: ₹${row.value.toFixed(2)}/kg (${row.district})`);
            return {
                success: true,
                isFallback: true,
                fallback: true,
                provider: 'AgriSmart AI',
                source: 'AgriSmart AI',
                degradedReason: 'market_direct_handler',
                response: [
                    `### **${state} நேரடி சந்தை விலை தகவல்**`,
                    '',
                    commodity ? `**பொருள்:** ${commodity}` : '**முக்கிய பயிர்கள்:**',
                    ...lines,
                    '',
                    'மேலும் குறிப்பிட்ட பயிர் பெயரை கொடுத்தால், அதற்கான விரிவான சந்தை விலையை தருகிறேன்.'
                ].join('\n')
            };
        }

        return {
            success: true,
            isFallback: true,
            fallback: true,
            provider: 'AgriSmart AI',
            source: 'AgriSmart AI',
            degradedReason: 'market_direct_handler',
            response: `### **${state} Market Prices**\n\n${top.map((row) => `- **${row.comm}**: ₹${row.value.toFixed(2)}/kg (${row.district})`).join('\n')}`
        };
    }

    async _handleGovernmentSchemeQuery({ language, state, context }) {
        const farmerProfile = {
            location: {
                state,
                district: context?.location?.district || 'Chennai'
            },
            farmDetails: {
                landSize: context?.profile?.landSize || 1,
                landOwnership: true
            },
            annualIncome: context?.profile?.annualIncome || 100000,
            cropsGrown: context?.profile?.crops || ['rice'],
            socialCategory: context?.profile?.socialCategory || ''
        };

        let recommendations;
        try {
            recommendations = await governmentSchemeService.recommendSchemes(farmerProfile, {
                showOnlyEligible: false,
                sortBy: 'relevance_score'
            });
        } catch (_) {
            recommendations = governmentSchemeService.getFallbackRecommendations(farmerProfile);
        }

        const allSchemes = recommendations?.allSchemes || [];
        const tamilNaduSchemes = allSchemes.filter((s) => (s.state || '').toLowerCase().includes('tamil') || String(s.level || '').toLowerCase() === 'state');
        const centralSchemes = allSchemes.filter((s) => String(s.level || '').toLowerCase() === 'central');
        const topTamilNadu = tamilNaduSchemes.slice(0, 3);
        const topCentral = centralSchemes.slice(0, 3);

        if (language === 'ta') {
            return {
                success: true,
                isFallback: true,
                fallback: true,
                provider: 'AgriSmart AI',
                source: 'AgriSmart AI',
                degradedReason: 'schemes_direct_handler',
                response: [
                    `### **${state} + இந்திய அரசு விவசாய திட்டங்கள்**`,
                    '',
                    '**தமிழ்நாடு திட்டங்கள்:**',
                    ...(topTamilNadu.length
                        ? topTamilNadu.map((s) => `- **${s.name}** (${s.schemeId || 'ID'})`)
                        : ['- தற்போது நேரடி மாநில திட்ட பட்டியல் கிடைக்கவில்லை; மத்திய திட்டங்கள் கீழே.']),
                    '',
                    '**இந்தியா (மத்திய) திட்டங்கள்:**',
                    ...(topCentral.length
                        ? topCentral.map((s) => `- **${s.name}** (${s.schemeId || 'ID'})`)
                        : ['- தற்போது மத்திய திட்ட பட்டியல் கிடைக்கவில்லை.']),
                    '',
                    'நீங்கள் உங்கள் நில விவரம் (ஏக்கர்), வருமானம், மாவட்டம் சொன்னால் தகுதி அடிப்படையில் திட்டங்களை வரிசைப்படுத்தி தருகிறேன்.'
                ].join('\n')
            };
        }

        return {
            success: true,
            isFallback: true,
            fallback: true,
            provider: 'AgriSmart AI',
            source: 'AgriSmart AI',
            degradedReason: 'schemes_direct_handler',
            response: `### **${state} + India Government Schemes**\n\n${topTamilNadu.concat(topCentral).map((s) => `- **${s.name}** (${s.schemeId || 'ID'})`).join('\n')}`
        };
    }
}

module.exports = new AIService();


