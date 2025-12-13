const axios = require('axios');
const logger = require('../utils/logger');
const apiErrorHandler = require('./api/apiErrorHandler');
const fallbackManager = require('./api/fallbackManager');
const retryManager = require('./api/retryManager');
const { CircuitBreakerManager } = require('./api/circuitBreaker');
const apiMonitor = require('./monitoring/apiMonitor');
const ruleBasedChatbot = require('./ruleBasedChatbot');

class AIService {
    constructor() {
        this.providers = [
            { name: 'perplexity', enabled: !!process.env.PERPLEXITY_API_KEY, priority: 1 },
            { name: 'google', enabled: !!process.env.GOOGLE_AI_KEY, priority: 2 },
            { name: 'openai', enabled: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here', priority: 3 },
            { name: 'deepseek', enabled: !!process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'your_deepseek_api_key_here', priority: 4 }
        ].filter(p => p.enabled).sort((a, b) => a.priority - b.priority);
        
        this.circuitBreakers = {};
        this.providers.forEach(provider => {
            this.circuitBreakers[provider.name] = CircuitBreakerManager.getBreaker(
                `ai_${provider.name}`,
                { threshold: 5, timeout: 60000 }
            );
        });
        
        logger.info(`[AI Service] Initialized with ${this.providers.length} provider(s): ${this.providers.map(p => p.name).join(', ')}`);
    }

    async chatWithAI(message, context = {}) {
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
                        provider: provider.name,
                    context: this._extractCropContext(cleanedResponse)
                };
                
            } catch (error) {
                const responseTime = Date.now() - startTime;
                const errorMessage = error.message || 'Unknown error';
                const errorDetails = error.response?.data || error.stack;
                
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
                    
                    const ruleBasedResponse = ruleBasedChatbot.getResponse(message);
                    
                    if (ruleBasedResponse.success) {
                        logger.info('[AI Service] Rule-based chatbot provided answer');
                        apiMonitor.recordRequest('rule-based', true, 0, true);
                        return ruleBasedResponse;
                    }
                    
                    const fallbackData = fallbackManager.getFallback('ai');
                    apiMonitor.recordRequest('fallback', true, 0, true);
                    
                    let fallbackMessage = ruleBasedResponse.response;
                    
                    if (errorMessage.includes('quota') || errorMessage.includes('429')) {
                        fallbackMessage = "I've reached the API request limit for today. However, I can still help you with:\n\n?? **Crop Information** - Ask about Rice, Wheat, Tomato, Potato, Cotton\n?? **Disease Help** - Ask about specific diseases\n?? **General Topics** - Soil, Fertilizer, Irrigation, Harvesting\n\nOr use our features:\n- Crop Recommendations\n- Disease Detection\n- Weather Forecast\n- Market Prices\n\nPlease try again in a few minutes for AI-powered responses.";
                    }
                    
                    return {
                        success: ruleBasedResponse.success,
                        fallback: !ruleBasedResponse.success,
                        response: fallbackMessage,
                        provider: ruleBasedResponse.provider || 'fallback',
                        source: ruleBasedResponse.source || 'Fallback',
                        error: errorMessage.includes('quota') ? 'quota_exceeded' : 'service_unavailable'
                    };
                }
                
                continue; // Try next provider
            }
        }

        logger.info('[AI Service] No providers available, using rule-based chatbot...');
        const ruleBasedResponse = ruleBasedChatbot.getResponse(message);
        
        return {
            success: ruleBasedResponse.success,
            response: ruleBasedResponse.response,
            provider: ruleBasedResponse.provider || 'rule-based',
            source: ruleBasedResponse.source || 'Rule-Based Chatbot'
        };
    }

    async _callPerplexityAI(systemPrompt, message) {
        const apiKey = process.env.PERPLEXITY_API_KEY;
        if (!apiKey || apiKey === 'your_perplexity_api_key_here') {
            throw new Error('Perplexity API key not configured');
        }

        try {
            const response = await axios.post(
                'https://api.perplexity.ai/chat/completions',
                {
                    model: 'sonar',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ],
                    temperature: 0.7,
                    max_tokens: 2048,
                    top_p: 0.9,
                    stream: false
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

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
            if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'] || 60;
                logger.warn(`[Perplexity AI] Rate limit exceeded. Retry after ${retryAfter} seconds.`);
                throw new Error(`API quota exceeded. Please try again in ${Math.ceil(retryAfter)} seconds.`);
            }
            throw error;
        }
    }

    async _callGoogleAI(systemPrompt, userMessage) {
        const apiKey = process.env.GOOGLE_AI_KEY;
        if (!apiKey || apiKey === 'your_google_ai_key_here') {
            throw new Error('Google AI key not configured');
        }

        try {
        const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                contents: [userMessage],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            },
            { 
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );

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

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage.parts[0].text }
                ],
                max_tokens: 1000,
                temperature: 0.7
            },
            { 
                headers: { 
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        return { success: true, text: response.data.choices[0].message.content };
    }

    async _callDeepSeek(systemPrompt, userMessage) {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey || apiKey === 'your_deepseek_key_here') {
            throw new Error('DeepSeek key not configured');
        }

        const response = await axios.post(
            'https://api.deepseek.com/chat/completions',
            {
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage.parts[0].text }
                ],
                max_tokens: 1000,
                temperature: 0.7
            },
            { 
                headers: { 
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

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
}

module.exports = new AIService();


