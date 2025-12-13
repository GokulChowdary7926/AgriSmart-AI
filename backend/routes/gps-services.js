const express = require('express');
const router = express.Router();
const locationService = require('../services/locationService');
const { authenticateToken } = require('../middleware/auth');

router.get('/location', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const locationData = await locationService.getLocationData(
      parseFloat(latitude),
      parseFloat(longitude)
    );

    res.json({
      success: true,
      data: locationData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/soil/detect', async (req, res) => {
  try {
    const { latitude, longitude, state } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const soilData = await locationService.getSoilType(
      parseFloat(latitude),
      parseFloat(longitude),
      state
    );

    res.json({
      success: true,
      data: soilData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/weather', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const weatherData = await locationService.getWeatherForLocation(
      parseFloat(latitude),
      parseFloat(longitude)
    );

    res.json({
      success: true,
      data: weatherData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/complete', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const completeData = await locationService.getLocationData(
      parseFloat(latitude),
      parseFloat(longitude)
    );

    res.json({
      success: true,
      data: completeData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
