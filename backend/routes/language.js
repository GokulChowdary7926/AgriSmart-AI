const express = require('express');
const router = express.Router();
const LanguageController = require('../controllers/LanguageController');
const LanguageMiddleware = require('../middleware/language');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.get('/languages', LanguageMiddleware.getSupportedLanguages);

router.get('/translate/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { lang = 'EN', ...variables } = req.query;
    
    const translation = await LanguageMiddleware.translate(key, lang, variables);
    
    res.json({
      success: true,
      data: { key, translation }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Translation failed'
    });
  }
});

// Get module translations (public)
router.get('/module/:module', LanguageMiddleware.detectLanguage, LanguageController.getModuleTranslations);

// Protected routes
router.use(authenticateToken);

// Admin only routes
router.post('/initialize', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Only admins can initialize languages'
    });
  }
  return LanguageController.initializeLanguages(req, res);
});

router.get('/translations', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Only admins can view translations'
    });
  }
  return LanguageController.getTranslations(req, res);
});

router.post('/translations', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Only admins can update translations'
    });
  }
  return LanguageController.updateTranslation(req, res);
});

router.delete('/translations/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Only admins can delete translations'
    });
  }
  return LanguageController.deleteTranslation(req, res);
});

router.get('/translations/missing', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Only admins can view missing translations'
    });
  }
  return LanguageController.getMissingTranslations(req, res);
});

module.exports = router;
