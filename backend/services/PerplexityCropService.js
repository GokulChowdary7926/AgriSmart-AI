const logger = require('../utils/logger');
const resilientHttpClient = require('./api/resilientHttpClient');

class PerplexityCropService {
  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || null;
    this.minCrops = 10;
    this.maxCrops = 15;
  }

  isAvailable() {
    return !!this.apiKey && this.apiKey !== 'your_perplexity_api_key_here' && this.apiKey.startsWith('pplx-');
  }

  async getRecommendations(context) {
    if (!this.isAvailable()) {
      return { success: false, recommendations: [] };
    }

    const {
      state = 'India',
      district = '',
      season = 'Kharif',
      soilType = 'alluvial',
      temperature = 25,
      rainfall = 800,
      ph = 7.0,
      humidity = 65
    } = context;

    const systemPrompt = `You are an expert agronomist for Indian agriculture. Reply ONLY with a valid JSON array. No markdown, no code fence, no explanation outside the JSON.

Output exactly a JSON array of 10 to 15 crop recommendations. Each object must have:
- "crop": string (crop name in English, e.g. Rice, Wheat, Cotton)
- "suitabilityReason": string (1-2 sentences why suitable for the given location/season)
- "marketPricePerQuintal": string (current or typical market price in INR per quintal, e.g. "₹2200-2400" or "₹1800")
- "expectedYield": string (e.g. "3-4 tons/ha") optional
- "duration": string (e.g. "90-120 days") optional

Use recent Indian mandi/AGMARKNET-style prices per quintal where possible. Be precise and location-aware for ${state}${district ? ', ' + district : ''}.`;

    const userMessage = `State: ${state}. District: ${district || 'Not specified'}. Season: ${season}. Soil: ${soilType}. Temperature: ${temperature}°C. Rainfall: ${rainfall} mm. Soil pH: ${ph}. Humidity: ${humidity}%.

Return a JSON array of 10 to 15 best crop recommendations with crop, suitabilityReason, marketPricePerQuintal, and optional expectedYield and duration. Only the JSON array, nothing else.`;

    try {
      const isTestEnv = process.env.NODE_ENV === 'test';
      const result = await resilientHttpClient.request({
        serviceName: 'perplexity-crop',
        method: 'post',
        url: 'https://api.perplexity.ai/chat/completions',
        data: {
          model: 'sonar',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.3,
          max_tokens: 4096,
          stream: false
        },
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: isTestEnv ? 4000 : 25000,
        retry: {
          maxRetries: isTestEnv ? 0 : 2,
          baseDelay: 600,
          maxDelay: 5000
        },
        breaker: {
          threshold: 3,
          timeout: 60000
        }
      });

      if (!result.success) {
        logger.warn('Crop AI resilient request failed', { code: result.error?.code, status: result.error?.status });
        return { success: false, recommendations: [] };
      }

      const response = result.response;

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        logger.warn('Crop AI: empty or invalid response');
        return { success: false, recommendations: [] };
      }

      const parsed = this._parseJsonArray(content);
      if (!Array.isArray(parsed) || parsed.length < 5) {
        logger.warn('Crop AI: could not parse or too few crops', { count: parsed?.length });
        return { success: false, recommendations: [] };
      }

      const recommendations = parsed.slice(0, this.maxCrops).map((item, index) => ({
        crop: item.crop || item.name || 'Unknown',
        name: item.crop || item.name || 'Unknown',
        suitabilityReason: item.suitabilityReason || item.reason || '',
        marketPricePerQuintal: item.marketPricePerQuintal || item.marketPrice || '',
        expectedYield: item.expectedYield || '',
        duration: item.duration || '',
        suitability: 85 + Math.min(index * 2, 10),
        confidence: 0.9
      }));

      logger.info(`Crop AI: returning ${recommendations.length} recommendations for ${state}`);
      return { success: true, recommendations };
    } catch (error) {
      logger.warn('Crop AI request failed:', error.message);
      return { success: false, recommendations: [] };
    }
  }

  _parseJsonArray(text) {
    let raw = text.trim();
    const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) raw = codeBlock[1].trim();
    const start = raw.indexOf('[');
    if (start !== -1) raw = raw.slice(start);
    const end = raw.lastIndexOf(']');
    if (end !== -1) raw = raw.slice(0, end + 1);
    try {
      return JSON.parse(raw);
    } catch (_) {
      return [];
    }
  }
}

module.exports = new PerplexityCropService();
