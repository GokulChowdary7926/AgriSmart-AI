const axios = require('axios');
const logger = require('../utils/logger');

let tf = null;
try {
  tf = require('@tensorflow/tfjs-node');
} catch (error) {
  logger.warn('TensorFlow.js not available for crop recommendations');
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
        realTimeData[key] = this.getDefaultData(key);
      }
    });

    return realTimeData;
  }

  async fetchWeatherData(location) {
    try {
      if (!process.env.OPENWEATHER_API_KEY || process.env.OPENWEATHER_API_KEY === 'your_openweather_api_key') {
        return this.getDefaultData('weather');
      }

      const response = await axios.get(this.dataSources.weather, {
        params: {
          lat: location.lat || location.latitude || 20.5937,
          lon: location.lng || location.longitude || 78.9629,
          exclude: 'minutely,hourly',
          units: 'metric',
          appid: process.env.OPENWEATHER_API_KEY
        },
        timeout: 10000
      });

      return {
        current: {
          temp: response.data.current.temp,
          feels_like: response.data.current.feels_like,
          humidity: response.data.current.humidity,
          pressure: response.data.current.pressure,
          wind_speed: response.data.current.wind_speed,
          weather: response.data.current.weather[0].main,
          description: response.data.current.weather[0].description
        },
        daily: response.data.daily.slice(0, 7).map(day => ({
          date: new Date(day.dt * 1000).toISOString().split('T')[0],
          temp: { min: day.temp.min, max: day.temp.max },
          weather: day.weather[0].main,
          rain: day.rain || 0,
          humidity: day.humidity
        })),
        alerts: response.data.alerts || [],
        summary: this.summarizeWeather(response.data)
      };
    } catch (error) {
      logger.warn('Weather API error:', error.message);
      return this.getDefaultData('weather');
    }
  }

  async fetchSoilData(location) {
    try {
      const response = await axios.get(this.dataSources.soil, {
        params: {
          lon: location.lng || location.longitude || 78.9629,
          lat: location.lat || location.latitude || 20.5937,
          property: 'phh2o,soc,clay,sand',
          depth: '0-5cm',
          value: 'mean'
        },
        timeout: 10000
      });

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
      return this.getDefaultData('soil');
    }
  }

  async fetchMarketData(location) {
    try {
      const response = await axios.get(this.dataSources.market, {
        params: {
          'api-key': process.env.AGMARKNET_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b',
          format: 'json',
          limit: 50,
          offset: 0
        },
        timeout: 10000
      });

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
      return this.getDefaultData('market');
    }
  }

  async fetchNASAData(location) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const response = await axios.get(this.dataSources.nasa, {
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

      const data = response.data.properties?.parameter;
      if (!data) return this.getDefaultData('nasa');

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
      return this.getDefaultData('nasa');
    }
  }

  fetchSeasonData(location) {
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

  generateRecommendationReport(recommendations, realTimeData, userPreferences) {
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
    if (!prices || Object.keys(prices).length === 0) return 0.5;
    return 0.7; // Placeholder
  }

  calculatePriceTrend(trends) {
    return 0.5; // Placeholder
  }

  calculatePriceVolatility(prices) {
    if (prices.length < 2) return 0;
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  analyzeMarketTrends(marketAnalysis) {
    return { upward: [], downward: [], stable: [], volatile: [] };
  }

  generateMarketRecommendations(marketAnalysis) {
    return [];
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
      typicalYield: 'Varies'
    };
  }

  calculateExpectedYield(crop, realTimeData, userPreferences) {
    const baseYield = 40; // quintals/acre
    return `${baseYield}-${baseYield + 10} quintals/acre`;
  }

  calculateProfitEstimate(crop, expectedYield, marketPrices) {
    const cropData = marketPrices?.[crop];
    if (!cropData) return 'Varies by region';
    const yieldNum = parseFloat(expectedYield.split('-')[0]) || 40;
    const revenue = yieldNum * cropData.avgPrice;
    const cost = revenue * 0.6; // 60% cost assumption
    return `₹${Math.round(revenue - cost)}/acre`;
  }

  generateCultivationPlan(crop, realTimeData, userPreferences) {
    return {
      preparation: 'Prepare land 2 weeks before sowing',
      sowing: `Sow during ${realTimeData.season.current} season`,
      irrigation: userPreferences.irrigation === 'irrigated' ? 'Regular irrigation needed' : 'Rainfed',
      harvesting: 'Harvest when crop matures'
    };
  }

  assessRisks(crop, realTimeData, userPreferences) {
    return {
      level: 'moderate',
      factors: ['Weather variability', 'Market fluctuations']
    };
  }

  generateTimeline(crop, season) {
    return {
      preparation: 'Week 1-2',
      sowing: 'Week 3',
      growth: 'Week 4-12',
      harvesting: 'Week 13-16'
    };
  }

  generateOverallTimeline(recommendations, season) {
    return {
      immediate: 'Prepare land and procure seeds',
      shortTerm: 'Complete sowing within 2 weeks',
      longTerm: 'Monitor and maintain crops'
    };
  }

  getRequiredResources(crop, userPreferences) {
    return {
      seeds: `${crop} seeds (quantity varies)`,
      fertilizers: 'NPK fertilizers',
      pesticides: 'As needed',
      equipment: 'Basic farming equipment'
    };
  }

  calculateOverallConfidence(mlPredictions, rulePredictions) {
    if (mlPredictions) return 0.85;
    return 0.75;
  }

  getDataSources(realTimeData) {
    const sources = [];
    if (realTimeData.weather) sources.push('OpenWeatherMap');
    if (realTimeData.soil) sources.push('ISRIC Soil Grids');
    if (realTimeData.market) sources.push('Agmarknet');
    if (realTimeData.nasa) sources.push('NASA POWER');
    return sources;
  }

  generateNextSteps(recommendations, userPreferences) {
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

  getDefaultData(type) {
    const defaults = {
      weather: {
        current: { temp: 28, humidity: 65, pressure: 1013, weather: 'Clear', description: 'Clear sky' },
        daily: [],
        alerts: [],
        summary: 'Moderate weather conditions'
      },
      soil: {
        pH: 6.5,
        organicCarbon: 1.2,
        clay: 25,
        sand: 40,
        texture: 'Loam',
        summary: 'Loamy soil, pH 6.5'
      },
      market: {
        prices: {},
        trends: { upward: [], downward: [], stable: [], volatile: [] },
        recommendations: [],
        summary: 'Market data unavailable'
      },
      nasa: {
        temperature: { avg: 25, min: 20, max: 30 },
        precipitation: { total: 100, dailyAvg: 3.3 },
        solarRadiation: 15,
        summary: 'Average conditions'
      }
    };
    return defaults[type] || {};
  }

  getFallbackRecommendations(location, userPreferences) {
    const season = this.fetchSeasonData(location).current;
    const fallbackCrops = this.getAvailableCrops().filter(c => c.seasons.includes(season));
    
    const recommendations = fallbackCrops.slice(0, 5).map((crop, index) => ({
      crop: crop.name,
      combinedScore: 80 - (index * 10),
      confidence: 0.7 - (index * 0.1),
      reasons: [`Suitable for ${season} season`, 'Good market demand'],
      expectedYield: crop.typicalYield,
      profitEstimate: 'Varies by region',
      note: 'Using fallback recommendations - real-time data unavailable'
    }));
    
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













