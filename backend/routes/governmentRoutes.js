
const express = require('express');
const router = express.Router();
const governmentAPIService = require('../services/GovernmentAPIService');
const { authenticateToken } = require('../middleware/auth');

router.get('/pmkisan/status', authenticateToken, async (req, res) => {
  try {
    const { aadhar_number, mobile_number } = req.query;
    
    const result = await governmentAPIService.getPMKISANStatus(
      aadhar_number,
      mobile_number
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/soil-health-card', authenticateToken, async (req, res) => {
  try {
    const { farmer_id, mobile_number } = req.query;
    
    const result = await governmentAPIService.getSoilHealthCard(
      farmer_id,
      mobile_number
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/msp', async (req, res) => {
  try {
    const { crop, year } = req.query;
    
    const result = await governmentAPIService.getMSPPrices(crop, year);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
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
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/subsidies', async (req, res) => {
  try {
    const { crop, state } = req.query;
    
    if (!crop || !state) {
      return res.status(400).json({
        success: false,
        error: 'Crop and state are required'
      });
    }
    
    const result = await governmentAPIService.getSubsidies(crop, state);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/weather-advisory', async (req, res) => {
  try {
    const { district } = req.query;
    
    if (!district) {
      return res.status(400).json({
        success: false,
        error: 'District is required'
      });
    }
    
    const result = await governmentAPIService.getWeatherAdvisory(district);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/complaint', authenticateToken, async (req, res) => {
  try {
    const complaintData = req.body;
    
    const result = await governmentAPIService.registerComplaint(complaintData);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;













