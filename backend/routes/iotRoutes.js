
const express = require('express');
const router = express.Router();
const iotService = require('../services/IoTService');
const { authenticateToken } = require('../middleware/auth');

router.get('/sensors/:sensorId/readings', authenticateToken, async (req, res) => {
  try {
    const { sensorId } = req.params;
    const { start_time, end_time } = req.query;
    
    const startTime = start_time ? new Date(start_time) : null;
    const endTime = end_time ? new Date(end_time) : null;
    
    const readings = await iotService.getSensorReadings(
      sensorId,
      startTime,
      endTime
    );
    
    res.json({
      success: true,
      sensor_id: sensorId,
      count: readings.length,
      readings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/sensors/:sensorId/analyze', authenticateToken, async (req, res) => {
  try {
    const { sensorId } = req.params;
    const periodDays = parseInt(req.query.period_days || '7');
    
    const analysis = await iotService.analyzeSensorData(sensorId, periodDays);
    
    res.json({
      success: true,
      sensor_id: sensorId,
      period_days: periodDays,
      analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/irrigation/recommendation', authenticateToken, async (req, res) => {
  try {
    const {
      soil_moisture,
      weather_forecast,
      crop_type,
      soil_type
    } = req.body;
    
    if (!soil_moisture || !crop_type || !soil_type) {
      return res.status(400).json({
        success: false,
        error: 'soil_moisture, crop_type, and soil_type are required'
      });
    }
    
    const recommendation = await iotService.getIrrigationRecommendation(
      soil_moisture,
      weather_forecast || {},
      crop_type,
      soil_type
    );
    
    res.json({
      success: true,
      recommendation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/sensors/data', async (req, res) => {
  try {
    const sensorData = req.body;
    
    await iotService.processSensorData('webhook', sensorData);
    
    res.json({
      success: true,
      message: 'Sensor data received'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;













