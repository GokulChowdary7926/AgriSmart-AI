const express = require('express');
const router = express.Router();
const WeatherController = require('../controllers/WeatherController');
const { cacheMiddleware } = require('../middleware/cache');
const { ok } = require('../utils/httpResponses');

router.get('/current', cacheMiddleware(60), WeatherController.getCurrent);

router.get('/forecast', WeatherController.getForecast);

router.get('/history', WeatherController.getHistory);

router.get('/hourly', WeatherController.getHourlyForecast);

router.get('/alerts', WeatherController.getAlerts);

router.post('/', WeatherController.create);

router.get('/', (req, res) => {
  return ok(
    res,
    {
      message: 'Weather API',
      endpoints: ['/current', '/forecast', '/history']
    },
    { source: 'AgriSmart AI', isFallback: false }
  );
});

module.exports = router;

