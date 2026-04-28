const axios = require('axios');

class LocalLLMService {
  constructor() {
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.ollamaModel = process.env.LOCAL_LLM_MODEL || 'llama2';
    this.localTimeoutMs = Number(process.env.LOCAL_LLM_TIMEOUT || 20000);
  }

  formatPrompt(message, context = {}) {
    const location = context?.location || {};
    const locationText = [location.state, location.district].filter(Boolean).join(', ');
    return [
      'You are an agriculture expert for Indian farmers.',
      'Give practical steps, dosage, timing, and safety.',
      locationText ? `Location: ${locationText}` : '',
      `Question: ${message}`
    ]
      .filter(Boolean)
      .join('\n');
  }

  async tryOllama(prompt) {
    const response = await axios.post(
      `${this.ollamaHost}/api/generate`,
      {
        model: this.ollamaModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.6,
          top_p: 0.9,
          num_predict: 600
        }
      },
      { timeout: this.localTimeoutMs }
    );
    const text = response?.data?.response || '';
    if (!text) return { success: false, error: 'OLLAMA_EMPTY_RESPONSE' };
    const normalizedText = String(text).toLowerCase();
    if (normalizedText.includes('query length limit exceeded') || normalizedText.includes('max allowed query')) {
      return { success: false, error: 'QUERY_TOO_LONG' };
    }
    return {
      success: true,
      response: text.trim(),
      model: `ollama/${this.ollamaModel}`,
      confidence: 0.85
    };
  }

  async tryTransformers(prompt) {
    const response = await axios.post(
      'http://localhost:3000/generate',
      {
        text: prompt,
        max_length: 600
      },
      { timeout: this.localTimeoutMs }
    );
    const text = response?.data?.generated_text || response?.data?.text || '';
    if (!text) return { success: false, error: 'TRANSFORMERS_EMPTY_RESPONSE' };
    const normalizedText = String(text).toLowerCase();
    if (normalizedText.includes('query length limit exceeded') || normalizedText.includes('max allowed query')) {
      return { success: false, error: 'QUERY_TOO_LONG' };
    }
    return {
      success: true,
      response: String(text).trim(),
      model: 'transformers.js',
      confidence: 0.75
    };
  }

  async generateResponse(message, context = {}) {
    const prompt = this.formatPrompt(message, context);
    try {
      return await this.tryOllama(prompt);
    } catch (_) {
      // Ignore and fallback to transformers endpoint.
    }

    try {
      return await this.tryTransformers(prompt);
    } catch (error) {
      return {
        success: false,
        error: error?.message || 'LOCAL_LLM_UNAVAILABLE'
      };
    }
  }
}

module.exports = LocalLLMService;
