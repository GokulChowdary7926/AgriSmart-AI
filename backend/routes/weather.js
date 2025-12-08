const express = require('express');
const router = express.Router();
const WeatherController = require('../controllers/WeatherController');

// Get current weather
router.get('/current', WeatherController.getCurrent);

// Get weather forecast
router.get('/forecast', WeatherController.getForecast);

// Get weather history
router.get('/history', WeatherController.getHistory);

// Create weather data (for admin/testing)
router.post('/', WeatherController.create);

// Default route
router.get('/', (req, res) => {
  res.json({ 
    message: 'Weather API',
    endpoints: ['/current', '/forecast', '/history']
  });
});

module.exports = router;

