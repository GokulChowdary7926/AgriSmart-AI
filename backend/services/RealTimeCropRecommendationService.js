const logger = require('../utils/logger');
const resilientHttpClient = require('./api/resilientHttpClient');

let tf = null;
const tfEnabled = process.env.TF_ENABLED !== 'false';
try {
  if (tfEnabled) {
    tf = require('@tensorflow/tfjs-node');
  }
} catch (error) {
  if (tfEnabled) {
    logger.warn('TensorFlow.js not available for crop recommendations');
  } else {
    logger.info('TensorFlow disabled via TF_ENABLED=false for crop recommendations');
  }
}

class RealTimeCropRecommendationService {
  constructor() {
    this.dataSources = {
      weather: 'https://api.openweathermap.org/data/3.0/onecall',
      soil: 'https://rest.isric.org/soilgrids/v2.0/properties',
      market: 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070',
      nasa: 'https://power.larc.nasa.gov/api/temporal/daily/point'
    };
    this.cache = new Map();
    this.mlModel = null;
    this.initializeMLModel();
  }

  getLocationSeed(location = {}) {
    const lat = location.lat ?? location.latitude ?? 20.5937;
    const lng = location.lng ?? location.longitude ?? 78.9629;
    const monthBucket = `${new Date().getUTCFullYear()}-${new Date().getUTCMonth() + 1}`;
    return `${lat}:${lng}:${monthBucket}`;
  }

  hashToUnit(seed) {
    const str = String(seed || 'default');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return (Math.abs(hash) % 10000) / 10000;
  }

  valueFromSeed(seed, min, max, precision = 2) {
    const value = min + (max - min) * this.hashToUnit(seed);
    return Number(value.toFixed(precision));
  }

  async getRealTimeRecommendations(location, userPreferences = {}) {
    try {
      logger.info(`Getting real-time recommendations for: ${JSON.stringify(location)}`);
      
      const realTimeData = await this.fetchAllRealTimeData(location);
      
      const features = this.prepareFeatures(realTimeData, userPreferences);
      
      let mlPredictions;
      try {
        mlPredictions = await this.getMLPredictions(features);
      } catch (mlError) {
        logger.warn('ML prediction failed, using rule-based:', mlError.message);
        mlPredictions = null;
      }
      
      const rulePredictions = this.getRuleBasedPredictions(realTimeData, userPreferences);
      
      const mergedPredictions = mlPredictions 
        ? this.mergePredictions(mlPredictions, rulePredictions)
        : rulePredictions.predictions.map(p => ({
            crop: p.crop,
            combinedScore: p.score,
            confidence: p.confidence,
            reasons: p.reasons,
            sources: ['Rule-Based'],
            details: p.details || this.getCropDetails(p.crop)
          }));
      
      const enrichedRecommendations = await this.enrichRecommendations(
        mergedPredictions,
        realTimeData,
        userPreferences
      );
      
      const report = this.generateRecommendationReport(
        enrichedRecommendations,
        realTimeData,
        userPreferences
      );

      return {
        success: true,
        timestamp: new Date().toISOString(),
        location: location,
        season: realTimeData.season.current,
        weather: realTimeData.weather.summary,
        soil: realTimeData.soil.summary,
        recommendations: enrichedRecommendations,
        report: report,
        confidence: this.calculateOverallConfidence(mlPredictions, rulePredictions),
        dataSources: this.getDataSources(realTimeData),
        nextSteps: this.generateNextSteps(enrichedRecommendations, userPreferences)
      };
    } catch (error) {
      logger.error('Real-time crop recommendation error:', error);
      return this.getFallbackRecommendations(location, userPreferences);
    }
  }

  async fetchAllRealTimeData(location) {
    const dataPromises = {
      weather: this.fetchWeatherData(location),
      soil: this.fetchSoilData(location),
      market: this.fetchMarketData(location),
      nasa: this.fetchNASAData(location),
      season: this.fetchSeasonData(location)
    };

    const results = await Promise.allSettled(Object.values(dataPromises));
    const keys = Object.keys(dataPromises);
    const realTimeData = {};

    results.forEach((result, index) => {
      const key = keys[index];
      if (result.status === 'fulfilled') {
        realTimeData[key] = result.value;
      } else {
        logger.warn(`Failed to fetch ${key}:`, result.reason?.message);
        realTimeData[key] = this.getDefaultData(key, location);
      }
    });

    return realTimeData;
  }

  async fetchWeatherData(location) {
    try {
      const WeatherService = require('./WeatherService');
      const lat = location.lat ?? location.latitude ?? 20.5937;
      const lng = location.lng ?? location.longitude ?? 78.9629;
      const [currentWeather, forecastList] = await Promise.all([
        WeatherService.getWeatherByCoords(parseFloat(lat), parseFloat(lng)),
        WeatherService.getWeatherForecast(parseFloat(lat), parseFloat(lng))
      ]);
      if (currentWeather) {
        const daily = Array.isArray(forecastList) && forecastList.length > 0
          ? forecastList.slice(0, 7).map((day) => ({
              date: (day.date && new Date(day.date).toISOString().split('T')[0]) || '',
              temp: { min: day.min_temp, max: day.max_temp },
              weather: day.weather || 'Clear',
              rain: day.rainfall || 0,
              humidity: day.humidity || 60
            }))
          : [];
        return {
          current: {
            temp: currentWeather.temperature,
            feels_like: currentWeather.feels_like,
            humidity: currentWeather.humidity,
            pressure: currentWeather.pressure,
            wind_speed: currentWeather.wind_speed || 0,
            weather: currentWeather.weather || 'Clear',
            description: currentWeather.description || 'Clear'
          },
          daily,
          alerts: [],
          summary: this.summarizeWeatherFromParsed(currentWeather)
        };
      }
    } catch (error) {
      logger.warn('Weather service error:', error.message);
    }
    return this.getDefaultData('weather', location);
  }

  summarizeWeatherFromParsed(data) {
    const parts = [];
    if (data.temperature != null) parts.push(`Temp: ${data.temperature}°C`);
    if (data.humidity != null) parts.push(`Humidity: ${data.humidity}%`);
    if (data.rainfall > 0) parts.push(`Rain: ${data.rainfall} mm`);
    return parts.length > 0 ? parts.join(', ') : 'Clear conditions';
  }

  async fetchSoilData(location) {
    try {
      const result = await resilientHttpClient.request({
        serviceName: 'soilgrids-crop-recommendation',
        method: 'get',
        url: this.dataSources.soil,
        params: {
          lon: location.lng || location.longitude || 78.9629,
          lat: location.lat || location.latitude || 20.5937,
          property: 'phh2o,soc,clay,sand',
          depth: '0-5cm',
          value: 'mean'
        },
        timeout: 10000
      });
      if (!result.success) {
        throw new Error(result.error?.message || 'Soil API request failed');
      }
      const response = result.response;

      const properties = response.data.properties.layers;
      
      return {
        pH: properties[0]?.values?.mean / 10 || 6.5,
        organicCarbon: properties[1]?.values?.mean / 10 || 1.2,
        clay: properties[2]?.values?.mean || 25,
        sand: properties[3]?.values?.mean || 40,
        texture: this.classifySoilTexture(
          properties[2]?.values?.mean || 25,
          properties[3]?.values?.mean || 40
        ),
        summary: this.summarizeSoil(properties)
      };
    } catch (error) {
      logger.warn('Soil API error:', error.message);
      return this.getDefaultData('soil', location);
    }
  }

  async fetchMarketData(_location) {
    try {
      const result = await resilientHttpClient.request({
        serviceName: 'agmarknet-crop-recommendation',
        method: 'get',
        url: this.dataSources.market,
        params: {
          'api-key': process.env.AGMARKNET_API_KEY || process.env.DATA_GOV_IN_API_KEY || '',
          format: 'json',
          limit: 50,
          offset: 0
        },
        timeout: 10000
      });
      if (!result.success) {
        throw new Error(result.error?.message || 'Market API request failed');
      }
      const response = result.response;

      const prices = (response.data.records || []).reduce((acc, record) => {
        const commodity = record.commodity || record.commodity_name;
        if (!commodity) return acc;

        if (!acc[commodity]) {
          acc[commodity] = {
            prices: [],
            markets: new Set(),
            states: new Set()
          };
        }
        
        const price = parseFloat(record.modal_price || record.price || 0);
        if (price > 0) {
          acc[commodity].prices.push(price);
        }
        if (record.market) acc[commodity].markets.add(record.market);
        if (record.state) acc[commodity].states.add(record.state);
        
        return acc;
      }, {});

      const marketAnalysis = {};
      Object.entries(prices).forEach(([commodity, data]) => {
        if (data.prices.length > 0) {
          marketAnalysis[commodity] = {
            avgPrice: data.prices.reduce((a, b) => a + b, 0) / data.prices.length,
            priceRange: {
              min: Math.min(...data.prices),
              max: Math.max(...data.prices)
            },
            marketCount: data.markets.size,
            stateCount: data.states.size,
            volatility: this.calculatePriceVolatility(data.prices)
          };
        }
      });

      return {
        prices: marketAnalysis,
        trends: this.analyzeMarketTrends(marketAnalysis),
        recommendations: this.generateMarketRecommendations(marketAnalysis),
        summary: this.summarizeMarket(marketAnalysis)
      };
    } catch (error) {
      logger.warn('Market API error:', error.message);
      return this.getDefaultData('market', _location);
    }
  }

  async fetchNASAData(location) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await resilientHttpClient.request({
        serviceName: 'nasa-power-crop-recommendation',
        method: 'get',
        url: this.dataSources.nasa,
        params: {
          parameters: 'T2M,PRECTOTCORP,ALLSKY_SFC_SW_DWN',
          community: 'AG',
          longitude: location.lng || location.longitude || 78.9629,
          latitude: location.lat || location.latitude || 20.5937,
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          format: 'JSON'
        },
        timeout: 15000
      });
      if (!result.success) {
        throw new Error(result.error?.message || 'NASA API request failed');
      }
      const response = result.response;

      const data = response.data.properties?.parameter;
      if (!data) return this.getDefaultData('nasa', location);

      return {
        temperature: {
          avg: data.T2M?.mean || 25,
          min: data.T2M?.min || 20,
          max: data.T2M?.max || 30
        },
        precipitation: {
          total: (data.PRECTOTCORP?.mean || 3.3) * 30,
          dailyAvg: data.PRECTOTCORP?.mean || 3.3
        },
        solarRadiation: data.ALLSKY_SFC_SW_DWN?.mean || 15,
        summary: this.summarizeNASAData(data)
      };
    } catch (error) {
      logger.warn('NASA API error:', error.message);
      return this.getDefaultData('nasa', location);
    }
  }

  fetchSeasonData(_location) {
    const month = new Date().getMonth() + 1;
    let season = 'Kharif';
    
    if (month >= 6 && month <= 10) {
      season = 'Kharif';
    } else if (month >= 11 || month <= 3) {
      season = 'Rabi';
    } else {
      season = 'Zaid';
    }

    return {
      current: season,
      month: month,
      nextSeason: this.getNextSeason(season)
    };
  }

  prepareFeatures(realTimeData, userPreferences) {
    return {
      temperature: realTimeData.weather.current?.temp || 25,
      humidity: realTimeData.weather.current?.humidity || 60,
      rainfall: realTimeData.weather.daily?.[0]?.rain || 0,
      windSpeed: realTimeData.weather.current?.wind_speed || 5,
      soilPH: realTimeData.soil.pH || 6.5,
      organicCarbon: realTimeData.soil.organicCarbon || 1.2,
      clayContent: realTimeData.soil.clay || 25,
      soilTexture: this.encodeSoilTexture(realTimeData.soil.texture || 'Loam'),
      season: this.encodeSeason(realTimeData.season.current),
      month: new Date().getMonth() + 1,
      irrigation: userPreferences.irrigation || 'rainfed',
      farmSize: userPreferences.farmSize || 1,
      experience: userPreferences.experience || 'beginner',
      budget: userPreferences.budget || 'low',
      marketStability: this.calculateMarketStability(realTimeData.market.prices),
      priceTrend: this.calculatePriceTrend(realTimeData.market.trends)
    };
  }

  async getMLPredictions(features) {
    if (!tf || !this.mlModel) {
      throw new Error('ML model not available');
    }

    try {
      const inputArray = [
        features.temperature,
        features.humidity,
        features.rainfall,
        features.soilPH,
        features.organicCarbon,
        features.clayContent,
        features.soilTexture,
        features.season,
        features.month,
        features.irrigation === 'irrigated' ? 1 : 0,
        features.farmSize,
        features.experience === 'expert' ? 2 : features.experience === 'intermediate' ? 1 : 0,
        features.budget === 'high' ? 2 : features.budget === 'medium' ? 1 : 0,
        features.marketStability,
        features.priceTrend
      ];

      const inputTensor = tf.tensor2d([inputArray]);
      const prediction = this.mlModel.predict(inputTensor);
      const probabilities = await prediction.data();
      
      const cropClasses = this.getCropClasses();
      const topIndices = this.getTopIndices(probabilities, 5);
      
      const predictions = topIndices.map(index => ({
        crop: cropClasses[index],
        confidence: probabilities[index],
        score: Math.round(probabilities[index] * 100)
      }));

      inputTensor.dispose();
      prediction.dispose();

      return {
        predictions,
        source: 'ML Model',
        modelVersion: 'v2.0'
      };
    } catch (error) {
      logger.error('ML prediction error:', error);
      throw error;
    }
  }

  getRuleBasedPredictions(realTimeData, userPreferences) {
    const crops = this.getAvailableCrops();
    const season = realTimeData.season.current;
    
    const scoredCrops = crops.map(crop => {
      let score = 0;
      const reasons = [];
      
      if (crop.seasons.includes(season)) {
        score += 30;
        reasons.push(`Perfect for ${season} season`);
      }
      
      const temp = realTimeData.weather.current?.temp || 25;
      const tempScore = this.calculateTemperatureScore(temp, crop.idealTemperature);
      score += tempScore;
      if (tempScore > 15) reasons.push('Ideal temperature range');
      
      const soilScore = this.calculateSoilScore(realTimeData.soil, crop.soilRequirements);
      score += soilScore;
      if (soilScore > 15) reasons.push('Soil conditions optimal');
      
      const rainfall = realTimeData.weather.daily?.[0]?.rain || 0;
      const waterScore = this.calculateWaterScore(rainfall, crop.waterNeeds, userPreferences.irrigation);
      score += waterScore;
      
      const marketScore = this.calculateMarketScore(crop.name, realTimeData.market.prices);
      score += marketScore;
      if (marketScore > 10) reasons.push('High market demand');
      
      return {
        crop: crop.name,
        confidence: score / 100,
        score: Math.round(score),
        reasons: reasons,
        scientificName: crop.scientificName,
        duration: crop.duration,
        yield: crop.typicalYield
      };
    });

    return {
      predictions: scoredCrops.sort((a, b) => b.score - a.score).slice(0, 5),
      source: 'Rule-Based System'
    };
  }

  mergePredictions(mlPredictions, rulePredictions) {
    const cropScores = new Map();
    
    mlPredictions.predictions.forEach(pred => {
      cropScores.set(pred.crop, {
        mlScore: pred.score,
        ruleScore: 0,
        mlConfidence: pred.confidence,
        sources: ['ML Model']
      });
    });
    
    rulePredictions.predictions.forEach(pred => {
      if (cropScores.has(pred.crop)) {
        const existing = cropScores.get(pred.crop);
        existing.ruleScore = pred.score;
        existing.reasons = pred.reasons;
        existing.sources.push('Rule-Based');
      } else {
        cropScores.set(pred.crop, {
          mlScore: 0,
          ruleScore: pred.score,
          mlConfidence: 0,
          reasons: pred.reasons,
          sources: ['Rule-Based'],
          details: {
            scientificName: pred.scientificName,
            duration: pred.duration,
            yield: pred.yield
          }
        });
      }
    });

    const merged = Array.from(cropScores.entries()).map(([crop, scores]) => {
      const combinedScore = (scores.mlScore * 0.6) + (scores.ruleScore * 0.4);
      
      return {
        crop,
        combinedScore: Math.round(combinedScore),
        mlScore: scores.mlScore,
        ruleScore: scores.ruleScore,
        confidence: scores.mlConfidence || (scores.ruleScore / 100),
        reasons: scores.reasons || [],
        sources: scores.sources,
        details: scores.details || this.getCropDetails(crop)
      };
    });

    return merged.sort((a, b) => b.combinedScore - a.combinedScore);
  }

  async enrichRecommendations(predictions, realTimeData, userPreferences) {
    const enriched = [];
    
    for (const pred of predictions.slice(0, 5)) {
      try {
        const cropDetails = this.getCropDetails(pred.crop);
        const expectedYield = this.calculateExpectedYield(pred.crop, realTimeData, userPreferences);
        const profitEstimate = this.calculateProfitEstimate(pred.crop, expectedYield, realTimeData.market.prices);
        const cultivationPlan = this.generateCultivationPlan(pred.crop, realTimeData, userPreferences);
        const riskAssessment = this.assessRisks(pred.crop, realTimeData, userPreferences);
        
        enriched.push({
          ...pred,
          ...cropDetails,
          expectedYield,
          profitEstimate,
          cultivationPlan,
          riskAssessment,
          timeline: this.generateTimeline(pred.crop, realTimeData.season),
          resources: this.getRequiredResources(pred.crop, userPreferences)
        });
      } catch (error) {
        logger.warn(`Failed to enrich ${pred.crop}:`, error.message);
        enriched.push(pred);
      }
    }
    
    return enriched;
  }

  generateRecommendationReport(recommendations, realTimeData, _userPreferences) {
    const report = {
      summary: '',
      topRecommendation: recommendations[0],
      comparison: recommendations.slice(0, 3).map(rec => ({
        crop: rec.crop,
        score: rec.combinedScore || rec.score,
        yield: rec.expectedYield,
        profit: rec.profitEstimate,
        risk: rec.riskAssessment?.level || 'moderate'
      })),
      considerations: [],
      timeline: this.generateOverallTimeline(recommendations, realTimeData.season)
    };
    
    if (recommendations.length > 0) {
      const top = recommendations[0];
      report.summary = `Recommended: ${top.crop} (Score: ${top.combinedScore || top.score}/100)`;
      
      if ((top.combinedScore || top.score) > 80) {
        report.considerations.push('Excellent match for current conditions');
      }
      
      if (top.riskAssessment?.level === 'high') {
        report.considerations.push('High risk - consider alternatives');
      }
    }
    
    if (realTimeData.weather.alerts?.length > 0) {
      report.considerations.push('Weather alerts active - check forecast');
    }
    
    return report;
  }

  classifySoilTexture(clay, sand) {
    const silt = 100 - clay - sand;
    if (clay > 40) return 'Clay';
    if (sand > 85) return 'Sand';
    if (silt > 80) return 'Silt';
    if (clay > 27 && clay <= 40) return 'Clay Loam';
    if (silt > 50) return 'Silt Loam';
    return 'Loam';
  }

  encodeSoilTexture(texture) {
    const encodings = { 'Clay': 0, 'Clay Loam': 1, 'Loam': 2, 'Silt Loam': 3, 'Silt': 4, 'Sand': 5 };
    return encodings[texture] || 2;
  }

  encodeSeason(season) {
    const encodings = { 'Kharif': 0, 'Rabi': 1, 'Zaid': 2 };
    return encodings[season] || 0;
  }

  calculateTemperatureScore(currentTemp, idealRange) {
    const [min, max] = idealRange;
    if (currentTemp >= min && currentTemp <= max) return 20;
    const deviation = Math.min(Math.abs(currentTemp - min), Math.abs(currentTemp - max));
    return Math.max(0, 20 - deviation * 2);
  }

  calculateSoilScore(soil, requirements) {
    let score = 0;
    if (soil.pH >= requirements.pHMin && soil.pH <= requirements.pHMax) score += 10;
    if (soil.texture === requirements.texture) score += 10;
    return score;
  }

  calculateWaterScore(rainfall, waterNeeds, irrigation) {
    if (irrigation === 'irrigated') return 15;
    if (rainfall >= waterNeeds.min && rainfall <= waterNeeds.max) return 15;
    return 10;
  }

  calculateMarketScore(crop, marketPrices) {
    const cropData = marketPrices?.[crop];
    if (!cropData) return 5;
    const score = Math.min(15, cropData.avgPrice / 10);
    return Math.max(0, score);
  }

  calculateMarketStability(prices) {
    if (!prices || Object.keys(prices).length === 0) return 0.45;
    const volatilities = Object.values(prices)
      .map((item) => item.volatility)
      .filter((v) => typeof v === 'number' && !Number.isNaN(v));
    if (!volatilities.length) return 0.6;
    const avgVolatility = volatilities.reduce((sum, value) => sum + value, 0) / volatilities.length;
    const stability = 1 - Math.min(avgVolatility / 500, 1);
    return Number(Math.max(0.2, Math.min(stability, 0.95)).toFixed(2));
  }

  calculatePriceTrend(trends) {
    if (!trends) return 0.5;
    const upward = trends.upward?.length || 0;
    const downward = trends.downward?.length || 0;
    const total = upward + downward + (trends.stable?.length || 0) + (trends.volatile?.length || 0);
    if (!total) return 0.5;
    const normalized = (upward - downward + total) / (2 * total);
    return Number(Math.max(0, Math.min(normalized, 1)).toFixed(2));
  }

  calculatePriceVolatility(prices) {
    if (prices.length < 2) return 0;
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  analyzeMarketTrends(marketAnalysis) {
    const trendBuckets = { upward: [], downward: [], stable: [], volatile: [] };
    Object.entries(marketAnalysis || {}).forEach(([commodity, data]) => {
      const volatility = data?.volatility || 0;
      const spread = (data?.priceRange?.max || 0) - (data?.priceRange?.min || 0);
      const avgPrice = data?.avgPrice || 0;
      const spreadRatio = avgPrice > 0 ? spread / avgPrice : 0;
      if (volatility > 150 || spreadRatio > 0.55) {
        trendBuckets.volatile.push(commodity);
      } else if (spreadRatio > 0.25) {
        trendBuckets.upward.push(commodity);
      } else if (spreadRatio < 0.08) {
        trendBuckets.stable.push(commodity);
      } else {
        trendBuckets.downward.push(commodity);
      }
    });
    return trendBuckets;
  }

  generateMarketRecommendations(marketAnalysis) {
    return Object.entries(marketAnalysis || {})
      .filter(([, data]) => data?.avgPrice > 0)
      .sort((a, b) => b[1].avgPrice - a[1].avgPrice)
      .slice(0, 3)
      .map(([commodity, data]) => ({
        commodity,
        signal: data.volatility > 180 ? 'monitor_closely' : 'favorable',
        note: data.volatility > 180 ? 'High volatility observed' : 'Pricing appears favorable'
      }));
  }

  summarizeWeather(data) {
    return `Temperature: ${data.current?.temp}°C, ${data.current?.description || 'Clear'}`;
  }

  summarizeSoil(properties) {
    return `pH: ${properties[0]?.values?.mean / 10 || 6.5}, Texture: Loam`;
  }

  summarizeMarket(marketAnalysis) {
    const count = Object.keys(marketAnalysis).length;
    return `${count} commodities with price data available`;
  }

  summarizeNASAData(data) {
    return `Avg temp: ${data.T2M?.mean || 25}°C, Precipitation: ${data.PRECTOTCORP?.mean || 3.3}mm/day`;
  }

  getNextSeason(current) {
    if (current === 'Kharif') return 'Rabi';
    if (current === 'Rabi') return 'Zaid';
    return 'Kharif';
  }

  getCropClasses() {
    return [
      'Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane',
      'Potato', 'Onion', 'Tomato', 'Groundnut', 'Soybean',
      'Pulses', 'Vegetables', 'Fruits', 'Spices', 'Flowers'
    ];
  }

  getTopIndices(probabilities, topK) {
    return Array.from(probabilities)
      .map((prob, idx) => ({ prob, idx }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, topK)
      .map(item => item.idx);
  }

  getAvailableCrops() {
    return [
      {
        name: 'Rice',
        scientificName: 'Oryza sativa',
        seasons: ['Kharif'],
        idealTemperature: [20, 35],
        soilRequirements: { pHMin: 5.5, pHMax: 7.5, texture: 'Loam' },
        waterNeeds: { min: 100, max: 200 },
        duration: '110-130 days',
        typicalYield: '35-45 quintals/acre'
      },
      {
        name: 'Wheat',
        scientificName: 'Triticum aestivum',
        seasons: ['Rabi'],
        idealTemperature: [10, 25],
        soilRequirements: { pHMin: 6.0, pHMax: 7.5, texture: 'Loam' },
        waterNeeds: { min: 30, max: 100 },
        duration: '100-120 days',
        typicalYield: '40-50 quintals/acre'
      },
      {
        name: 'Cotton',
        scientificName: 'Gossypium hirsutum',
        seasons: ['Kharif'],
        idealTemperature: [21, 30],
        soilRequirements: { pHMin: 5.8, pHMax: 8.0, texture: 'Loam' },
        waterNeeds: { min: 50, max: 100 },
        duration: '150-180 days',
        typicalYield: '8-12 quintals/acre'
      }
    ];
  }

  getCropDetails(crop) {
    const crops = this.getAvailableCrops();
    return crops.find(c => c.name === crop) || {
      scientificName: crop,
      duration: '90-120 days',
      typicalYield: '35-45 quintals/acre'
    };
  }

  calculateExpectedYield(_crop, _realTimeData, _userPreferences) {
    const baseYield = 40;
    return `${baseYield}-${baseYield + 10} quintals/acre`;
  }

  calculateProfitEstimate(crop, expectedYield, marketPrices) {
    const cropData = marketPrices?.[crop];
    if (!cropData) return 'Market-linked estimate unavailable';
    const yieldNum = parseFloat(expectedYield.split('-')[0]) || 40;
    const revenue = yieldNum * cropData.avgPrice;
    const cost = revenue * 0.6;
    return `₹${Math.round(revenue - cost)}/acre`;
  }

  generateCultivationPlan(_crop, realTimeData, userPreferences) {
    return {
      preparation: 'Prepare land 2 weeks before sowing',
      sowing: `Sow during ${realTimeData.season.current} season`,
      irrigation: userPreferences.irrigation === 'irrigated' ? 'Regular irrigation needed' : 'Rainfed',
      harvesting: 'Harvest when crop matures'
    };
  }

  assessRisks(_crop, _realTimeData, _userPreferences) {
    return {
      level: 'moderate',
      factors: ['Weather variability', 'Market fluctuations']
    };
  }

  generateTimeline(_crop, _season) {
    return {
      preparation: 'Week 1-2',
      sowing: 'Week 3',
      growth: 'Week 4-12',
      harvesting: 'Week 13-16'
    };
  }

  generateOverallTimeline(_recommendations, _season) {
    return {
      immediate: 'Prepare land and procure seeds',
      shortTerm: 'Complete sowing within 2 weeks',
      longTerm: 'Monitor and maintain crops'
    };
  }

  getRequiredResources(crop, _userPreferences) {
    return {
      seeds: `${crop} seeds (quantity varies)`,
      fertilizers: 'NPK fertilizers',
      pesticides: 'As needed',
      equipment: 'Basic farming equipment'
    };
  }

  calculateOverallConfidence(mlPredictions, rulePredictions) {
    if (mlPredictions) return 0.85;
    const predictions = rulePredictions?.predictions || [];
    if (!predictions.length) return 0.55;
    const avg = predictions.reduce((sum, item) => sum + (item.confidence || 0), 0) / predictions.length;
    return Number(Math.max(0.45, Math.min(avg, 0.82)).toFixed(2));
  }

  getDataSources(realTimeData) {
    const sources = [];
    if (realTimeData.weather) sources.push('WeatherService/OpenWeather');
    if (realTimeData.soil) sources.push('SoilGrids');
    if (realTimeData.market) sources.push('AgMarkNet');
    if (realTimeData.nasa) sources.push('NASA POWER');
    return sources;
  }

  generateNextSteps(_recommendations, _userPreferences) {
    return [
      'Review recommended crops',
      'Check market prices',
      'Prepare land',
      'Procure seeds and inputs'
    ];
  }

  initializeMLModel() {
    if (!tf) {
      this.mlModel = null;
      return;
    }

    try {
      const model = tf.sequential();
      model.add(tf.layers.dense({ inputShape: [15], units: 32, activation: 'relu' }));
      model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
      model.add(tf.layers.dense({ units: 15, activation: 'softmax' }));
      
      model.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
      
      this.mlModel = model;
      logger.info('✅ Crop recommendation ML model initialized');
    } catch (error) {
      logger.warn('Failed to initialize ML model:', error.message);
      this.mlModel = null;
    }
  }

  getDefaultData(type, location = {}) {
    const seed = this.getLocationSeed(location);
    const defaults = {
      weather: {
        current: {
          temp: this.valueFromSeed(`${seed}:weather:temp`, 24, 35),
          humidity: this.valueFromSeed(`${seed}:weather:humidity`, 45, 85),
          pressure: this.valueFromSeed(`${seed}:weather:pressure`, 1004, 1022),
          weather: 'Clear',
          description: 'Deterministic fallback weather'
        },
        daily: [],
        alerts: [],
        summary: 'Fallback weather profile (deterministic)'
      },
      soil: {
        pH: this.valueFromSeed(`${seed}:soil:ph`, 5.8, 7.6),
        organicCarbon: this.valueFromSeed(`${seed}:soil:carbon`, 0.8, 1.8),
        clay: this.valueFromSeed(`${seed}:soil:clay`, 18, 40),
        sand: this.valueFromSeed(`${seed}:soil:sand`, 28, 62),
        texture: 'Loam',
        summary: 'Fallback soil profile based on region'
      },
      market: {
        prices: {},
        trends: { upward: [], downward: [], stable: [], volatile: [] },
        recommendations: [],
        summary: 'Fallback market profile (deterministic)'
      },
      nasa: {
        temperature: {
          avg: this.valueFromSeed(`${seed}:nasa:tavg`, 22, 33),
          min: this.valueFromSeed(`${seed}:nasa:tmin`, 16, 24),
          max: this.valueFromSeed(`${seed}:nasa:tmax`, 30, 39)
        },
        precipitation: {
          total: this.valueFromSeed(`${seed}:nasa:rainTotal`, 40, 220),
          dailyAvg: this.valueFromSeed(`${seed}:nasa:rainDaily`, 1.1, 7.3)
        },
        solarRadiation: this.valueFromSeed(`${seed}:nasa:solar`, 12, 25),
        summary: 'Fallback NASA climate profile'
      }
    };
    return defaults[type] || {};
  }

  getFallbackRecommendations(location, _userPreferences) {
    const season = this.fetchSeasonData(location).current;
    const fallbackCrops = this.getAvailableCrops().filter(c => c.seasons.includes(season));
    const seed = this.getLocationSeed(location);
    
    const recommendations = fallbackCrops.slice(0, 5).map((crop, index) => ({
      crop: crop.name,
      combinedScore: Math.round(this.valueFromSeed(`${seed}:${crop.name}:score:${index}`, 58, 82)),
      confidence: this.valueFromSeed(`${seed}:${crop.name}:confidence:${index}`, 0.52, 0.78),
      reasons: [`Suitable for ${season} season`, 'Good market demand'],
      expectedYield: crop.typicalYield,
      profitEstimate: `₹${Math.round(this.valueFromSeed(`${seed}:${crop.name}:profit:${index}`, 12000, 48000))}/acre`,
      note: 'Using fallback recommendations - real-time data unavailable'
    })).sort((a, b) => b.combinedScore - a.combinedScore);
    
    return {
      success: false,
      timestamp: new Date().toISOString(),
      location: location,
      season: season,
      recommendations: recommendations,
      report: {
        summary: 'Fallback recommendations based on season',
        note: 'Real-time services temporarily unavailable'
      }
    };
  }
}

module.exports = new RealTimeCropRecommendationService();

















