const Crop = require('../models/Crop');
const logger = require('../utils/logger');
const cropRecommendationEngine = require('../services/CropRecommendationEngine');
const enhancedCropRecommendationService = require('../services/EnhancedCropRecommendationService');
const cropRecommenderML = require('../services/ml/CropRecommenderML');
const weatherService = require('../services/WeatherService');

class CropController {
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
  
  static async recommend(req, res) {
    try {
      const requestData = req.method === 'POST' ? (req.body || {}) : (req.query || {});
      
      const rawLat = requestData?.latitude;
      const rawLng = requestData?.longitude;
      
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
      const state = requestData?.state;
      
      let locationData = null;
      let weatherData = null;
      let conditions = {};
      
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

      let lat = null;
      let lng = null;
      
      if (latitude !== undefined && latitude !== null) {
        const latStr = String(latitude).trim();
        if (latStr !== '' && latStr !== 'undefined' && latStr !== 'null') {
          const parsed = parseFloat(latStr);
          if (!isNaN(parsed) && isFinite(parsed)) {
            lat = parsed;
          }
        }
      }
      
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
      
      if (lat !== null && lng !== null) {
        try {
          logger.info('Fetching location data using CropRecommendationEngine:', { latitude: lat, longitude: lng });
          
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
          
          const engineData = await cropRecommendationEngine.getLocationData(
            lat, 
            lng, 
            weatherData,
            state || null,
            state || null,
            'India'
          );
          
          logger.info('Engine data received:', {
            hasRecommendations: !!engineData.recommendations,
            recommendationsCount: engineData.recommendations?.length || 0,
            weather: engineData.weather,
            soil: engineData.soil,
            location: engineData.location?.state || engineData.location?.region
          });
          
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
          
          locationData.engineRecommendations = engineData.recommendations;
          locationData.marketPrices = engineData.market_prices;
          locationData.diseases = engineData.common_diseases;
          
          logger.info('✅ Conditions set successfully from engine data:', conditions);
          logger.info(`✅ Location-specific recommendations: ${engineData.recommendations?.length || 0} crops for ${engineData.location?.state || engineData.location?.region || 'unknown location'}`);
        } catch (err) {
          logger.error('Error getting location data from engine:', err);
          locationData = null;
        }
      } else {
        logger.warn('Coordinates check failed - lat:', lat, 'lng:', lng, 'rawLat:', latitude, 'rawLng:', longitude);
      }

      if (!conditions.temperature || !conditions.rainfall || !conditions.ph || !conditions.soilType) {
        logger.warn('Conditions not set from locationData, checking provided params...', {
          hasLocationData: !!locationData,
          conditions: conditions,
          providedParams: { temperature, rainfall, ph, soilType }
        });
        
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
        
        if (!temperature || !rainfall || !ph || !soilType) {
          
          const fallbackLat = latitude ? parseFloat(latitude) : 28.6139; // New Delhi default
          const fallbackLng = longitude ? parseFloat(longitude) : 77.2090;
          
          let defaultTemp = 25;
          let defaultRainfall = 800;
          let defaultPh = 7.0;
          let defaultSoilType = 'alluvial';
          
          if (fallbackLat > 30) {
            defaultTemp = 22;
            defaultRainfall = 600;
            defaultSoilType = 'alluvial';
          } else if (fallbackLat < 20) {
            defaultTemp = 28;
            defaultRainfall = 1200;
            defaultSoilType = 'red';
          } else {
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
      
      if (!conditions.temperature || !conditions.rainfall || !conditions.ph || !conditions.soilType) {
        logger.error('Conditions validation failed:', conditions);
        return res.status(500).json({
          success: false,
          error: 'Failed to determine environmental conditions. Please try again or provide manual parameters.',
          debug: { conditions }
        });
      }
      
      let recommendations = [];
      let realTimeUsed = false;
      
      if (lat !== null && lng !== null) {
        try {
          const userPreferences = {
            irrigation: requestData.irrigation || 'rainfed',
            farmSize: requestData.farmSize || 1,
            experience: requestData.experience || 'beginner',
            budget: requestData.budget || 'low'
          };
          
          const perfectResult = await enhancedCropRecommendationService.getPerfectRecommendations(
            { lat, lng },
            conditions.soilType,
            conditions.season,
            userPreferences
          );
          
          if (perfectResult.success && perfectResult.recommendations?.length > 0) {
            recommendations = perfectResult.recommendations.map(rec => ({
              crop_name: rec.name || rec.crop_name || rec.crop,
              name: rec.name || rec.crop_name || rec.crop,
              crop: rec.name || rec.crop_name || rec.crop,
              suitability: rec.perfectScore || rec.suitability || rec.score,
              confidence: rec.confidence || 0.9,
              perfectScore: rec.perfectScore,
              scoreBreakdown: rec.scoreBreakdown,
              recommendation: rec.recommendation,
              advantages: rec.advantages,
              risks: rec.risks,
              profitability: rec.profitability,
              marketDemand: rec.marketDemand,
              bestPractices: rec.bestPractices,
              reasons: rec.reasons || rec.advantages,
              expectedYield: rec.expectedYield || rec.yield,
              profitEstimate: rec.profitability?.estimatedProfit,
              source: 'Enhanced Perfect Recommendation'
            }));
            realTimeUsed = true;
            logger.info(`✅ Using enhanced perfect crop recommendations: ${recommendations.length} crops`);
          }
        } catch (enhancedError) {
          logger.warn('Enhanced crop recommendation unavailable, trying real-time service:', enhancedError.message);
          
          try {
            const RealTimeCropRecommendationService = require('../services/RealTimeCropRecommendationService');
            const userPreferences = {
              irrigation: requestData.irrigation || 'rainfed',
              farmSize: requestData.farmSize || 1,
              experience: requestData.experience || 'beginner',
              budget: requestData.budget || 'low'
            };
            
            const realTimeResult = await RealTimeCropRecommendationService.getRealTimeRecommendations(
              { lat, lng },
              userPreferences
            );
            
            if (realTimeResult.success && realTimeResult.recommendations?.length > 0) {
              recommendations = realTimeResult.recommendations.map(rec => ({
                crop_name: rec.crop,
                name: rec.crop,
                crop: rec.crop,
                suitability: rec.combinedScore || rec.score,
                confidence: rec.confidence,
                reasons: rec.reasons,
                expectedYield: rec.expectedYield,
                profitEstimate: rec.profitEstimate,
                source: 'Real-Time Service'
              }));
              realTimeUsed = true;
              logger.info(`✅ Using real-time crop recommendations: ${recommendations.length} crops`);
            }
          } catch (realtimeError) {
            logger.warn('Real-time crop recommendation unavailable, using location-aware engine:', realtimeError.message);
          }
        }
      }
      
      if (!realTimeUsed && locationData?.engineRecommendations && locationData.engineRecommendations.length > 0) {
        recommendations = locationData.engineRecommendations;
        const location = locationData.location?.state || locationData.location?.region || 'location';
        logger.info(`✅ Using location-aware engine recommendations: ${recommendations.length} crops for ${location}`);
        
        if (recommendations.length > 0) {
          const cropNames = recommendations.slice(0, 5).map(r => r.crop_name || r.name || r.crop).join(', ');
          logger.info(`   📍 Location-specific crops: ${cropNames}`);
        }
      } else {
        logger.warn('⚠️ No location-aware recommendations found, attempting to generate...');
        try {
          const detectedState = locationData?.location?.state || state || null;
          const detectedRegion = locationData?.location?.region || detectedState || null;
          
          if (lat && lng) {
            const forcedEngineData = await cropRecommendationEngine.getLocationData(
              lat,
              lng,
              weatherData,
              detectedState,
              detectedRegion,
              'India'
            );
            
            if (forcedEngineData.recommendations && forcedEngineData.recommendations.length > 0) {
              recommendations = forcedEngineData.recommendations;
              logger.info(`✅ Generated location-aware recommendations: ${recommendations.length} crops`);
            }
          }
        } catch (forceError) {
          logger.warn('Could not force generate location-aware recommendations:', forceError.message);
        }
        
        if (recommendations.length === 0) {
          try {
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

            logger.info('⚠️ No location-aware recommendations, trying ML model:', mlFeatures);
            const mlRecommendations = await cropRecommenderML.predict(mlFeatures);
            
            if (mlRecommendations && mlRecommendations.length > 0) {
              recommendations = mlRecommendations.map(rec => ({
                crop: rec.crop,
                name: rec.crop,
                score: rec.confidence,
                suitability: rec.confidence,
                season: rec.season || CropController.getCurrentSeason(locationData?.location?.state),
                reason: rec.reason || 'ML model recommendation',
                method: rec.method || 'ml_model',
                ml_confidence: rec.confidence
              }));
              logger.info('⚠️ Using generic ML recommendations (not location-specific):', recommendations.length);
            } else {
              logger.warn('⚠️ Using basic engine recommendations (not location-specific)');
              recommendations = cropRecommendationEngine.getCropRecommendations(
                conditions.temperature || 25,
                locationData?.humidity || weatherData?.humidity || 65,
                conditions.ph || 7.0,
                conditions.rainfall || 800,
                conditions.soilType || 'alluvial',
                locationData?.location?.state || null,
                conditions.season || null
              );
            }
          } catch (mlError) {
            logger.error('ML prediction error, using final fallback:', mlError);
            const fallbackHumidity = locationData?.humidity || weatherData?.humidity || 65;
            recommendations = cropRecommendationEngine.getCropRecommendations(
              conditions.temperature || 25,
              fallbackHumidity,
              conditions.ph || 7.0,
              conditions.rainfall || 800,
              conditions.soilType || 'alluvial',
              locationData?.location?.state || null,
              conditions.season || null
            );
          }
        }
      }
      
      const formattedRecommendations = recommendations.map((rec, index) => {
        const baseRec = {
          id: rec.id || `rec-${index}`,
          name: rec.crop || rec.name || 'Unknown Crop',
          scientificName: rec.scientificName || '',
          suitability: rec.score || rec.suitabilityScore || rec.suitability || 0,
          suitabilityScore: rec.score || rec.suitabilityScore || rec.suitability || 0,
          season: rec.season || conditions.season || CropController.getCurrentSeason(locationData?.location?.state),
          duration: rec.duration || '90-120 days',
          durationUnit: rec.durationUnit || 'days',
          estimatedYield: rec.yield || rec.expectedYield || '2-4 tons/ha',
          expectedYield: rec.yield || rec.expectedYield || '2-4 tons/ha',
          yieldUnit: rec.yieldUnit || 'tons/ha',
          marketPrice: rec.market_price || rec.marketPrice || '₹2000-₹4000/ton',
          priceUnit: rec.priceUnit || 'ton',
          reason: rec.reason || CropController.generateRecommendationReason(rec, conditions, locationData),
          reasons: rec.reasons || (rec.reason ? [rec.reason] : ['Suitable for your region']),
          advantages: rec.advantages || [],
          waterRequirements: rec.water_requirements || 'Moderate',
          requirements: rec.requirements || {}
        };

        if (rec.scoringBreakdown) {
          baseRec.scoringBreakdown = rec.scoringBreakdown;
        }
        if (rec.potentialRevenue) {
          baseRec.potentialRevenue = rec.potentialRevenue;
        }
        if (rec.profitMargin) {
          baseRec.profitMargin = rec.profitMargin;
        }
        if (rec.priceTrend) {
          baseRec.priceTrend = rec.priceTrend;
        }
        if (rec.currentMarketPrice) {
          baseRec.currentMarketPrice = rec.currentMarketPrice;
        }
        if (rec.plantingWindow) {
          baseRec.plantingWindow = rec.plantingWindow;
        }

        return baseRec;
      });
      
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

  static getCurrentSeason(state) {
    const month = new Date().getMonth() + 1; // 1-12
    
    const northStates = ['Punjab', 'Haryana', 'Uttar Pradesh', 'Delhi', 'Himachal Pradesh', 'Uttarakhand'];
    if (northStates.includes(state)) {
      if (month >= 3 && month <= 5) return 'summer';
      if (month >= 6 && month <= 9) return 'monsoon';
      if (month >= 10 && month <= 11) return 'autumn';
      return 'winter';
    }

    if (month >= 6 && month <= 9) return 'monsoon';
    if (month >= 10 && month <= 12) return 'winter';
    if (month >= 1 && month <= 2) return 'winter';
    return 'summer';
  }

  static getFallbackRecommendations(conditions) {
    const { temperature, rainfall, ph, soilType, season } = conditions;
    
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

  static async getAnalytics(req, res) {
    try {
      const userId = req.user?._id;
      
      let userCrops = [];
      if (userId) {
        const CropModel = require('../models/Crop');
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
