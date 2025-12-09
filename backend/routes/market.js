const express = require('express');
const router = express.Router();
const MarketController = require('../controllers/MarketController');
const { authenticateToken } = require('../middleware/auth');

// Public routes - specific routes must come before parameterized routes
router.get('/prices', MarketController.getLatest); // Real-time prices endpoint
router.get('/latest', MarketController.getLatest); // Alias
router.get('/trends', MarketController.getTrends); // Price trends with prediction
router.get('/commodities', MarketController.getCommodities); // Get list of commodities
router.get('/:id', MarketController.getById); // Must be last

// Protected routes
router.post('/', authenticateToken, MarketController.create);

module.exports = router;
