const express = require('express');
const router = express.Router();
const WeatherController = require('../controllers/WeatherController');
const { cacheMiddleware } = require('../middleware/cache');

router.get('/current', cacheMiddleware(60), WeatherController.getCurrent);

router.get('/forecast', WeatherController.getForecast);

router.get('/history', WeatherController.getHistory);

router.get('/hourly', WeatherController.getHourlyForecast);

router.get('/alerts', WeatherController.getAlerts);

router.post('/', WeatherController.create);

router.get('/', (req, res) => {
  res.json({ 
    message: 'Weather API',
    endpoints: ['/current', '/forecast', '/history']
  });
});

module.exports = router;

