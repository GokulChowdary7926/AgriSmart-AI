const express = require('express');
const router = express.Router();
const realTimeService = require('../services/RealTimeAgricultureService');
const logger = require('../utils/logger');
const { badRequest, serverError, ok } = require('../utils/httpResponses');

function parseCoordinates(lat, lng, defaults = { lat: 20.5937, lng: 78.9629 }) {
  const hasLat = lat !== undefined && lat !== null && lat !== '';
  const hasLng = lng !== undefined && lng !== null && lng !== '';
  if (!hasLat && !hasLng) {
    return { lat: defaults.lat, lng: defaults.lng };
  }

  const latitude = Number.parseFloat(lat);
  const longitude = Number.parseFloat(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { lat: latitude, lng: longitude };
}

router.get('/iot/:farmId', async (req, res) => {
  try {
    const { farmId } = req.params;
    const { sensorType } = req.query;
    
    const data = await realTimeService.getIoTData(farmId || 'demo-farm', sensorType);
    return ok(res, data, {
      source: 'AgriSmart AI',
      isFallback: Boolean(data?.fallback || data?.success === false),
      degradedReason: data?.fallback || data?.success === false ? 'realtime_iot_degraded' : null
    });
  } catch (error) {
    logger.error('Error in IoT endpoint:', error);
    return serverError(res, error.message);
  }
});

router.get('/market-alerts', async (req, res) => {
  try {
    const { crop, state } = req.query;
    
    const alerts = await realTimeService.getMarketAlerts(crop, state);
    return ok(res, alerts, {
      source: 'AgriSmart AI',
      isFallback: Boolean(alerts?.fallback || alerts?.success === false),
      degradedReason: alerts?.fallback || alerts?.success === false ? 'realtime_market_alerts_degraded' : null
    });
  } catch (error) {
    logger.error('Error in market alerts endpoint:', error);
    return serverError(res, error.message);
  }
});

router.get('/weather-alerts', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const coordinates = parseCoordinates(lat, lng);
    if (!coordinates) {
      return badRequest(res, 'lat and lng must be valid numeric coordinates');
    }
    
    const alerts = await realTimeService.getWeatherAlerts(coordinates.lat, coordinates.lng);
    return ok(res, alerts, {
      source: 'AgriSmart AI',
      isFallback: Boolean(alerts?.fallback || alerts?.success === false),
      degradedReason: alerts?.fallback || alerts?.success === false ? 'realtime_weather_alerts_degraded' : null
    });
  } catch (error) {
    logger.error('Error in weather alerts endpoint:', error);
    return serverError(res, error.message);
  }
});

router.get('/irrigation/:farmId', async (req, res) => {
  try {
    const { farmId } = req.params;
    
    const recommendation = await realTimeService.getIrrigationRecommendation(farmId || 'demo-farm');
    return ok(res, recommendation, {
      source: 'AgriSmart AI',
      isFallback: Boolean(recommendation?.fallback || recommendation?.success === false),
      degradedReason: recommendation?.fallback || recommendation?.success === false ? 'realtime_irrigation_degraded' : null
    });
  } catch (error) {
    logger.error('Error in irrigation endpoint:', error);
    return serverError(res, error.message);
  }
});

router.get('/pest-warning/:farmId', async (req, res) => {
  try {
    const { farmId } = req.params;
    const { crop } = req.query;
    
    const warning = await realTimeService.getPestDiseaseWarning(farmId || 'demo-farm', crop);
    return ok(res, warning, {
      source: 'AgriSmart AI',
      isFallback: Boolean(warning?.fallback || warning?.success === false),
      degradedReason: warning?.fallback || warning?.success === false ? 'realtime_pest_warning_degraded' : null
    });
  } catch (error) {
    logger.error('Error in pest warning endpoint:', error);
    return serverError(res, error.message);
  }
});

router.get('/dashboard/:farmId', async (req, res) => {
  try {
    const { farmId } = req.params;
    const { lat, lng, state } = req.query;
    const coordinates = parseCoordinates(lat, lng);
    if (!coordinates) {
      return badRequest(res, 'lat and lng must be valid numeric coordinates');
    }
    
    const location = {
      lat: coordinates.lat,
      lng: coordinates.lng,
      state: state || 'Maharashtra'
    };
    
    const data = await realTimeService.getDashboardData(farmId || 'demo-farm', location);
    return ok(res, data, {
      source: 'AgriSmart AI',
      isFallback: Boolean(data?.fallback || data?.success === false),
      degradedReason: data?.fallback || data?.success === false ? 'realtime_dashboard_degraded' : null
    });
  } catch (error) {
    logger.error('Error in dashboard endpoint:', error);
    return serverError(res, error.message);
  }
});

router.get('/health', (req, res) => {
  return ok(
    res,
    {
      service: 'RealTime Agriculture Service',
      status: 'operational',
      timestamp: new Date().toISOString()
    },
    { source: 'AgriSmart AI', isFallback: false }
  );
});

module.exports = router;

