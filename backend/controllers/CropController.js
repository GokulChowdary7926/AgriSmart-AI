const mongoose = require('mongoose');
const Crop = require('../models/Crop');
const logger = require('../utils/logger');
const cropRecommendationEngine = require('../services/CropRecommendationEngine');
const enhancedCropRecommendationService = require('../services/EnhancedCropRecommendationService');
const cropRecommenderML = require('../services/ml/CropRecommenderML');
const weatherService = require('../services/WeatherService');
const perplexityCropService = require('../services/PerplexityCropService');
const marketPriceAPIService = require('../services/marketPriceAPIService');
const { badRequest, notFound, serverError, serviceUnavailable, ok } = require('../utils/httpResponses');

function mongoReady() {
  try {
    return mongoose && mongoose.connection && mongoose.connection.readyState === 1;
  } catch (_) {
    return false;
  }
}

class CropController {
  static success(res, data, { isFallback = false, source = 'AgriSmart AI', degradedReason = null, extra = {} } = {}) {
    return ok(res, data, {
      source,
      isFallback,
      ...(degradedReason ? { degradedReason } : {}),
      ...extra
    });
  }

  static async getAll(req, res) {
    try {
      const { 
        season, 
        search, 
        page = 1, 
        limit = 20,
        sort = 'name'
      } = req.query;

      if (!Crop || !mongoReady()) {
        return CropController.success(res, [], { isFallback: true, degradedReason: 'mongo_unavailable', extra: { pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 } } });
      }
      
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
      
      return CropController.success(
        res,
        crops,
        {
          extra: {
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total,
              pages: Math.ceil(total / limit)
            }
          }
        }
      );
    } catch (error) {
      logger.error('Error fetching crops:', error);
      return serverError(res, error.message);
    }
  }
  
  static async getById(req, res) {
    try {
      if (!Crop || !mongoReady()) {
        return serviceUnavailable(res, 'Crop store unavailable', { degradedReason: 'mongo_unavailable' });
      }
      const crop = await Crop.findById(req.params.id);
      
      if (!crop) {
        return notFound(res, 'Crop not found');
      }
      
      return CropController.success(res, crop);
    } catch (error) {
      logger.error('Error fetching crop:', error);
      return serverError(res, error.message);
    }
  }
  
  static async create(req, res) {
    try {
      if (!Crop || !mongoReady()) {
        return serviceUnavailable(res, 'Crop store unavailable; cannot persist right now', { degradedReason: 'mongo_unavailable' });
      }
      const crop = new Crop({
        ...req.body,
        createdBy: req.user?._id
      });
      
      await crop.save();
      
      return res.status(201).json({
        success: true,
        data: crop
      });
    } catch (error) {
      logger.error('Error creating crop:', error);
      return badRequest(res, error.message);
    }
  }
  
  static async update(req, res) {
    try {
      if (!Crop || !mongoReady()) {
        return serviceUnavailable(res, 'Crop store unavailable; cannot update right now', { degradedReason: 'mongo_unavailable' });
      }
      const crop = await Crop.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          updatedBy: req.user?._id
        },
        { new: true, runValidators: true }
      );
      
      if (!crop) {
        return notFound(res, 'Crop not found');
      }
      
      return CropController.success(res, crop);
    } catch (error) {
      logger.error('Error updating crop:', error);
      return badRequest(res, error.message);
    }
  }
  
  static async delete(req, res) {
    try {
      if (!Crop || !mongoReady()) {
        return serviceUnavailable(res, 'Crop store unavailable; cannot delete right now', { degradedReason: 'mongo_unavailable' });
      }
      const crop = await Crop.findByIdAndDelete(req.params.id);
      
      if (!crop) {
        return notFound(res, 'Crop not found');
      }
      
      return CropController.success(
        res,
        { message: 'Crop deleted successfully' },
        { extra: { message: 'Crop deleted successfully' } }
      );
    } catch (error) {
      logger.error('Error deleting crop:', error);
      return serverError(res, error.message);
    }
  }
  
  static async recommend(req, res) {
    try {
      const isFastMode = process.env.NODE_ENV === 'test' || process.env.FEATURE_EXTERNAL_APIS === 'false';
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
          
          let displayWeather = engineData.weather;
          try {
            const currentWeather = await weatherService.getWeatherByCoords(lat, lng);
            if (currentWeather) {
              displayWeather = {
                temperature: currentWeather.temperature ?? engineData.weather?.temperature ?? 25,
                humidity: currentWeather.humidity ?? engineData.weather?.humidity ?? 65,
                rainfall: currentWeather.rainfall != null ? Math.round(Number(currentWeather.rainfall) * 10) / 10 : (engineData.weather?.rainfall ?? 800),
                conditions: currentWeather.weather || engineData.weather?.conditions || 'Clear'
              };
            }
          } catch (weatherErr) {
            logger.warn('Current weather API failed, using engine weather for display:', weatherErr.message);
          }
          const climaticRainfall = engineData.weather?.rainfall ?? 800;
          locationData = {
            location: engineData.location,
            weather: displayWeather,
            soil: engineData.soil,
            temperature: (displayWeather?.temperature ?? engineData.weather?.temperature) || 25,
            rainfall: climaticRainfall,
            ph: parseFloat(engineData.soil?.ph) || 7.0,
            soilType: engineData.soil?.soil_type || 'alluvial',
            humidity: (displayWeather?.humidity ?? engineData.weather?.humidity) ?? 65
          };
          const temp = parseFloat(temperature) || locationData.temperature || 25;
          const rain = parseFloat(rainfall) || climaticRainfall;
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
        }
        
        if (!temperature || !rainfall || !ph || !soilType) {
          
          const fallbackLat = latitude ? parseFloat(latitude) : 28.6139;
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
        return serverError(
          res,
          'Failed to determine environmental conditions. Please try again or provide manual parameters.',
          { conditions }
        );
      }
      
      let recommendations = [];
      let realTimeUsed = false;

      const stateForApi = locationData?.location?.state || state || 'India';
      const districtForApi = locationData?.location?.district || locationData?.location?.county || '';

      if (perplexityCropService.isAvailable()) {
        try {
          const aiResult = await perplexityCropService.getRecommendations({
            state: stateForApi,
            district: districtForApi,
            season: conditions.season || CropController.getCurrentSeason(stateForApi),
            soilType: conditions.soilType || 'alluvial',
            temperature: conditions.temperature || 25,
            rainfall: conditions.rainfall || 800,
            ph: conditions.ph || 7.0,
            humidity: locationData?.humidity || 65
          });
          if (aiResult.success && aiResult.recommendations && aiResult.recommendations.length >= 3) {
            let marketPricesByCrop = {};
            try {
              const marketList = await marketPriceAPIService.getRealTimePrices(null, stateForApi);
              if (Array.isArray(marketList)) {
                marketList.forEach((p) => {
                  const name = (p.commodity || p.crop || '').toString().toLowerCase().trim();
                  if (!name) return;
                  if (!marketPricesByCrop[name]) marketPricesByCrop[name] = [];
                  const val = p.price?.value ?? p.price?.originalValue;
                  const unit = p.price?.unit || p.price?.originalUnit || 'kg';
                  const perQuintal = unit === 'quintal' || unit === 'q' ? val : (val && val * 100) || 0;
                  marketPricesByCrop[name].push({ perQuintal, perKg: val, market: p.market?.name });
                });
              }
            } catch (marketErr) {
              logger.warn('Market price fetch for crop enrichment failed:', marketErr.message);
            }
            const rawRecs = aiResult.recommendations.slice(0, 10);
            recommendations = rawRecs.map((rec) => {
              const cropName = (rec.crop || rec.name || '').toString().trim();
              const cropKey = cropName.toLowerCase();
              const prices = marketPricesByCrop[cropKey] || marketPricesByCrop[cropKey.replace(/\s+/g, '')];
              const bestPrice = prices && prices.length ? prices.reduce((a, b) => (b.perQuintal > a.perQuintal ? b : a), prices[0]) : null;
              const perTon = bestPrice ? Math.round(bestPrice.perQuintal * 10) : null;
              const marketPriceDisplay = perTon != null ? `₹${perTon}/ton` : '₹2000-4000/ton';
              return {
                crop_name: cropName,
                name: cropName,
                crop: cropName,
                suitability: rec.suitability || 85,
                suitabilityScore: rec.suitability || 85,
                confidence: rec.confidence || 0.9,
                reason: rec.suitabilityReason,
                reasons: rec.suitabilityReason ? [rec.suitabilityReason] : ['Suitable for your region'],
                expectedYield: rec.expectedYield || '2-4 tons/ha',
                duration: rec.duration || '90-120 days',
                market_price: marketPriceDisplay,
                marketPrice: marketPriceDisplay
              };
            });
            realTimeUsed = true;
            logger.info(`✅ Using smart crop recommendations: ${recommendations.length} crops with market prices (₹/ton)`);
          }
        } catch (aiErr) {
          logger.warn('Smart crop recommendation unavailable:', aiErr.message);
        }
      }

      if (!realTimeUsed && lat !== null && lng !== null) {
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
            recommendations = perfectResult.recommendations.slice(0, 10).map(rec => ({
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
              market_price: rec.market_price || rec.marketPrice,
              marketPrice: rec.marketPrice || rec.market_price
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
              recommendations = realTimeResult.recommendations.slice(0, 10).map(rec => ({
                crop_name: rec.crop,
                name: rec.crop,
                crop: rec.crop,
                suitability: rec.combinedScore || rec.score,
                confidence: rec.confidence,
                reasons: rec.reasons,
                expectedYield: rec.expectedYield,
                profitEstimate: rec.profitEstimate,
                market_price: rec.market_price || rec.marketPrice,
                marketPrice: rec.marketPrice || rec.market_price
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

      if (recommendations.length > 0 && recommendations.length < 5) {
        const fallbackRecs = cropRecommendationEngine.getCropRecommendations(
          conditions.temperature || 25,
          locationData?.humidity || weatherData?.humidity || 65,
          conditions.ph || 7.0,
          conditions.rainfall || 800,
          conditions.soilType || 'alluvial',
          locationData?.location?.state || null,
          conditions.season || null
        );
        const existingNames = new Set(
          recommendations.map(r => (r.crop || r.name || r.crop_name || '').toString().toLowerCase().trim())
        );
        for (const rec of fallbackRecs) {
          if (recommendations.length >= 10) break;
          const name = (rec.crop || rec.name || rec.crop_name || '').toString().toLowerCase().trim();
          if (name && !existingNames.has(name)) {
            existingNames.add(name);
            recommendations.push({
              crop_name: rec.crop_name || rec.crop || rec.name,
              name: rec.name || rec.crop_name || rec.crop,
              crop: rec.crop || rec.name || rec.crop_name,
              suitability: rec.suitability || rec.score,
              suitabilityScore: rec.suitabilityScore || rec.suitability || rec.score,
              season: rec.season,
              duration: rec.duration,
              expectedYield: rec.expectedYield || rec.yield,
              market_price: rec.market_price,
              marketPrice: rec.marketPrice,
              reasons: rec.reasons || (rec.reason ? [rec.reason] : [])
            });
          }
        }
        if (recommendations.length > 0) {
          logger.info(`Padded recommendations to ${recommendations.length} crops (min 5)`);
        }
      }

      recommendations = recommendations.slice(0, 10);

      const cropToApiCommodity = {
        rice: ['paddy', 'rice'],
        wheat: ['wheat'],
        maize: ['maize', 'corn'],
        sugarcane: ['sugarcane', 'sugar cane', 'gur'],
        cotton: ['cotton'],
        soybean: ['soybean', 'soya'],
        potato: ['potato'],
        onion: ['onion'],
        tomato: ['tomato'],
        groundnut: ['groundnut', 'peanut'],
        mustard: ['mustard', 'rape seed'],
        chickpea: ['gram', 'chana', 'chickpea'],
        pigeonpea: ['arhar', 'tur', 'pigeon pea'],
        bajra: ['bajra', 'pearl millet'],
        jowar: ['jowar', 'sorghum']
      };

      function addPriceToMap(map, key, priceObj) {
        const k = key.toLowerCase().trim();
        if (!k) return;
        if (!map[k]) map[k] = [];
        map[k].push(priceObj);
      }

      let marketPricesByCrop = {};
      if (!isFastMode) {
        try {
          const marketList = await marketPriceAPIService.getRealTimePrices(null, stateForApi);
          if (Array.isArray(marketList) && marketList.length > 0) {
            marketList.forEach((p) => {
              const apiCommodity = (p.commodity || p.crop || '').toString().toLowerCase().trim();
              if (!apiCommodity) return;
              const val = p.price?.originalValue ?? p.price?.value;
              const unit = (p.price?.originalUnit || p.price?.unit || 'quintal').toString().toLowerCase();
              const perQuintal = unit === 'quintal' || unit === 'q' ? (val ? parseFloat(val) : 0) : (val ? parseFloat(val) * 100 : 0);
              const priceObj = { perQuintal, perKg: val ? parseFloat(val) / 100 : 0 };
              addPriceToMap(marketPricesByCrop, apiCommodity, priceObj);
              const cropKeyForApi = Object.keys(cropToApiCommodity).find(c => cropToApiCommodity[c].some(a => apiCommodity.includes(a) || a.includes(apiCommodity)));
              if (cropKeyForApi) addPriceToMap(marketPricesByCrop, cropKeyForApi, priceObj);
            });
          }
        } catch (marketErr) {
          logger.warn('Market price bulk fetch failed:', marketErr.message);
        }
      }

      for (const rec of recommendations) {
        const cropKey = (rec.crop || rec.name || rec.crop_name || '').toString().toLowerCase().trim();
        if (!cropKey) continue;
        const keysToTry = [cropKey, cropKey.replace(/\s+/g, '')];
        const aliases = cropToApiCommodity[cropKey] || [];
        keysToTry.push(...aliases);
        let best = null;
        for (const k of keysToTry) {
          const prices = marketPricesByCrop[k];
          if (prices && prices.length) {
            const b = prices.reduce((a, p) => (p.perQuintal > a.perQuintal ? p : a), prices[0]);
            if (!best || b.perQuintal > best.perQuintal) best = b;
          }
        }
        if (!isFastMode && !best && (cropKey in cropToApiCommodity)) {
          try {
            for (const apiName of cropToApiCommodity[cropKey]) {
              const perCropList = await marketPriceAPIService.getRealTimePrices(apiName, stateForApi);
              if (Array.isArray(perCropList) && perCropList.length > 0) {
                for (const p of perCropList) {
                  const val = p.price?.originalValue ?? p.price?.value;
                  const unit = (p.price?.originalUnit || p.price?.unit || 'quintal').toString().toLowerCase();
                  const perQuintal = unit === 'quintal' || unit === 'q' ? (val ? parseFloat(val) : 0) : (val ? parseFloat(val) * 100 : 0);
                  if (perQuintal > 0 && (!best || perQuintal > best.perQuintal)) best = { perQuintal };
                }
                if (best) break;
              }
            }
          } catch (e) {
            logger.debug('Per-commodity market price fetch failed for ' + cropKey, e.message);
          }
        }
        if (best && best.perQuintal > 0) {
          const perTon = Math.round(best.perQuintal * 10);
          rec.market_price = `₹${perTon.toLocaleString('en-IN')}/ton`;
          rec.marketPrice = rec.market_price;
        } else {
          rec.market_price = '₹2000-₹4000/ton';
          rec.marketPrice = rec.market_price;
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
          duration: (rec.duration || '90-120').replace(/\s*days\s*$/i, '').trim() || '90-120',
          durationUnit: 'days',
          estimatedYield: (rec.yield || rec.expectedYield || '2-4').replace(/\s*tons?\/ha\s*$/i, '').trim() || '2-4',
          expectedYield: (rec.yield || rec.expectedYield || '2-4').replace(/\s*tons?\/ha\s*$/i, '').trim() || '2-4',
          yieldUnit: 'tons/ha',
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
      
      const recommendationData = {
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
      };
      return CropController.success(
        res,
        recommendationData,
        {
          isFallback: !realTimeUsed,
          degradedReason: !realTimeUsed ? 'crop_recommendation_fallback' : null
        }
      );
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      return serverError(res, error.message);
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
    const month = new Date().getMonth() + 1;
    
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
    const { season } = conditions;
    
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
      if (!Crop || typeof Crop.findBySeason !== 'function' || !mongoReady()) {
        return CropController.success(res, [], { isFallback: true, degradedReason: 'mongo_unavailable' });
      }
      
      const crops = await Crop.findBySeason(season);
      
      return CropController.success(res, crops);
    } catch (error) {
      logger.error('Error fetching crops by season:', error);
      return serverError(res, error.message);
    }
  }

  static async getAnalytics(req, res) {
    try {
      const userId = req.user?._id;
      
      let userCrops = [];
      if (userId && mongoReady()) {
        const CropModel = require('../models/Crop');
        userCrops = await CropModel.find({ createdBy: userId }).limit(10).sort({ createdAt: -1 });
      }
      
      return CropController.success(res, {
        summary: {
          totalCrops: userCrops.length,
          activeCrops: userCrops.filter(c => c.status === 'active' || c.status === 'growing').length
        },
        recentCrops: userCrops.map(crop => ({
          name: crop.name,
          status: crop.status || 'active',
          healthScore: crop.healthScore || 85
        }))
      });
    } catch (error) {
      logger.error('Error fetching crops analytics:', error);
      return serverError(res, error.message);
    }
  }
}

module.exports = CropController;
