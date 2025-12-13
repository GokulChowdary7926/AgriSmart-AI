const express = require('express');
const router = express.Router();
const realTimeService = require('../services/RealTimeAgricultureService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

router.get('/iot/:farmId', async (req, res) => {
  try {
    const { farmId } = req.params;
    const { sensorType } = req.query;
    
    const data = await realTimeService.getIoTData(farmId || 'demo-farm', sensorType);
    res.json(data);
  } catch (error) {
    logger.error('Error in IoT endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/market-alerts', async (req, res) => {
  try {
    const { crop, state } = req.query;
    
    const alerts = await realTimeService.getMarketAlerts(crop, state);
    res.json(alerts);
  } catch (error) {
    logger.error('Error in market alerts endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/weather-alerts', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const latitude = lat ? parseFloat(lat) : 20.5937; // Default to India center
    const longitude = lng ? parseFloat(lng) : 78.9629;
    
    const alerts = await realTimeService.getWeatherAlerts(latitude, longitude);
    res.json(alerts);
  } catch (error) {
    logger.error('Error in weather alerts endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/irrigation/:farmId', async (req, res) => {
  try {
    const { farmId } = req.params;
    
    const recommendation = await realTimeService.getIrrigationRecommendation(farmId || 'demo-farm');
    res.json(recommendation);
  } catch (error) {
    logger.error('Error in irrigation endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/pest-warning/:farmId', async (req, res) => {
  try {
    const { farmId } = req.params;
    const { crop } = req.query;
    
    const warning = await realTimeService.getPestDiseaseWarning(farmId || 'demo-farm', crop);
    res.json(warning);
  } catch (error) {
    logger.error('Error in pest warning endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/dashboard/:farmId', async (req, res) => {
  try {
    const { farmId } = req.params;
    const { lat, lng, state } = req.query;
    
    const location = {
      lat: lat ? parseFloat(lat) : 20.5937,
      lng: lng ? parseFloat(lng) : 78.9629,
      state: state || 'Maharashtra'
    };
    
    const data = await realTimeService.getDashboardData(farmId || 'demo-farm', location);
    res.json(data);
  } catch (error) {
    logger.error('Error in dashboard endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'RealTime Agriculture Service',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

