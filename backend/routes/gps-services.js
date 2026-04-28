const express = require('express');
const router = express.Router();
const locationService = require('../services/locationService');
const { badRequest, serverError, ok } = require('../utils/httpResponses');

function parsePositiveInt(value, defaultValue, { min = 1, max = 50 } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

function parseCoordinates(latitude, longitude) {
  const lat = Number.parseFloat(latitude);
  const lng = Number.parseFloat(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { lat, lng };
}

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || req.query.query || '';
    if (!q.trim()) {
      return badRequest(res, 'Query parameter "q" or "query" is required');
    }
    const results = await locationService.searchByQuery(q.trim(), {
      limit: parsePositiveInt(req.query.limit, 10, { min: 1, max: 25 }),
      countryCodes: req.query.country || 'in'
    });
    return ok(res, results, { source: 'AgriSmart AI', isFallback: false, provider: 'AgriSmart AI' });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get('/location', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return badRequest(res, 'Latitude and longitude are required');
    }

    const coordinates = parseCoordinates(latitude, longitude);
    if (!coordinates) {
      return badRequest(res, 'Latitude and longitude must be valid numeric coordinates');
    }

    const locationData = await locationService.getLocationData(coordinates.lat, coordinates.lng);

    return ok(res, locationData, { source: 'AgriSmart AI', isFallback: false });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get('/soil/detect', async (req, res) => {
  try {
    const { latitude, longitude, state } = req.query;
    
    if (!latitude || !longitude) {
      return badRequest(res, 'Latitude and longitude are required');
    }

    const coordinates = parseCoordinates(latitude, longitude);
    if (!coordinates) {
      return badRequest(res, 'Latitude and longitude must be valid numeric coordinates');
    }

    const soilData = await locationService.getSoilType(coordinates.lat, coordinates.lng, state);

    return ok(res, soilData, { source: 'AgriSmart AI', isFallback: false });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get('/weather', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return badRequest(res, 'Latitude and longitude are required');
    }

    const coordinates = parseCoordinates(latitude, longitude);
    if (!coordinates) {
      return badRequest(res, 'Latitude and longitude must be valid numeric coordinates');
    }

    const weatherData = await locationService.getWeatherForLocation(coordinates.lat, coordinates.lng);

    return ok(res, weatherData, { source: 'AgriSmart AI', isFallback: false });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get('/complete', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return badRequest(res, 'Latitude and longitude are required');
    }

    const coordinates = parseCoordinates(latitude, longitude);
    if (!coordinates) {
      return badRequest(res, 'Latitude and longitude must be valid numeric coordinates');
    }

    const completeData = await locationService.getLocationData(coordinates.lat, coordinates.lng);

    return ok(res, completeData, { source: 'AgriSmart AI', isFallback: false });
  } catch (error) {
    return serverError(res, error.message);
  }
});

module.exports = router;
