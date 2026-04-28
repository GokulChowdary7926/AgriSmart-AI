
const express = require('express');
const router = express.Router();
const iotService = require('../services/IoTService');
const { authenticateToken } = require('../middleware/auth');
const { badRequest, serverError, ok } = require('../utils/httpResponses');

function parsePositiveInt(value, defaultValue, { min = 1, max = 365 } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

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
    
    return ok(
      res,
      readings,
      {
        source: 'AgriSmart AI',
        isFallback: false,
        sensor_id: sensorId,
        count: readings.length
      }
    );
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get('/sensors/:sensorId/analyze', authenticateToken, async (req, res) => {
  try {
    const { sensorId } = req.params;
    const periodDays = parsePositiveInt(req.query.period_days, 7, { min: 1, max: 90 });
    
    const analysis = await iotService.analyzeSensorData(sensorId, periodDays);
    
    return ok(
      res,
      analysis,
      {
        source: 'AgriSmart AI',
        isFallback: false,
        sensor_id: sensorId,
        period_days: periodDays
      }
    );
  } catch (error) {
    return serverError(res, error.message);
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
      return badRequest(res, 'soil_moisture, crop_type, and soil_type are required');
    }
    
    const recommendation = await iotService.getIrrigationRecommendation(
      soil_moisture,
      weather_forecast || {},
      crop_type,
      soil_type
    );
    
    return ok(res, recommendation, { source: 'AgriSmart AI', isFallback: false });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.post('/sensors/data', async (req, res) => {
  try {
    const sensorData = req.body;
    
    await iotService.processSensorData('webhook', sensorData);
    
    return ok(
      res,
      { message: 'Sensor data received' },
      { source: 'AgriSmart AI', isFallback: false, message: 'Sensor data received' }
    );
  } catch (error) {
    return serverError(res, error.message);
  }
});

module.exports = router;
















