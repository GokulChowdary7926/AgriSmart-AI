const express = require('express');
const router = express.Router();
const CropController = require('../controllers/CropController');
const { authenticateToken } = require('../middleware/auth');
const cropRecommendationEngine = require('../services/CropRecommendationEngine');
const logger = require('../utils/logger');
const { serverError, ok } = require('../utils/httpResponses');

function parsePositiveInt(value, defaultValue, { min = 1, max = 100 } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

router.get('/recommend', CropController.recommend);
router.post('/recommend', CropController.recommend);
router.get('/recommend-by-location', CropController.recommend);
router.get('/market-prices', async (req, res) => {
  try {
    const { state, commodity, limit = 20 } = req.query;
    const safeLimit = parsePositiveInt(limit, 20, { min: 1, max: 100 });
    
    const prices = cropRecommendationEngine.getMarketPrices(state);
    
    let filteredPrices = prices;
    if (commodity) {
      filteredPrices = prices.filter(p => 
        p.commodity.toLowerCase().includes(commodity.toLowerCase())
      );
    }
    
    return ok(
      res,
      filteredPrices.slice(0, safeLimit),
      {
        source: 'AgriSmart AI',
        isFallback: false,
        prices: filteredPrices.slice(0, safeLimit),
        total: filteredPrices.length,
        message: `Loaded ${filteredPrices.length} market prices`
      }
    );
  } catch (error) {
    logger.error('Error fetching market prices:', error);
    return serverError(res, error.message);
  }
});
router.get('/diseases', async (req, res) => {
  try {
    const { crop, state, limit = 10 } = req.query;
    const safeLimit = parsePositiveInt(limit, 10, { min: 1, max: 50 });
    
    const diseases = cropRecommendationEngine.getCommonDiseases(state, crop);
    
    return ok(
      res,
      diseases.slice(0, safeLimit),
      {
        source: 'AgriSmart AI',
        isFallback: false,
        diseases: diseases.slice(0, safeLimit),
        total: diseases.length,
        message: `Found ${diseases.length} diseases`
      }
    );
  } catch (error) {
    logger.error('Error fetching diseases:', error);
    return serverError(res, error.message);
  }
});
router.get('/season/:season', CropController.getBySeason);
router.get('/analytics', authenticateToken, CropController.getAnalytics);
router.get('/', CropController.getAll);
router.get('/:id', CropController.getById);

router.post('/', authenticateToken, CropController.create);
router.put('/:id', authenticateToken, CropController.update);
router.delete('/:id', authenticateToken, CropController.delete);

module.exports = router;
