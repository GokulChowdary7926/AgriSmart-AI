const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const agriDataIntegrator = require('../services/AgriDataIntegrator');
const cropRecommendationEngine = require('../services/CropRecommendationEngine');

router.get('/recommend', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates'
      });
    }

    const features = agriDataIntegrator.createMasterFeaturesTable(lat, lng);

    const locationData = await cropRecommendationEngine.getLocationData(
      lat,
      lng,
      null,
      null,
      null,
      'India'
    );

    const recommendations = locationData.recommendations || [];
    
    const enhancedRecommendations = recommendations.map(rec => {
      const cropName = rec.crop_name || rec.name || rec.crop;
      const suitability = features.integrated_suitability[cropName];
      
      return {
        ...rec,
        data_driven_insights: suitability ? {
          combined_score: suitability.combined_score,
          recommendation_level: suitability.recommendation_level,
          soil_score: suitability.soil_score,
          yield_potential: suitability.yield_potential,
          regional_adaptation: suitability.regional_adaptation
        } : null,
        datasets_used: Object.keys(features.datasets_available).filter(
          key => features.datasets_available[key].available
        )
      };
    });

    res.json({
      success: true,
      data: {
        recommendations: enhancedRecommendations,
        location: locationData.location,
        soil: locationData.soil,
        weather: locationData.weather,
        data_integration: {
          datasets_available: features.datasets_available,
          integrated_features: {
            soil_nutrients: features.soil_nutrients,
            yield_trends: features.yield_trends,
            district_production: features.district_production
          },
          integrated_suitability: features.integrated_suitability
        }
      }
    });

  } catch (error) {
    logger.error('Error in data-driven recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/datasets/available', (req, res) => {
  try {
    const datasetInfo = agriDataIntegrator.getDatasetInfo();
    res.json({
      success: true,
      data: datasetInfo
    });
  } catch (error) {
    logger.error('Error getting dataset info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/analysis/historical-trends', async (req, res) => {
  try {
    const { latitude, longitude, crop } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates'
      });
    }

    const features = agriDataIntegrator.createMasterFeaturesTable(lat, lng);

    if (!features || Object.keys(features.integrated_suitability).length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No historical data available for this location'
      });
    }

    const analysis = {
      location_analysis: {
        soil_profile: features.soil_nutrients,
        historical_yield_trends: features.yield_trends,
        district_production: features.district_production
      },
      crop_suitability: features.integrated_suitability
    };

    if (crop && analysis.crop_suitability[crop]) {
      analysis.specific_crop = {
        crop,
        suitability: analysis.crop_suitability[crop]
      };
    }

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    logger.error('Error analyzing historical trends:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;














