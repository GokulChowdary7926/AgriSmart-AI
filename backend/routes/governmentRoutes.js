
const express = require('express');
const router = express.Router();
const governmentAPIService = require('../services/governmentAPIService');
const { authenticateToken } = require('../middleware/auth');
const { badRequest, serverError, ok } = require('../utils/httpResponses');

router.get('/pmkisan/status', authenticateToken, async (req, res) => {
  try {
    const { aadhar_number, mobile_number } = req.query;
    
    const result = await governmentAPIService.getPMKISANStatus(
      aadhar_number,
      mobile_number
    );
    
    return ok(res, result, {
      source: 'AgriSmart AI',
      isFallback: Boolean(result?.fallback || result?.success === false),
      degradedReason: result?.fallback || result?.success === false ? 'government_pmkisan_degraded' : null
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get('/soil-health-card', authenticateToken, async (req, res) => {
  try {
    const { farmer_id, mobile_number } = req.query;
    
    const result = await governmentAPIService.getSoilHealthCard(
      farmer_id,
      mobile_number
    );
    
    return ok(res, result, {
      source: 'AgriSmart AI',
      isFallback: Boolean(result?.fallback || result?.success === false),
      degradedReason: result?.fallback || result?.success === false ? 'government_soil_health_degraded' : null
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get('/msp', async (req, res) => {
  try {
    const { crop, year } = req.query;
    
    const result = await governmentAPIService.getMSPPrices(crop, year);
    
    return ok(res, result, {
      source: 'AgriSmart AI',
      isFallback: Boolean(result?.fallback || result?.success === false),
      degradedReason: result?.fallback || result?.success === false ? 'government_msp_degraded' : null
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get('/schemes', async (req, res) => {
  try {
    const { state, category, farmer_type } = req.query;
    
    const result = await governmentAPIService.getGovernmentSchemes(
      state,
      category,
      farmer_type
    );
    
    return ok(res, result, {
      source: 'AgriSmart AI',
      isFallback: Boolean(result?.fallback || result?.success === false),
      degradedReason: result?.fallback || result?.success === false ? 'government_schemes_degraded' : null
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get('/subsidies', async (req, res) => {
  try {
    const { crop, state } = req.query;
    
    if (!crop || !state) {
      return badRequest(res, 'Crop and state are required');
    }
    
    const result = await governmentAPIService.getSubsidies(crop, state);
    
    return ok(res, result, {
      source: 'AgriSmart AI',
      isFallback: Boolean(result?.fallback || result?.success === false),
      degradedReason: result?.fallback || result?.success === false ? 'government_subsidies_degraded' : null
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get('/weather-advisory', async (req, res) => {
  try {
    const { district } = req.query;
    
    if (!district) {
      return badRequest(res, 'District is required');
    }
    
    const result = await governmentAPIService.getWeatherAdvisory(district);
    
    return ok(res, result, {
      source: 'AgriSmart AI',
      isFallback: Boolean(result?.fallback || result?.success === false),
      degradedReason: result?.fallback || result?.success === false ? 'government_weather_advisory_degraded' : null
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.post('/complaint', authenticateToken, async (req, res) => {
  try {
    const complaintData = req.body;
    
    const result = await governmentAPIService.registerComplaint(complaintData);
    
    return ok(res, result, {
      source: 'AgriSmart AI',
      isFallback: Boolean(result?.fallback || result?.success === false),
      degradedReason: result?.fallback || result?.success === false ? 'government_complaint_degraded' : null
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

module.exports = router;
