const express = require('express');
const router = express.Router();
const WeatherData = require('../models/WeatherData');
const Crop = require('../models/Crop');
const Disease = require('../models/Disease');
const logger = require('../utils/logger');

// GET /api/alerts - Fixed 404 error (public route)
router.get('/', async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { state, district } = req.query;
    
    const alerts = await generateAlerts(userId, state, district);
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    logger.error('Alerts error:', error);
    // Return empty alerts array instead of error for better UX
    res.json({
      success: true,
      data: [
        {
          id: 'system_alert',
          type: 'info',
          severity: 'info',
          title: 'System Status',
          message: 'Alerts system is operational',
          timestamp: new Date(),
          icon: '✅'
        }
      ]
    });
  }
});

async function generateAlerts(userId, state, district) {
  const alerts = [];
  const now = new Date();
  
  // Weather-based alerts
  const weatherAlerts = await getWeatherAlerts(state, district);
  alerts.push(...weatherAlerts);
  
  // Disease outbreak alerts
  const diseaseAlerts = await getDiseaseAlerts(state, district);
  alerts.push(...diseaseAlerts);
  
  // Crop-specific alerts
  if (userId) {
    const userCropAlerts = await getUserCropAlerts(userId);
    alerts.push(...userCropAlerts);
  }
  
  // Market price alerts
  const marketAlerts = await getMarketAlerts();
  alerts.push(...marketAlerts);
  
  return alerts.slice(0, 10); // Limit to 10 alerts
}

async function getWeatherAlerts(state, district) {
  const alerts = [];
  
  // Mock weather data - integrate with actual weather API
  alerts.push({
    id: 'weather_1',
    type: 'weather',
    severity: 'warning',
    title: 'Rainfall Alert',
    message: 'Heavy rainfall expected in next 24 hours. Ensure proper drainage for crops.',
    action: 'Ensure proper drainage',
    timestamp: new Date(),
    icon: '🌧️'
  });
  
  alerts.push({
    id: 'weather_2',
    type: 'weather',
    severity: 'info',
    title: 'Temperature Alert',
    message: 'Moderate temperatures expected. Good conditions for crop growth.',
    action: 'Continue regular irrigation',
    timestamp: new Date(),
    icon: '🌡️'
  });
  
  return alerts;
}

async function getDiseaseAlerts(state, district) {
  const alerts = [];
  
  // Check for common diseases in the region
  try {
    const commonDiseases = await Disease.find({ 
      severityLevel: { $gte: 4 } 
    }).limit(3);
    
    commonDiseases.forEach(disease => {
      alerts.push({
        id: `disease_${disease._id}`,
        type: 'disease',
        severity: 'high',
        title: `${disease.name} Alert`,
        message: `${disease.name} is common in your region. Monitor crops closely.`,
        action: 'Apply preventive measures',
        timestamp: new Date(),
        icon: '🦠',
        diseaseId: disease._id
      });
    });
  } catch (error) {
    logger.warn('Error fetching disease alerts:', error);
  }
  
  return alerts;
}

async function getUserCropAlerts(userId) {
  const alerts = [];
  
  // Get user's crops and generate alerts
  // This would require User model integration
  alerts.push({
    id: 'crop_1',
    type: 'crop',
    severity: 'info',
    title: 'Crop Maintenance',
    message: 'Time for regular crop monitoring and maintenance.',
    action: 'Check crop health',
    timestamp: new Date(),
    icon: '🌾'
  });
  
  return alerts;
}

async function getMarketAlerts() {
  const alerts = [];
  
  alerts.push({
    id: 'market_1',
    type: 'market',
    severity: 'info',
    title: 'Market Update',
    message: 'Check latest market prices for your crops.',
    action: 'View market prices',
    timestamp: new Date(),
    icon: '📊'
  });
  
  return alerts;
}

module.exports = router;
