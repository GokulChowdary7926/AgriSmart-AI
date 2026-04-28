const Language = require('../models/Language');
const Translation = require('../models/Translation');
const LanguageMiddleware = require('../middleware/language');
const cache = require('../utils/cache').getInstance();
const logger = require('../utils/logger');
const { badRequest, notFound, serverError, ok, forbidden } = require('../utils/httpResponses');

class LanguageController {
  static success(res, data, { source = 'AgriSmart AI', isFallback = false, degradedReason = null, extra = {} } = {}) {
    return ok(res, data, {
      source,
      isFallback,
      ...(degradedReason ? { degradedReason } : {}),
      ...extra
    });
  }

  static parsePositiveInt(value, defaultValue, { min = 1, max = 200 } = {}) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return defaultValue;
    return Math.max(min, Math.min(max, parsed));
  }

  static async initializeLanguages(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return forbidden(res, 'Only admins can initialize languages');
      }
      
      await Language.initializeLanguages();
      await Translation.initializeCommonTranslations();
      
      await cache.del('supported_languages');
      
      return LanguageController.success(
        res,
        { message: 'Languages and translations initialized successfully' },
        { extra: { message: 'Languages and translations initialized successfully' } }
      );
    } catch (error) {
      logger.error('Initialize languages error:', error);
      return serverError(res, 'Failed to initialize languages');
    }
  }
  
  static async getTranslations(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        module, 
        category, 
        search 
      } = req.query;
      
      const query = {};
      
      if (module) query.module = module;
      if (category) query.category = category;
      if (search) {
        query.$or = [
          { key: { $regex: search, $options: 'i' } },
          { 'translations.en': { $regex: search, $options: 'i' } }
        ];
      }
      
      const safePage = this.parsePositiveInt(page, 1, { min: 1, max: 100000 });
      const safeLimit = this.parsePositiveInt(limit, 50, { min: 1, max: 200 });
      const skip = (safePage - 1) * safeLimit;
      
      const translations = await Translation.find(query)
        .sort({ module: 1, key: 1 })
        .skip(skip)
        .limit(safeLimit)
        .select('-__v');
      
      const total = await Translation.countDocuments(query);
      
      return LanguageController.success(
        res,
        translations,
        {
          extra: {
            pagination: {
              page: safePage,
              limit: safeLimit,
              total,
              pages: Math.ceil(total / safeLimit)
            }
          }
        }
      );
    } catch (error) {
      logger.error('Get translations error:', error);
      return serverError(res, 'Failed to fetch translations');
    }
  }
  
  static async updateTranslation(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return forbidden(res, 'Only admins can update translations');
      }
      
      const { key, module, category, translations, description } = req.body;
      
      if (!key || !module || !translations || !translations.en) {
        return badRequest(res, 'Key, module, and English translation are required');
      }
      
      const updateData = {
        key,
        module,
        category,
        translations,
        description,
        lastTranslatedAt: new Date(),
        translator: req.user._id
      };
      
      const translation = await Translation.findOneAndUpdate(
        { key, module },
        updateData,
        { upsert: true, new: true, runValidators: true }
      );
      
      await cache.delPattern(`translation:${key}:*`);
      await cache.delPattern(`module_translations:${module}:*`);
      
      return LanguageController.success(
        res,
        translation,
        {
          extra: {
            message: 'Translation updated successfully'
          }
        }
      );
    } catch (error) {
      logger.error('Update translation error:', error);
      return serverError(res, 'Failed to update translation');
    }
  }
  
  static async deleteTranslation(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return forbidden(res, 'Only admins can delete translations');
      }
      
      const { id } = req.params;
      
      const translation = await Translation.findById(id);
      
      if (!translation) {
        return notFound(res, 'Translation not found');
      }
      
      if (translation.isSystem) {
        return badRequest(res, 'System translations cannot be deleted');
      }
      
      await translation.deleteOne();
      
      await cache.delPattern(`translation:${translation.key}:*`);
      await cache.delPattern(`module_translations:${translation.module}:*`);
      
      return LanguageController.success(
        res,
        { message: 'Translation deleted successfully' },
        { extra: { message: 'Translation deleted successfully' } }
      );
    } catch (error) {
      logger.error('Delete translation error:', error);
      return serverError(res, 'Failed to delete translation');
    }
  }
  
  static async getMissingTranslations(req, res) {
    try {
      const { language } = req.query;
      
      if (!language || !LanguageMiddleware.isValidLanguage(language)) {
        return badRequest(res, 'Valid language code is required');
      }
      
      const translations = await Translation.find({
        $or: [
          { [`translations.${language.toLowerCase()}`]: { $exists: false } },
          { [`translations.${language.toLowerCase()}`]: '' },
          { [`translations.${language.toLowerCase()}`]: null }
        ]
      }).select('key module category translations.en');
      
      return LanguageController.success(
        res,
        translations,
        {
          extra: {
            count: translations.length,
            language
          }
        }
      );
    } catch (error) {
      logger.error('Get missing translations error:', error);
      return serverError(res, 'Failed to fetch missing translations');
    }
  }
  
  static async getModuleTranslations(req, res) {
    try {
      const { module } = req.params;
      const language = req.language || 'EN';
      
      const translations = await LanguageMiddleware.getModuleTranslations(module, language);
      
      return LanguageController.success(
        res,
        translations,
        {
          extra: {
            module,
            language: language.toLowerCase()
          }
        }
      );
    } catch (error) {
      logger.error('Get module translations error:', error);
      return serverError(res, 'Failed to fetch module translations');
    }
  }
}

const { bindStaticMethods } = require('../utils/bindControllerMethods');
module.exports = bindStaticMethods(LanguageController);
