const Language = require('../models/Language');
const Translation = require('../models/Translation');
const cache = require('../utils/cache').getInstance();

class LanguageMiddleware {
  // Detect language from request
  static detectLanguage(req, res, next) {
    // Priority: 1. Query param 2. Header 3. User preference 4. Default
    const langParam = req.query.lang || req.query.language;
    const acceptLanguage = req.headers['accept-language'];
    const userLanguage = req.user?.preferences?.language || req.user?.language;
    
    let language = 'en'; // Use lowercase for consistency
    
    if (langParam && LanguageMiddleware.isValidLanguage(langParam)) {
      language = langParam.toLowerCase();
    } else if (userLanguage && LanguageMiddleware.isValidLanguage(userLanguage)) {
      language = userLanguage.toLowerCase();
    } else if (acceptLanguage) {
      const preferred = LanguageMiddleware.parseAcceptLanguage(acceptLanguage);
      if (preferred && LanguageMiddleware.isValidLanguage(preferred)) {
        language = preferred.toLowerCase();
      }
    }
    
    req.language = language; // Store as lowercase
    req.locale = language; // Alias for consistency
    
    next();
  }
  
  // Parse Accept-Language header
  static parseAcceptLanguage(header) {
    const languages = header.split(',');
    const preferred = languages[0].split(';')[0].trim();
    return preferred.substring(0, 2).toLowerCase();
  }
  
  // Validate language code
  static isValidLanguage(code) {
    const validCodes = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa'];
    return validCodes.includes(code.toLowerCase());
  }
  
  // Get all supported languages
  static async getSupportedLanguages(req, res) {
    try {
      const cacheKey = 'supported_languages';
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached)
        });
      }
      
      const languages = await Language.find({ isActive: true })
        .select('code name direction flag locale countryCode')
        .sort('name.en');
      
      const formatted = languages.map(lang => ({
        code: lang.code.toLowerCase(),
        name: lang.name,
        direction: lang.direction,
        flag: lang.flag,
        locale: lang.locale,
        countryCode: lang.countryCode
      }));
      
      // Cache for 24 hours
      await cache.setex(cacheKey, 86400, JSON.stringify(formatted));
      
      res.json({
        success: true,
        data: formatted
      });
    } catch (error) {
      logger.error('Get languages error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch languages'
      });
    }
  }
  
  // Translate text
  static async translate(key, language = 'en', variables = {}) {
    try {
      const lang = language.toLowerCase();
      const cacheKey = `translation:${key}:${lang}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        let text = JSON.parse(cached);
        return this.replaceVariables(text, variables);
      }
      
      const translation = await Translation.findOne({ key });
      
      if (!translation) {
        return key; // Return key if no translation found
      }
      
      const text = translation.getTranslation(lang);
      
      // Cache for 1 hour
      await cache.setex(cacheKey, 3600, JSON.stringify(text));
      
      return this.replaceVariables(text, variables);
    } catch (error) {
      logger.error('Translation error:', error);
      return key;
    }
  }
  
  // Replace variables in translation
  static replaceVariables(text, variables) {
    if (!text || typeof text !== 'string') return text;
    
    Object.keys(variables).forEach(key => {
      const placeholder = `{${key}}`;
      const regex = new RegExp(placeholder, 'g');
      text = text.replace(regex, variables[key]);
    });
    
    return text;
  }
  
  // Batch translate multiple keys
  static async batchTranslate(keys, language = 'en') {
    try {
      const translations = await Translation.find({ 
        key: { $in: keys } 
      });
      
      const result = {};
      translations.forEach(t => {
        result[t.key] = t.getTranslation(language.toLowerCase());
      });
      
      // Add missing keys
      keys.forEach(key => {
        if (!result[key]) {
          result[key] = key;
        }
      });
      
      return result;
    } catch (error) {
      logger.error('Batch translation error:', error);
      return keys.reduce((acc, key) => {
        acc[key] = key;
        return acc;
      }, {});
    }
  }
  
  // Get translations for module
  static async getModuleTranslations(module, language = 'en') {
    try {
      const lang = language.toLowerCase();
      const cacheKey = `module_translations:${module}:${lang}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      const translations = await Translation.find({ module });
      
      const result = {};
      translations.forEach(t => {
        result[t.key] = t.getTranslation(lang);
      });
      
      // Cache for 30 minutes
      await cache.setex(cacheKey, 1800, JSON.stringify(result));
      
      return result;
    } catch (error) {
      logger.error('Module translations error:', error);
      return {};
    }
  }
}

module.exports = LanguageMiddleware;

