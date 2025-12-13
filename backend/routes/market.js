const express = require('express');
const router = express.Router();
const MarketController = require('../controllers/MarketController');
const { authenticateToken } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache');

router.get('/prices', cacheMiddleware(300), MarketController.getLatest); // Real-time prices endpoint
router.get('/latest', cacheMiddleware(300), MarketController.getLatest); // Alias
router.get('/trends', cacheMiddleware(600), MarketController.getTrends); // Price trends with prediction (10 min cache)
router.get('/commodities', MarketController.getCommodities); // Get list of commodities
router.get('/:id', MarketController.getById); // Must be last

router.post('/', authenticateToken, MarketController.create);

module.exports = router;
