const axios = require('axios');
const crypto = require('crypto');
const TranslationCache = require('../models/TranslationCache');

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_DEPTH = 10;
const REQUEST_TIMEOUT_MS = 6000;

const SKIP_KEY_PATTERN = /(^_|id$|Id$|ID$|url$|Url$|URL$|timestamp$|createdAt$|updatedAt$|date$|Date$|lat$|lng$|latitude$|longitude$|coordinates$)/;
const SKIP_TEXT_PATTERNS = [
  /^\s*$/,
  /^\d+$/,
  /^\d+\.\d+$/,
  /^[a-f0-9]{24}$/i,
  /^(https?:\/\/|www\.)/i,
  /(₹|\$|€|£|¥)/,
  /^\d+\s*(kg|g|mg|ml|l|mm|cm|m|km|ha|acre|acres|hectare|hectares|%|°c|°f)$/i
];

class FreeTranslationService {
  constructor() {
    this.cache = new Map();
    this.inFlight = new Map();
    this.queue = [];
    this.activeWorkers = 0;
    this.maxWorkers = Number.parseInt(process.env.TRANSLATION_MAX_WORKERS || '3', 10);
    this.supportedLanguages = new Set(['en', 'ta']);
    this.enabled = process.env.ENABLE_AUTO_TRANSLATION !== 'false';
    this.apiStats = {
      mymemory: { ok: 0, fail: 0 },
      libre: { ok: 0, fail: 0 },
      lingva: { ok: 0, fail: 0 }
    };
    this.memoryStats = {
      hit: 0,
      miss: 0,
      persistentHit: 0,
      translated: 0
    };
    setInterval(() => this.pruneCache(), 60 * 60 * 1000).unref();
  }

  buildCacheKey(text, targetLang, sourceLang = 'en') {
    const digest = crypto
      .createHash('sha1')
      .update(`${sourceLang}:${targetLang}:${text}`)
      .digest('hex');
    return `${targetLang}:${digest}`;
  }

  normalizeLang(code) {
    if (!code || typeof code !== 'string') return 'en';
    const normalized = code.toLowerCase().split('-')[0];
    return this.supportedLanguages.has(normalized) ? normalized : 'en';
  }

  shouldSkipText(text) {
    return SKIP_TEXT_PATTERNS.some((pattern) => pattern.test(text));
  }

  pruneCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.ts > CACHE_TTL_MS) this.cache.delete(key);
    }
  }

  async translateWithMyMemory(text, targetLang, sourceLang = 'en') {
    const url = 'https://api.mymemory.translated.net/get';
    const response = await axios.get(url, {
      params: { q: text, langpair: `${sourceLang}|${targetLang}` },
      timeout: REQUEST_TIMEOUT_MS
    });
    return response?.data?.responseData?.translatedText || null;
  }

  async translateWithLibreTranslate(text, targetLang, sourceLang = 'en') {
    const response = await axios.post('https://libretranslate.com/translate', {
      q: text,
      source: sourceLang,
      target: targetLang,
      format: 'text'
    }, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' }
    });
    return response?.data?.translatedText || null;
  }

  async translateWithLingva(text, targetLang, sourceLang = 'en') {
    const url = `https://lingva.ml/api/v1/${sourceLang}/${targetLang}/${encodeURIComponent(text)}`;
    const response = await axios.get(url, { timeout: REQUEST_TIMEOUT_MS });
    return response?.data?.translation || null;
  }

  async tryMultipleApis(text, targetLang, sourceLang = 'en') {
    try {
      const v = await this.translateWithMyMemory(text, targetLang, sourceLang);
      if (v) {
        this.apiStats.mymemory.ok += 1;
        return { text: v, provider: 'mymemory' };
      }
      this.apiStats.mymemory.fail += 1;
    } catch (error) {
      this.apiStats.mymemory.fail += 1;
    }

    try {
      const v = await this.translateWithLibreTranslate(text, targetLang, sourceLang);
      if (v) {
        this.apiStats.libre.ok += 1;
        return { text: v, provider: 'libre' };
      }
      this.apiStats.libre.fail += 1;
    } catch (error) {
      this.apiStats.libre.fail += 1;
    }

    try {
      const v = await this.translateWithLingva(text, targetLang, sourceLang);
      if (v) {
        this.apiStats.lingva.ok += 1;
        return { text: v, provider: 'lingva' };
      }
      this.apiStats.lingva.fail += 1;
    } catch (error) {
      this.apiStats.lingva.fail += 1;
    }

    return null;
  }

  async loadFromPersistentCache(cacheKey) {
    try {
      const doc = await TranslationCache.findOne({ cacheKey }).lean();
      return doc?.translatedText || null;
    } catch (error) {
      return null;
    }
  }

  async saveToPersistentCache({ cacheKey, sourceText, sourceLang, targetLang, translatedText, provider }) {
    try {
      await TranslationCache.updateOne(
        { cacheKey },
        {
          $set: {
            sourceText,
            sourceLang,
            targetLang,
            translatedText,
            provider,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    } catch (error) {
      // best-effort only
    }
  }

  runQueuedTask(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.drainQueue();
    });
  }

  async drainQueue() {
    while (this.activeWorkers < this.maxWorkers && this.queue.length > 0) {
      const queued = this.queue.shift();
      this.activeWorkers += 1;
      try {
        const result = await queued.task();
        queued.resolve(result);
      } catch (error) {
        queued.reject(error);
      } finally {
        this.activeWorkers -= 1;
      }
    }
  }

  async translateText(text, targetLang, sourceLang = 'en') {
    const resolvedLang = this.normalizeLang(targetLang);
    if (!this.enabled || resolvedLang === 'en' || typeof text !== 'string' || this.shouldSkipText(text)) {
      return text;
    }

    this.pruneCache();
    const cacheKey = this.buildCacheKey(text, resolvedLang, sourceLang);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.ts <= CACHE_TTL_MS) {
      this.memoryStats.hit += 1;
      return cached.value;
    }
    this.memoryStats.miss += 1;

    const persistent = await this.loadFromPersistentCache(cacheKey);
    if (persistent) {
      this.memoryStats.persistentHit += 1;
      this.cache.set(cacheKey, { value: persistent, ts: Date.now() });
      return persistent;
    }

    if (this.inFlight.has(cacheKey)) {
      return this.inFlight.get(cacheKey);
    }

    const promise = this.runQueuedTask(async () => {
      const translated = await this.tryMultipleApis(text, resolvedLang, sourceLang);
      const value = translated?.text || text;
      this.cache.set(cacheKey, { value, ts: Date.now() });
      if (translated?.text) {
        this.memoryStats.translated += 1;
        await this.saveToPersistentCache({
          cacheKey,
          sourceText: text,
          sourceLang,
          targetLang: resolvedLang,
          translatedText: translated.text,
          provider: translated.provider
        });
      }
      return value;
    }).finally(() => {
      this.inFlight.delete(cacheKey);
    });

    this.inFlight.set(cacheKey, promise);
    return promise;
  }

  async translateObject(value, targetLang, depth = 0, parentKey = '') {
    if (depth > MAX_DEPTH) return value;
    if (value === null || value === undefined) return value;

    if (typeof value === 'string') {
      if (SKIP_KEY_PATTERN.test(parentKey)) return value;
      return this.translateText(value, targetLang);
    }

    if (Array.isArray(value)) {
      const translatedItems = [];
      for (const item of value) {
        translatedItems.push(await this.translateObject(item, targetLang, depth + 1, parentKey));
      }
      return translatedItems;
    }

    if (typeof value === 'object') {
      const translated = {};
      for (const [key, nested] of Object.entries(value)) {
        translated[key] = await this.translateObject(nested, targetLang, depth + 1, key);
      }
      return translated;
    }

    return value;
  }

  async translateBatch(texts, targetLang, sourceLang = 'en') {
    const normalizedLang = this.normalizeLang(targetLang);
    const input = Array.isArray(texts) ? texts : [];
    const output = [];
    for (const text of input) {
      if (typeof text !== 'string') {
        output.push(text);
        continue;
      }
      const translated = await this.translateText(text, normalizedLang, sourceLang);
      output.push(translated);
    }
    return output;
  }

  getStatus() {
    return {
      enabled: this.enabled,
      mode: 'free-api-fallback',
      cacheSize: this.cache.size,
      queueSize: this.queue.length,
      activeWorkers: this.activeWorkers,
      maxWorkers: this.maxWorkers,
      memoryStats: this.memoryStats,
      supportedLanguages: Array.from(this.supportedLanguages),
      apiStats: this.apiStats
    };
  }

  async getCacheInsights(limit = 20) {
    try {
      const safeLimit = Math.max(1, Math.min(Number.parseInt(limit, 10) || 20, 100));
      const recent = await TranslationCache.find({})
        .sort({ updatedAt: -1 })
        .limit(safeLimit)
        .select('sourceText sourceLang targetLang translatedText provider updatedAt')
        .lean();

      return {
        status: this.getStatus(),
        recentTranslations: recent
      };
    } catch (error) {
      return {
        status: this.getStatus(),
        recentTranslations: []
      };
    }
  }
}

module.exports = new FreeTranslationService();

