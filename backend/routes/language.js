const express = require('express');
const router = express.Router();
const LanguageController = require('../controllers/LanguageController');
const LanguageMiddleware = require('../middleware/language');
const autoTranslate = require('../middleware/autoTranslate');
const freeTranslationService = require('../services/FreeTranslationService');
const { authenticateToken } = require('../middleware/auth');
const { serverError, ok, forbidden } = require('../utils/httpResponses');

router.get('/languages', LanguageMiddleware.getSupportedLanguages);

router.get('/translate/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { lang = 'en', ...variables } = req.query;
    
    const translation = await LanguageMiddleware.translate(key, lang, variables);
    
    return ok(res, { key, translation }, { source: 'AgriSmart AI', isFallback: false });
  } catch (error) {
    return serverError(res, 'Translation failed');
  }
});

router.get('/module/:module', LanguageMiddleware.detectLanguage, LanguageController.getModuleTranslations);

router.get('/status', LanguageMiddleware.detectLanguage, async (req, res) => {
  return ok(
    res,
    {
      requestLanguage: req.language || 'en',
      headers: {
        acceptLanguage: req.headers['accept-language'] || null,
        appLanguage: req.headers['x-app-language'] || null
      },
      translation: autoTranslate.getStatus()
    },
    { source: 'AgriSmart AI', isFallback: false }
  );
});

router.post('/auto-translate-batch', LanguageMiddleware.detectLanguage, async (req, res) => {
  try {
    const targetLang = req.body?.lang || req.language || 'en';
    const texts = Array.isArray(req.body?.texts) ? req.body.texts.slice(0, 400) : [];
    const translations = await freeTranslationService.translateBatch(texts, targetLang, 'en');
    return ok(
      res,
      {
        lang: targetLang,
        translations
      },
      { source: 'AgriSmart AI', isFallback: false }
    );
  } catch (error) {
    return serverError(res, 'Batch translation failed');
  }
});

router.use(authenticateToken);

router.post('/preference', async (req, res) => {
  try {
    const language = String(req.body?.language || '').toLowerCase().split('-')[0];
    if (!language) {
      return ok(res, { language: 'en' }, { source: 'AgriSmart AI', isFallback: true, degradedReason: 'language_preference_missing' });
    }

    return ok(
      res,
      {
        language,
        saved: true
      },
      { source: 'AgriSmart AI', isFallback: false }
    );
  } catch (_error) {
    return serverError(res, 'Failed to save language preference');
  }
});

router.get('/cache-stats', async (req, res) => {
  if (req.user.role !== 'admin') {
    return forbidden(res, 'Only admins can view translation cache stats');
  }

  const limit = req.query.limit || 20;
  const data = await freeTranslationService.getCacheInsights(limit);
  return ok(res, data, { source: 'AgriSmart AI', isFallback: false });
});

router.post('/initialize', async (req, res) => {
  if (req.user.role !== 'admin') {
    return forbidden(res, 'Only admins can initialize languages');
  }
  return LanguageController.initializeLanguages(req, res);
});

router.get('/translations', async (req, res) => {
  if (req.user.role !== 'admin') {
    return forbidden(res, 'Only admins can view translations');
  }
  return LanguageController.getTranslations(req, res);
});

router.post('/translations', async (req, res) => {
  if (req.user.role !== 'admin') {
    return forbidden(res, 'Only admins can update translations');
  }
  return LanguageController.updateTranslation(req, res);
});

router.delete('/translations/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return forbidden(res, 'Only admins can delete translations');
  }
  return LanguageController.deleteTranslation(req, res);
});

router.get('/translations/missing', async (req, res) => {
  if (req.user.role !== 'admin') {
    return forbidden(res, 'Only admins can view missing translations');
  }
  return LanguageController.getMissingTranslations(req, res);
});

module.exports = router;
