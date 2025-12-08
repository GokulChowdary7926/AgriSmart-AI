const Language = require('../models/Language');
const Translation = require('../models/Translation');
const LanguageMiddleware = require('../middleware/language');
const cache = require('../utils/cache').getInstance();
const logger = require('../utils/logger');

class LanguageController {
  // Initialize languages (admin only)
  static async initializeLanguages(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only admins can initialize languages'
        });
      }
      
      await Language.initializeLanguages();
      await Translation.initializeCommonTranslations();
      
      // Clear cache
      await cache.del('supported_languages');
      
      res.json({
        success: true,
        message: 'Languages and translations initialized successfully'
      });
    } catch (error) {
      logger.error('Initialize languages error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize languages'
      });
    }
  }
  
  // Get all translations (paginated)
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
      
      const skip = (page - 1) * limit;
      
      const translations = await Translation.find(query)
        .sort({ module: 1, key: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v');
      
      const total = await Translation.countDocuments(query);
      
      res.json({
        success: true,
        data: translations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Get translations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch translations'
      });
    }
  }
  
  // Create or update translation
  static async updateTranslation(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only admins can update translations'
        });
      }
      
      const { key, module, category, translations, description } = req.body;
      
      if (!key || !module || !translations || !translations.en) {
        return res.status(400).json({
          success: false,
          error: 'Key, module, and English translation are required'
        });
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
      
      // Clear relevant cache
      await cache.delPattern(`translation:${key}:*`);
      await cache.delPattern(`module_translations:${module}:*`);
      
      res.json({
        success: true,
        message: 'Translation updated successfully',
        data: translation
      });
    } catch (error) {
      logger.error('Update translation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update translation'
      });
    }
  }
  
  // Delete translation
  static async deleteTranslation(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only admins can delete translations'
        });
      }
      
      const { id } = req.params;
      
      const translation = await Translation.findById(id);
      
      if (!translation) {
        return res.status(404).json({
          success: false,
          error: 'Translation not found'
        });
      }
      
      if (translation.isSystem) {
        return res.status(400).json({
          success: false,
          error: 'System translations cannot be deleted'
        });
      }
      
      await translation.deleteOne();
      
      // Clear cache
      await cache.delPattern(`translation:${translation.key}:*`);
      await cache.delPattern(`module_translations:${translation.module}:*`);
      
      res.json({
        success: true,
        message: 'Translation deleted successfully'
      });
    } catch (error) {
      logger.error('Delete translation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete translation'
      });
    }
  }
  
  // Get missing translations
  static async getMissingTranslations(req, res) {
    try {
      const { language } = req.query;
      
      if (!language || !LanguageMiddleware.isValidLanguage(language)) {
        return res.status(400).json({
          success: false,
          error: 'Valid language code is required'
        });
      }
      
      const translations = await Translation.find({
        $or: [
          { [`translations.${language.toLowerCase()}`]: { $exists: false } },
          { [`translations.${language.toLowerCase()}`]: '' },
          { [`translations.${language.toLowerCase()}`]: null }
        ]
      }).select('key module category translations.en');
      
      res.json({
        success: true,
        count: translations.length,
        language,
        data: translations
      });
    } catch (error) {
      logger.error('Get missing translations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch missing translations'
      });
    }
  }
  
  // Get module translations for frontend
  static async getModuleTranslations(req, res) {
    try {
      const { module } = req.params;
      const language = req.language || 'EN';
      
      const translations = await LanguageMiddleware.getModuleTranslations(module, language);
      
      res.json({
        success: true,
        module,
        language: language.toLowerCase(),
        data: translations
      });
    } catch (error) {
      logger.error('Get module translations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch module translations'
      });
    }
  }
}

module.exports = LanguageController;
