const express = require('express');
const router = express.Router();
const CropController = require('../controllers/CropController');
const { authenticateToken } = require('../middleware/auth');
const cropRecommendationEngine = require('../services/CropRecommendationEngine');
const logger = require('../utils/logger');

// Public routes
// IMPORTANT: Specific routes must come before parameterized routes (/:id)
router.get('/recommend', CropController.recommend); // GET with query params
router.post('/recommend', CropController.recommend); // POST with body data (for auto-detection)
router.get('/recommend-by-location', CropController.recommend); // Alias for location-based
router.get('/market-prices', async (req, res) => {
  try {
    const { state, commodity, limit = 20 } = req.query;
    
    const prices = cropRecommendationEngine.getMarketPrices(state);
    
    let filteredPrices = prices;
    if (commodity) {
      filteredPrices = prices.filter(p => 
        p.commodity.toLowerCase().includes(commodity.toLowerCase())
      );
    }
    
    res.json({
      success: true,
      prices: filteredPrices.slice(0, parseInt(limit)),
      total: filteredPrices.length,
      message: `Loaded ${filteredPrices.length} market prices`
    });
  } catch (error) {
    logger.error('Error fetching market prices:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
router.get('/diseases', async (req, res) => {
  try {
    const { crop, state, limit = 10 } = req.query;
    
    const diseases = cropRecommendationEngine.getCommonDiseases(state, crop);
    
    res.json({
      success: true,
      diseases: diseases.slice(0, parseInt(limit)),
      total: diseases.length,
      message: `Found ${diseases.length} diseases`
    });
  } catch (error) {
    logger.error('Error fetching diseases:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
router.get('/season/:season', CropController.getBySeason);
router.get('/analytics', authenticateToken, CropController.getAnalytics);
router.get('/', CropController.getAll);
router.get('/:id', CropController.getById); // This must be last to avoid matching /recommend

// Protected routes (require authentication)
router.post('/', authenticateToken, CropController.create);
router.put('/:id', authenticateToken, CropController.update);
router.delete('/:id', authenticateToken, CropController.delete);

module.exports = router;
