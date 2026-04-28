const logger = require('../utils/logger');
const freeTranslationService = require('../services/FreeTranslationService');

class AutoTranslateMiddleware {
  constructor() {
    this.enabled = process.env.ENABLE_AUTO_TRANSLATION !== 'false';
    this.translationTimeoutMs = Number.parseInt(process.env.AUTO_TRANSLATE_TIMEOUT_MS || '2500', 10);
  }

  normalizeLang(langCode) {
    return freeTranslationService.normalizeLang(langCode);
  }

  getStatus() {
    return freeTranslationService.getStatus();
  }

  middleware() {
    return async (req, res, next) => {
      const targetLang = this.normalizeLang(req.language || req.headers['x-app-language'] || req.headers['accept-language']);
      res.setHeader('X-Translation-Target-Language', targetLang);
      res.setHeader('X-Translation-Enabled', String(this.enabled));
      res.setHeader('X-Translation-Client-Ready', 'true');
      res.setHeader('X-Translation-Provider', 'free-fallback');

      if (!this.enabled || targetLang === 'en') {
        return next();
      }
      const originalJson = res.json.bind(res);

      res.json = async (payload) => {
        try {
          const translatedPayload = await Promise.race([
            freeTranslationService.translateObject(payload, targetLang),
            new Promise((resolve) => {
              setTimeout(() => resolve(payload), this.translationTimeoutMs);
            })
          ]);
          res.setHeader('Content-Language', targetLang);
          res.setHeader('X-Translation-Applied', 'true');
          return originalJson(translatedPayload);
        } catch (error) {
          logger.warn('Auto-translation middleware error; sending original payload', error.message);
          res.setHeader('X-Translation-Applied', 'false');
          return originalJson(payload);
        }
      };

      next();
    };
  }
}

module.exports = new AutoTranslateMiddleware();

