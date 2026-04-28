const axios = require('axios');
const LocalLLMService = require('./LocalLLMService');
const RuleBasedEngine = require('./RuleBasedEngine');

class AgriAIService {
  constructor() {
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY || '';
    this.perplexityBaseUrl = 'https://api.perplexity.ai/chat/completions';
    this.timeoutMs = Number(process.env.PERPLEXITY_TIMEOUT || 15000);
    this.maxRetries = 2;
    this.circuitBreaker = {
      failures: 0,
      threshold: Number(process.env.CIRCUIT_BREAKER_THRESHOLD || 5),
      openUntil: 0,
      cooldownMs: Number(process.env.CIRCUIT_BREAKER_TIMEOUT || 60000)
    };
    this.localLLM = new LocalLLMService();
    this.ruleEngine = new RuleBasedEngine();
    this.featureFlags = {
      perplexity: String(process.env.ENABLE_PERPLEXITY || 'true').toLowerCase() !== 'false',
      localLLM: String(process.env.ENABLE_LOCAL_LLM || 'true').toLowerCase() !== 'false',
      ruleEngine: String(process.env.ENABLE_RULE_ENGINE || 'true').toLowerCase() !== 'false'
    };
  }

  detectLanguage(text) {
    return /[\u0B80-\u0BFF]/.test(String(text || '')) ? 'ta' : 'en';
  }

  resolvePreferredLanguage(context = {}, fallbackText = '') {
    const preferred = String(context?.preferred_language || context?.language || '')
      .toLowerCase()
      .split('-')[0]
      .trim();
    if (preferred === 'ta' || preferred === 'en') return preferred;
    return this.detectLanguage(fallbackText);
  }

  classifyError(error) {
    const rawMessage = String(
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.message ||
      ''
    ).toLowerCase();
    if (rawMessage.includes('query length limit exceeded') || rawMessage.includes('max allowed query')) {
      return 'QUERY_TOO_LONG';
    }
    const status = error?.response?.status;
    if (status === 401) return 'API_KEY_INVALID';
    if (status === 429) return 'RATE_LIMITED';
    if (status >= 500) return 'SERVER_ERROR';
    if (error?.code === 'ECONNABORTED') return 'TIMEOUT';
    if (error?.code === 'ENOTFOUND') return 'NETWORK_ERROR';
    return 'UNKNOWN_ERROR';
  }

  isQueryLengthErrorText(text) {
    const normalized = String(text || '').toLowerCase();
    return normalized.includes('query length limit exceeded') || normalized.includes('max allowed query');
  }

  isFollowUpQuery(message) {
    const normalized = String(message || '').trim().toLowerCase();
    if (!normalized) return false;
    return [
      'more', 'details', 'detailed', 'detail', 'explain', 'explanation', 'elaborate',
      'விவரம்', 'விரிவாக', 'விரிவான', 'விளக்கம்', 'மேலும்'
    ].some((keyword) => normalized.includes(keyword));
  }

  isGenericGreetingResponse(text) {
    const normalized = String(text || '').trim().toLowerCase();
    if (!normalized) return true;
    return [
      "hello! i'm your ai farming assistant",
      'hello! i am your tamil-english agriculture assistant',
      'ask about crop diseases, cultivation, weather',
      'வணக்கம்! நான் உங்கள் ai விவசாய உதவியாளர்'
    ].some((snippet) => normalized.includes(snippet));
  }

  detectRequestedCrop(message) {
    const text = String(message || '').toLowerCase();
    const cropMatchers = [
      { key: 'rice', terms: ['rice', 'paddy', 'நெல்', 'அரிசி'] },
      { key: 'wheat', terms: ['wheat', 'கோதுமை', 'gothumai'] },
      { key: 'maize', terms: ['maize', 'corn', 'மக்காச்சோளம்'] },
      { key: 'tomato', terms: ['tomato', 'தக்காளி'] },
      { key: 'beans', terms: ['beans', 'பீன்ஸ்', 'பயறு'] },
      { key: 'chilli', terms: ['chilli', 'chili', 'மிளகாய்'] },
      { key: 'brinjal', terms: ['brinjal', 'eggplant', 'கத்தரி'] },
      { key: 'groundnut', terms: ['groundnut', 'peanut', 'நிலக்கடலை'] },
      { key: 'cotton', terms: ['cotton', 'பருத்தி'] },
      { key: 'sugarcane', terms: ['sugarcane', 'கரும்பு'] },
      { key: 'banana', terms: ['banana', 'வாழை'] },
      { key: 'coconut', terms: ['coconut', 'தேங்காய்'] },
      { key: 'ragi', terms: ['ragi', 'finger millet', 'கேழ்வரகு'] },
      { key: 'blackgram', terms: ['blackgram', 'urad', 'உளுந்து'] },
      { key: 'greengram', terms: ['greengram', 'moong', 'பாசிப்பயறு'] },
      { key: 'turmeric', terms: ['turmeric', 'மஞ்சள்'] },
      { key: 'onion', terms: ['onion', 'வெங்காயம்'] },
      { key: 'tapioca', terms: ['tapioca', 'cassava', 'மரவள்ளிக்கிழங்கு'] },
      { key: 'sorghum', terms: ['sorghum', 'cholam', 'சோளம்'] },
      { key: 'pearlmillet', terms: ['pearl millet', 'pearlmillet', 'cumbu', 'கம்பு'] },
      { key: 'redgram', terms: ['redgram', 'pigeon pea', 'pigeonpea', 'tur', 'துவரை'] },
      { key: 'chickpea', terms: ['chickpea', 'bengalgram', 'கொண்டைக்கடலை'] },
      { key: 'sesame', terms: ['sesame', 'gingelly', 'எள்'] },
      { key: 'sunflower', terms: ['sunflower', 'சூரியகாந்தி'] },
      { key: 'mustard', terms: ['mustard', 'கடுகு'] },
      { key: 'soybean', terms: ['soybean', 'சோயாபீன்'] },
      { key: 'coriander', terms: ['coriander', 'கொத்தமல்லி'] },
      { key: 'okra', terms: ['okra', 'ladyfinger', 'வெண்டை'] },
      { key: 'cabbage', terms: ['cabbage', 'முட்டைக்கோஸ்'] },
      { key: 'cauliflower', terms: ['cauliflower', 'பூக்கோசு'] },
      { key: 'moringa', terms: ['moringa', 'drumstick', 'முருங்கை'] },
      { key: 'mango', terms: ['mango', 'மாம்பழம்'] },
      { key: 'grapes', terms: ['grapes', 'திராட்சை'] }
    ];
    const found = cropMatchers.find((crop) => crop.terms.some((term) => text.includes(term)));
    return found ? found.key : null;
  }

  responseMatchesRequestedCrop(responseText, requestedCrop) {
    if (!requestedCrop) return true;
    const text = String(responseText || '').toLowerCase();
    const cropTerms = {
      rice: ['rice', 'paddy', 'நெல்', 'அரிசி'],
      wheat: ['wheat', 'கோதுமை', 'gothumai'],
      maize: ['maize', 'corn', 'மக்காச்சோளம்'],
      tomato: ['tomato', 'தக்காளி'],
      beans: ['beans', 'பீன்ஸ்', 'பயறு'],
      chilli: ['chilli', 'chili', 'மிளகாய்'],
      brinjal: ['brinjal', 'eggplant', 'கத்தரி'],
      groundnut: ['groundnut', 'peanut', 'நிலக்கடலை'],
      cotton: ['cotton', 'பருத்தி'],
      sugarcane: ['sugarcane', 'கரும்பு'],
      banana: ['banana', 'வாழை'],
      coconut: ['coconut', 'தேங்காய்'],
      ragi: ['ragi', 'finger millet', 'கேழ்வரகு'],
      blackgram: ['blackgram', 'urad', 'உளுந்து'],
      greengram: ['greengram', 'moong', 'பாசிப்பயறு'],
      turmeric: ['turmeric', 'மஞ்சள்'],
      onion: ['onion', 'வெங்காயம்'],
      tapioca: ['tapioca', 'cassava', 'மரவள்ளிக்கிழங்கு'],
      sorghum: ['sorghum', 'cholam', 'சோளம்'],
      pearlmillet: ['pearl millet', 'pearlmillet', 'cumbu', 'கம்பு'],
      redgram: ['redgram', 'pigeon pea', 'pigeonpea', 'tur', 'துவரை'],
      chickpea: ['chickpea', 'bengalgram', 'கொண்டைக்கடலை'],
      sesame: ['sesame', 'gingelly', 'எள்'],
      sunflower: ['sunflower', 'சூரியகாந்தி'],
      mustard: ['mustard', 'கடுகு'],
      soybean: ['soybean', 'சோயாபீன்'],
      coriander: ['coriander', 'கொத்தமல்லி'],
      okra: ['okra', 'ladyfinger', 'வெண்டை'],
      cabbage: ['cabbage', 'முட்டைக்கோஸ்'],
      cauliflower: ['cauliflower', 'பூக்கோசு'],
      moringa: ['moringa', 'drumstick', 'முருங்கை'],
      mango: ['mango', 'மாம்பழம்'],
      grapes: ['grapes', 'திராட்சை']
    };
    const requiredTerms = cropTerms[requestedCrop] || [requestedCrop];
    return requiredTerms.some((term) => text.includes(term));
  }

  resolveContextualMessage(userMessage, context = {}) {
    const message = String(userMessage || '').trim();
    const recentMessages = Array.isArray(context?.recentMessages) ? context.recentMessages : [];
    const recentUserMessages = recentMessages
      .filter((msg) => String(msg?.role || '').toLowerCase() === 'user')
      .map((msg) => String(msg?.content || '').trim())
      .filter(Boolean);

    if (!this.isFollowUpQuery(message)) {
      return message;
    }

    const previousUserMessage = recentUserMessages.length
      ? recentUserMessages[recentUserMessages.length - 1]
      : '';
    if (!previousUserMessage) return message;
    return `${previousUserMessage}\n\nFollow-up request: ${message}`;
  }

  getSystemPrompt(language = 'en') {
    if (language === 'ta') {
      return 'நீங்கள் தமிழ்/ஆங்கிலத்தில் பதில் அளிக்கும் இந்திய விவசாய நிபுணர். சுருக்கமாக, செயல்படக்கூடிய ஆலோசனை, அளவு, நேரம், பாதுகாப்பு வழிமுறைகளுடன் பதில் அளிக்கவும்.';
    }
    return 'You are an Indian agriculture expert assistant. Reply with practical, actionable guidance including dosage, timing, and safety notes.';
  }

  formatLocationText(context = {}) {
    const state = context?.location?.state ? `state: ${context.location.state}` : '';
    const district = context?.location?.district ? `district: ${context.location.district}` : '';
    return [state, district].filter(Boolean).join(', ');
  }

  async tryPerplexityAPI(message, context = {}, language = 'en') {
    if (!this.featureFlags.perplexity) {
      return { success: false, error: 'PERPLEXITY_DISABLED' };
    }
    const now = Date.now();
    if (this.circuitBreaker.openUntil > now) {
      return { success: false, error: 'CIRCUIT_OPEN' };
    }

    if (!this.perplexityApiKey) {
      return { success: false, error: 'API_KEY_MISSING' };
    }

    const locationText = this.formatLocationText(context);

    for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await axios.post(
          this.perplexityBaseUrl,
          {
            model: 'sonar',
            messages: [
              { role: 'system', content: this.getSystemPrompt(language) },
              {
                role: 'user',
                content: locationText ? `${message}\n\nLocation context: ${locationText}` : message
              }
            ],
            max_tokens: 900,
            temperature: 0.5
          },
          {
            headers: {
              Authorization: `Bearer ${this.perplexityApiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: this.timeoutMs
          }
        );

        this.circuitBreaker.failures = 0;
        this.circuitBreaker.openUntil = 0;

        const text = response?.data?.choices?.[0]?.message?.content || '';
        if (this.isQueryLengthErrorText(text)) {
          return {
            success: false,
            error: 'QUERY_TOO_LONG'
          };
        }
        return {
          success: Boolean(text),
          response: text,
          tokensUsed: response?.data?.usage?.total_tokens || 0
        };
      } catch (error) {
        this.circuitBreaker.failures += 1;
        if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
          this.circuitBreaker.openUntil = Date.now() + this.circuitBreaker.cooldownMs;
        }
        if (attempt === this.maxRetries) {
          return { success: false, error: this.classifyError(error) };
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
    return { success: false, error: 'MAX_RETRIES_EXCEEDED' };
  }

  async processMessage(userMessage, context = {}) {
    const startedAt = Date.now();
    const contextualMessage = this.resolveContextualMessage(userMessage, context);
    const language = this.resolvePreferredLanguage(context, contextualMessage || userMessage);
    const requestedCrop = this.detectRequestedCrop(contextualMessage || userMessage);

    const perplexityResult = await this.tryPerplexityAPI(contextualMessage, context, language);
    if (perplexityResult.success && this.responseMatchesRequestedCrop(perplexityResult.response, requestedCrop)) {
      return {
        success: true,
        response: perplexityResult.response,
        source: 'perplexity',
        isFallback: false,
        language,
        metadata: {
          model: 'sonar',
          confidence: 0.95,
          tokensUsed: perplexityResult.tokensUsed
        },
        processingTime: Date.now() - startedAt
      };
    }

    let localResult = {
      success: false,
      error: perplexityResult.success ? 'CROP_MISMATCH_PERPLEXITY' : 'LOCAL_DISABLED'
    };
    if (this.featureFlags.localLLM) {
      localResult = await this.localLLM.generateResponse(contextualMessage, { ...context, language });
      if (
        localResult.success &&
        !this.isQueryLengthErrorText(localResult.response) &&
        !this.isGenericGreetingResponse(localResult.response) &&
        this.responseMatchesRequestedCrop(localResult.response, requestedCrop)
      ) {
        return {
          success: true,
          response: localResult.response,
          source: 'local_llm',
          isFallback: true,
          language,
          metadata: {
            model: localResult.model || 'local',
            confidence: localResult.confidence || 0.82,
            fallbackReason: perplexityResult.error
          },
          processingTime: Date.now() - startedAt
        };
      }
      if (localResult.success && this.isQueryLengthErrorText(localResult.response)) {
        localResult = { success: false, error: 'QUERY_TOO_LONG' };
      } else if (localResult.success && this.isGenericGreetingResponse(localResult.response)) {
        localResult = { success: false, error: 'GENERIC_LOCAL_RESPONSE' };
      } else if (localResult.success && !this.responseMatchesRequestedCrop(localResult.response, requestedCrop)) {
        localResult = { success: false, error: 'CROP_MISMATCH_LOCAL' };
      }
    }

    if (!this.featureFlags.ruleEngine) {
      return {
        success: false,
        response: language === 'ta'
          ? 'சேவை தற்போது கிடைக்கவில்லை. பிறகு மீண்டும் முயற்சிக்கவும்.'
          : 'Service is temporarily unavailable. Please try again later.',
        source: 'none',
        isFallback: true,
        language,
        metadata: {
          confidence: 0,
          fallbackReason: localResult.error || perplexityResult.error
        },
        processingTime: Date.now() - startedAt
      };
    }
    let ruleResult = await this.ruleEngine.processMessage(contextualMessage, { ...context, language });
    const looksGeneric = !ruleResult?.response
      || String(ruleResult.response).toLowerCase().includes('ask about crop diseases')
      || String(ruleResult.response).toLowerCase().includes('விவசாய உதவி சாட்பாட்');

    if (looksGeneric && contextualMessage !== String(userMessage || '').trim()) {
      ruleResult = await this.ruleEngine.processMessage(String(userMessage || '').trim(), { ...context, language });
    }
    return {
      success: true,
      response: this.isQueryLengthErrorText(ruleResult.response)
        ? (language === 'ta'
          ? 'உங்கள் கேள்வியை செயலாக்குகிறேன். பயிர் பெயர், இடம், மற்றும் பிரச்சினையை கொடுத்தால் விரிவான ஆலோசனை தருகிறேன்.'
          : 'I can help with agriculture guidance. Share crop name, location, and issue for a detailed answer.')
        : ruleResult.response,
      source: 'rule_engine',
      isFallback: true,
      language,
      metadata: {
        confidence: ruleResult.confidence || 0.65,
        intent: ruleResult.intent || 'general',
        fallbackReason: localResult.error || perplexityResult.error
      },
      processingTime: Date.now() - startedAt
    };
  }

  // Backward-compatible interface used by AgriGPTController and legacy paths.
  async chatWithAI(message, context = {}) {
    const result = await this.processMessage(message, context);
    if (!result?.success) {
      return {
        success: false,
        response: context?.language === 'ta'
          ? 'பதில் உருவாக்க முடியவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.'
          : 'Unable to generate a response right now. Please try again later.',
        provider: 'AgriSmart AI',
        source: result?.source || 'rule_engine',
        isFallback: true,
        fallback: true,
        degradedReason: result?.metadata?.fallbackReason || 'service_unavailable'
      };
    }

    return {
      success: true,
      response: result.response,
      provider: 'AgriSmart AI',
      source: result.source,
      isFallback: Boolean(result.isFallback),
      fallback: Boolean(result.isFallback),
      degradedReason: result.isFallback ? (result.metadata?.fallbackReason || 'fallback_used') : null,
      context: {
        confidence: result.metadata?.confidence,
        intent: result.metadata?.intent || null
      }
    };
  }

  async health() {
    const perplexityCheck = await this.tryPerplexityAPI('Ping for health check', {}, 'en');
    const localCheck = await this.localLLM.generateResponse('Health check', { language: 'en' });
    return {
      perplexity: {
        status: perplexityCheck.success ? 'healthy' : 'unhealthy',
        error: perplexityCheck.success ? null : perplexityCheck.error
      },
      localLLM: {
        status: localCheck.success ? 'healthy' : 'unhealthy',
        model: localCheck.model || null
      },
      ruleEngine: {
        status: 'healthy'
      }
    };
  }
}

module.exports = new AgriAIService();
