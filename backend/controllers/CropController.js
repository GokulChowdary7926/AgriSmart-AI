const Crop = require('../models/Crop');
const logger = require('../utils/logger');
const cropRecommendationEngine = require('../services/CropRecommendationEngine');
const cropRecommenderML = require('../services/ml/CropRecommenderML');
const weatherService = require('../services/WeatherService');

class CropController {
  // Get all crops
  static async getAll(req, res) {
    try {
      const { 
        season, 
        search, 
        page = 1, 
        limit = 20,
        sort = 'name'
      } = req.query;
      
      const query = {};
      
      if (season) {
        query.seasons = season;
      }
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { scientificName: { $regex: search, $options: 'i' } }
        ];
      }
      
      const skip = (page - 1) * limit;
      
      const [crops, total] = await Promise.all([
        Crop.find(query)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit)),
        Crop.countDocuments(query)
      ]);
      
      res.json({
        success: true,
        data: crops,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching crops:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Get crop by ID
  static async getById(req, res) {
    try {
      const crop = await Crop.findById(req.params.id);
      
      if (!crop) {
        return res.status(404).json({
          success: false,
          error: 'Crop not found'
        });
      }
      
      res.json({
        success: true,
        data: crop
      });
    } catch (error) {
      logger.error('Error fetching crop:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Create new crop
  static async create(req, res) {
    try {
      const crop = new Crop({
        ...req.body,
        createdBy: req.user?._id
      });
      
      await crop.save();
      
      res.status(201).json({
        success: true,
        data: crop
      });
    } catch (error) {
      logger.error('Error creating crop:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Update crop
  static async update(req, res) {
    try {
      const crop = await Crop.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          updatedBy: req.user?._id
        },
        { new: true, runValidators: true }
      );
      
      if (!crop) {
        return res.status(404).json({
          success: false,
          error: 'Crop not found'
        });
      }
      
      res.json({
        success: true,
        data: crop
      });
    } catch (error) {
      logger.error('Error updating crop:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Delete crop
  static async delete(req, res) {
    try {
      const crop = await Crop.findByIdAndDelete(req.params.id);
      
      if (!crop) {
        return res.status(404).json({
          success: false,
          error: 'Crop not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Crop deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting crop:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Get crop recommendations
  static async recommend(req, res) {
    try {
      // Support both GET (query params) and POST (body) requests
      const requestData = req.method === 'POST' ? (req.body || {}) : (req.query || {});
      
      // Extract parameters - handle both string and number formats
      const rawLat = requestData?.latitude;
      const rawLng = requestData?.longitude;
      
      // Convert to string and trim, but keep undefined if not present
      const latitude = (rawLat !== undefined && rawLat !== null && String(rawLat).trim() !== '') 
        ? String(rawLat).trim() 
        : undefined;
      const longitude = (rawLng !== undefined && rawLng !== null && String(rawLng).trim() !== '') 
        ? String(rawLng).trim() 
        : undefined;
      
      const temperature = requestData?.temperature;
      const rainfall = requestData?.rainfall;
      const ph = requestData?.ph;
      const soilType = requestData?.soilType;
      const season = requestData?.season;
      
      logger.info('Crop recommendation request:', {
        method: req.method,
        url: req.url,
        latitude,
        longitude,
        hasLatLng: !!(latitude && longitude),
        requestDataKeys: Object.keys(requestData || {}),
        requestData: requestData
      });
      
      const locationService = require('../services/locationService');
      let conditions = {};
      let locationData = null;

      // If coordinates provided, get comprehensive location data
      // Convert to numbers and check if valid - SIMPLIFIED VERSION
      let lat = null;
      let lng = null;
      
      // Parse latitude
      if (latitude !== undefined && latitude !== null) {
        const latStr = String(latitude).trim();
        if (latStr !== '' && latStr !== 'undefined' && latStr !== 'null') {
          const parsed = parseFloat(latStr);
          if (!isNaN(parsed) && isFinite(parsed)) {
            lat = parsed;
          }
        }
      }
      
      // Parse longitude
      if (longitude !== undefined && longitude !== null) {
        const lngStr = String(longitude).trim();
        if (lngStr !== '' && lngStr !== 'undefined' && lngStr !== 'null') {
          const parsed = parseFloat(lngStr);
          if (!isNaN(parsed) && isFinite(parsed)) {
            lng = parsed;
          }
        }
      }
      
      logger.info('Coordinate parsing result:', { 
        rawLat: latitude, 
        rawLng: longitude,
        parsedLat: lat, 
        parsedLng: lng,
        hasValidCoords: !!(lat !== null && lng !== null)
      });
      
      // If we have valid coordinates, fetch location data using CropRecommendationEngine
      if (lat !== null && lng !== null) {
        try {
          logger.info('Fetching location data using CropRecommendationEngine:', { latitude: lat, longitude: lng });
          
          // Get weather data if available from locationService
          let weatherData = null;
          try {
            const locationService = require('../services/locationService');
            const locData = await locationService.getLocationData(lat, lng);
            if (locData) {
              weatherData = {
                temperature: locData.temperature || locData.weather?.temperature || 25,
                humidity: locData.humidity || locData.weather?.humidity || 65,
                rainfall: locData.rainfall || locData.weather?.rainfall || 800,
                conditions: locData.conditions || locData.weather?.conditions || 'Clear'
              };
            }
          } catch (weatherErr) {
            logger.warn('Weather data not available, using defaults');
          }
          
          // Use CropRecommendationEngine to get comprehensive data
          const engineData = await cropRecommendationEngine.getLocationData(lat, lng, weatherData);
          
          logger.info('Engine data received:', {
            hasRecommendations: !!engineData.recommendations,
            recommendationsCount: engineData.recommendations?.length || 0,
            weather: engineData.weather,
            soil: engineData.soil
          });
          
          // Set locationData for response
          locationData = {
            location: engineData.location,
            weather: engineData.weather,
            soil: engineData.soil,
            temperature: engineData.weather?.temperature || 25,
            rainfall: engineData.weather?.rainfall || 800,
            ph: parseFloat(engineData.soil?.ph) || 7.0,
            soilType: engineData.soil?.soil_type || 'alluvial',
            humidity: engineData.weather?.humidity || 65
          };
          
          // Extract conditions from engine data
          const temp = parseFloat(temperature) || locationData.temperature || 25;
          const rain = parseFloat(rainfall) || locationData.rainfall || 800;
          const soilPh = parseFloat(ph) || locationData.ph || 7.0;
          const soil = soilType || locationData.soilType || 'alluvial';
          
          conditions = {
            temperature: temp,
            rainfall: rain,
            ph: soilPh,
            soilType: soil,
            season: season || CropController.getCurrentSeason(engineData.location?.state),
            location: engineData.location
          };
          
          // Store engine recommendations for later use
          locationData.engineRecommendations = engineData.recommendations;
          locationData.marketPrices = engineData.market_prices;
          locationData.diseases = engineData.common_diseases;
          
          logger.info('✅ Conditions set successfully from engine data:', conditions);
        } catch (err) {
          logger.error('Error getting location data from engine:', err);
          locationData = null;
        }
      } else {
        logger.warn('Coordinates check failed - lat:', lat, 'lng:', lng, 'rawLat:', latitude, 'rawLng:', longitude);
      }

      // Fallback to query parameters if location data not available
      // Check if conditions were set from locationData
      if (!conditions.temperature || !conditions.rainfall || !conditions.ph || !conditions.soilType) {
        logger.warn('Conditions not set from locationData, checking provided params...', {
          hasLocationData: !!locationData,
          conditions: conditions,
          providedParams: { temperature, rainfall, ph, soilType }
        });
        
        // If we have locationData but conditions weren't set, there was an error
        if (locationData) {
          logger.error('Location data fetched but conditions not set properly:', {
            locationDataKeys: Object.keys(locationData),
            locationDataTemp: locationData.temperature,
            locationDataRainfall: locationData.rainfall,
            locationDataPh: locationData.ph,
            locationDataSoilType: locationData.soilType
          });
          logger.error('Location data fetched but conditions not set properly:', {
            locationDataKeys: Object.keys(locationData),
            locationDataTemp: locationData.temperature,
            locationDataRainfall: locationData.rainfall,
            locationDataPh: locationData.ph,
            locationDataSoilType: locationData.soilType
          });
        }
        
        // Try to use provided parameters OR use fallback defaults
        if (!temperature || !rainfall || !ph || !soilType) {
          
          // Use fallback defaults based on approximate location or generic Indian data
          const fallbackLat = latitude ? parseFloat(latitude) : 28.6139; // New Delhi default
          const fallbackLng = longitude ? parseFloat(longitude) : 77.2090;
          
          // Determine region and set defaults
          let defaultTemp = 25;
          let defaultRainfall = 800;
          let defaultPh = 7.0;
          let defaultSoilType = 'alluvial';
          
          if (fallbackLat > 30) {
            // North India
            defaultTemp = 22;
            defaultRainfall = 600;
            defaultSoilType = 'alluvial';
          } else if (fallbackLat < 20) {
            // South India
            defaultTemp = 28;
            defaultRainfall = 1200;
            defaultSoilType = 'red';
          } else {
            // Central India
            defaultTemp = 26;
            defaultRainfall = 900;
            defaultSoilType = 'black';
          }
          
          conditions = {
            temperature: defaultTemp,
            rainfall: defaultRainfall,
            ph: defaultPh,
            soilType: defaultSoilType,
            season: CropController.getCurrentSeason(null),
            location: {
              latitude: fallbackLat,
              longitude: fallbackLng,
              source: 'fallback_defaults'
            }
          };
          
          logger.info('Using fallback defaults:', conditions);
        } else {
          // Use provided parameters if they exist
          const temp = temperature ? parseFloat(temperature) : null;
          const rain = rainfall ? parseFloat(rainfall) : null;
          const soilPh = ph ? parseFloat(ph) : null;
          
          if (temp !== null && rain !== null && soilPh !== null && soilType) {
            conditions = {
              temperature: temp,
              rainfall: rain,
              ph: soilPh,
              soilType,
              season: season || CropController.getCurrentSeason(null),
              location: locationData?.location || { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
            };
          }
        }
      }
      
      // Final validation - ensure all conditions are set
      if (!conditions.temperature || !conditions.rainfall || !conditions.ph || !conditions.soilType) {
        logger.error('Conditions validation failed:', conditions);
        return res.status(500).json({
          success: false,
          error: 'Failed to determine environmental conditions. Please try again or provide manual parameters.',
          debug: { conditions }
        });
      }
      
      // Use ML recommendations if available, otherwise use engine
      let recommendations = [];
      try {
        // Prepare features for ML model
        const mlFeatures = {
          N: 70, // Default nitrogen
          P: 40, // Default phosphorus
          K: 40, // Default potassium
          temperature: conditions.temperature || 25,
          humidity: locationData?.humidity || weatherData?.humidity || 65,
          ph: conditions.ph || 7.0,
          rainfall: conditions.rainfall || 800,
          soil_type: conditions.soilType || 'alluvial',
          state: locationData?.location?.state || 'Unknown'
        };

        // Try ML prediction first
        logger.info('Attempting ML prediction with features:', mlFeatures);
        const mlRecommendations = await cropRecommenderML.predict(mlFeatures);
        
        if (mlRecommendations && mlRecommendations.length > 0) {
          recommendations = mlRecommendations.map(rec => ({
            crop: rec.crop,
            score: rec.confidence,
            suitability: rec.confidence,
            season: rec.season || CropController.getCurrentSeason(locationData?.location?.state),
            reason: rec.reason || 'ML model recommendation',
            method: rec.method || 'ml_model',
            ml_confidence: rec.confidence
          }));
          logger.info('✅ ML recommendations received:', recommendations.length);
        } else {
          // Fallback to engine recommendations
          if (locationData?.engineRecommendations && locationData.engineRecommendations.length > 0) {
            recommendations = locationData.engineRecommendations;
            logger.info('Using engine recommendations:', recommendations.length);
          } else {
            recommendations = cropRecommendationEngine.getCropRecommendations(
              conditions.temperature,
              locationData?.humidity || 65,
              conditions.ph,
              conditions.rainfall,
              conditions.soilType
            );
          }
        }
      } catch (mlError) {
        logger.error('ML prediction error, using fallback:', mlError);
        // Final fallback
        recommendations = cropRecommendationEngine.getCropRecommendations(
          conditions.temperature || 25,
          65,
          conditions.ph || 7.0,
          conditions.rainfall || 800,
          conditions.soilType || 'alluvial'
        );
      }
      
      // Format recommendations for frontend
      const formattedRecommendations = recommendations.map((rec, index) => ({
        id: rec.id || `rec-${index}`,
        name: rec.crop || rec.name || 'Unknown Crop',
        scientificName: rec.scientificName || '',
        suitability: rec.score || rec.suitability || 0,
        season: rec.season || conditions.season || CropController.getCurrentSeason(locationData?.location?.state),
        duration: rec.duration || '90-120 days',
        estimatedYield: rec.yield || '2-4 tons/ha',
        marketPrice: rec.market_price || '₹2000-₹4000/ton',
        reason: rec.reason || CropController.generateRecommendationReason(rec, conditions, locationData),
        waterRequirements: rec.water_requirements || 'Moderate',
        requirements: rec.requirements || {}
      }));
      
      res.json({
        success: true,
        data: {
          recommendations: formattedRecommendations,
          conditions,
          location: locationData?.location || null,
          soil: locationData?.soil || null,
          weather: locationData?.weather || null,
          marketPrices: locationData?.marketPrices || null,
          diseases: locationData?.diseases || null,
          environmentalData: locationData ? {
            latitude: locationData.location?.latitude || lat,
            longitude: locationData.location?.longitude || lng,
            temperature: locationData.temperature,
            rainfall: locationData.rainfall,
            ph: locationData.ph,
            soilType: locationData.soilType,
            humidity: locationData.humidity
          } : null
        }
      });
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Helper method to generate recommendation reason
  static generateRecommendationReason(rec, conditions, locationData) {
    const reasons = [];
    
    if (rec.score >= 80) {
      reasons.push('Highly suitable for your location');
    } else if (rec.score >= 60) {
      reasons.push('Moderately suitable');
    }
    
    if (locationData?.soil?.type) {
      reasons.push(`Compatible with ${locationData.soil.type} soil`);
    }
    
    if (conditions.season) {
      reasons.push(`Ideal for ${conditions.season} season`);
    }
    
    if (locationData?.location?.state) {
      reasons.push(`Commonly grown in ${locationData.location.state}`);
    }
    
    return reasons.join(', ') || 'Suitable for your region';
  }

  // Helper method to get current season based on state
  static getCurrentSeason(state) {
    const month = new Date().getMonth() + 1; // 1-12
    
    // North India seasons
    const northStates = ['Punjab', 'Haryana', 'Uttar Pradesh', 'Delhi', 'Himachal Pradesh', 'Uttarakhand'];
    if (northStates.includes(state)) {
      if (month >= 3 && month <= 5) return 'summer';
      if (month >= 6 && month <= 9) return 'monsoon';
      if (month >= 10 && month <= 11) return 'autumn';
      return 'winter';
    }

    // South India seasons (less variation)
    if (month >= 6 && month <= 9) return 'monsoon';
    if (month >= 10 && month <= 12) return 'winter';
    if (month >= 1 && month <= 2) return 'winter';
    return 'summer';
  }

  // Fallback recommendations when AI model is not available
  static getFallbackRecommendations(conditions) {
    const { temperature, rainfall, ph, soilType, season } = conditions;
    
    // Basic crop recommendations based on conditions
    const crops = [
      { name: 'Rice', score: 85, season: 'monsoon', duration: '120-150 days', yield: '4-6 tons/ha' },
      { name: 'Wheat', score: 80, season: 'winter', duration: '100-120 days', yield: '3-5 tons/ha' },
      { name: 'Maize', score: 75, season: 'summer', duration: '80-100 days', yield: '3-4 tons/ha' },
      { name: 'Soybean', score: 70, season: 'monsoon', duration: '90-120 days', yield: '2-3 tons/ha' },
      { name: 'Cotton', score: 65, season: 'summer', duration: '150-180 days', yield: '2-3 tons/ha' },
      { name: 'Sugarcane', score: 60, season: 'winter', duration: '300-365 days', yield: '60-80 tons/ha' },
      { name: 'Potato', score: 75, season: 'winter', duration: '90-120 days', yield: '20-30 tons/ha' },
      { name: 'Tomato', score: 70, season: 'winter', duration: '90-120 days', yield: '30-40 tons/ha' },
      { name: 'Onion', score: 65, season: 'winter', duration: '120-150 days', yield: '15-20 tons/ha' },
      { name: 'Chili', score: 60, season: 'summer', duration: '120-150 days', yield: '2-3 tons/ha' }
    ];

    // Filter and score based on conditions
    return crops
      .filter(crop => !season || crop.season === season)
      .map(crop => ({
        crop: {
          name: crop.name,
          scientificName: '',
          duration: crop.duration,
          yield: crop.yield,
          marketPrice: '₹2000-₹4000/ton'
        },
        name: crop.name,
        score: crop.score,
        season: crop.season,
        duration: crop.duration,
        yield: crop.yield
      }))
      .slice(0, 10);
  }
  
  // Get crops by season
  static async getBySeason(req, res) {
    try {
      const { season } = req.params;
      
      const crops = await Crop.findBySeason(season);
      
      res.json({
        success: true,
        data: crops
      });
    } catch (error) {
      logger.error('Error fetching crops by season:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get crops analytics for dashboard
  static async getAnalytics(req, res) {
    try {
      const userId = req.user?._id;
      
      // Get user's crops if userId is available
      let userCrops = [];
      if (userId) {
        const CropModel = require('../models/Crop');
        // Assuming crops have a user/createdBy field
        userCrops = await CropModel.find({ createdBy: userId }).limit(10).sort({ createdAt: -1 });
      }
      
      res.json({
        success: true,
        data: {
          summary: {
            totalCrops: userCrops.length,
            activeCrops: userCrops.filter(c => c.status === 'active' || c.status === 'growing').length
          },
          recentCrops: userCrops.map(crop => ({
            name: crop.name,
            status: crop.status || 'active',
            healthScore: crop.healthScore || 85
          }))
        }
      });
    } catch (error) {
      logger.error('Error fetching crops analytics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = CropController;
