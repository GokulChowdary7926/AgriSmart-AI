const axios = require('axios');
const logger = require('../utils/logger');
const WeatherService = require('./WeatherService');
const marketPriceAPIService = require('./marketPriceAPIService');

/**
 * Real-time Crop Recommendation Service
 * Integrates with weather, soil, and market APIs for accurate recommendations
 */
class CropService {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Get real-time crop recommendations with live data
   */
  async getRealTimeRecommendations(location, soilData) {
    try {
      // Get real-time weather data
      const weather = await this.getRealTimeWeather(location);
      
      // Get soil data from ISRIC API
      const soil = soilData || await this.getRealTimeSoilData(location);
      
      // Get market prices for crops
      const marketPrices = await this.getCurrentCropPrices();
      
      // Get seasonal data
      const season = this.getCurrentSeason(location);
      
      // Use ML model for recommendations
      const recommendations = await this.getMLRecommendations({
        ...location,
        ...weather,
        ...soil,
        season
      });
      
      // Enrich with real-time market data
      return this.enrichWithMarketData(recommendations, marketPrices);
      
    } catch (error) {
      logger.error('Real-time crop recommendation error:', error);
      return this.getFallbackRecommendations(location);
    }
  }

  /**
   * Get real-time weather data
   */
  async getRealTimeWeather(location) {
    try {
      const weatherData = await WeatherService.getWeatherByCoords(
        location.lat || location.latitude,
        location.lng || location.longitude
      );
      
      return {
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        rainfall: weatherData.rainfall || 0,
        windSpeed: weatherData.windSpeed || 0,
        weatherCondition: weatherData.condition || 'Clear'
      };
    } catch (error) {
      logger.warn('Weather API error, using defaults');
      return {
        temperature: 25,
        humidity: 60,
        rainfall: 0,
        windSpeed: 5,
        weatherCondition: 'Clear'
      };
    }
  }

  /**
   * Get real-time soil data from ISRIC Soil Grids
   */
  async getRealTimeSoilData(location) {
    try {
      const lat = location.lat || location.latitude;
      const lng = location.lng || location.longitude;
      
      const response = await axios.get(
        `https://rest.isric.org/soilgrids/v2.0/properties/query`,
        {
          params: {
            lon: lng,
            lat: lat,
            property: 'phh2o',
            property: 'soc',
            property: 'clay',
            depth: '0-5cm',
            value: 'mean'
          },
          timeout: 10000
        }
      );
      
      if (response.data && response.data.properties) {
        const layers = response.data.properties.layers;
        return {
          pH: layers[0]?.values?.mean ? layers[0].values.mean / 10 : 6.5,
          organicCarbon: layers[1]?.values?.mean ? layers[1].values.mean / 10 : 1.2,
          clayContent: layers[2]?.values?.mean || 25
        };
      }
    } catch (error) {
      logger.warn('ISRIC API error, using estimated soil data');
    }
    
    // Fallback to estimated soil data
    return {
      pH: 6.5,
      organicCarbon: 1.2,
      clayContent: 25
    };
  }

  /**
   * Get current crop prices from market API
   */
  async getCurrentCropPrices() {
    try {
      const prices = await marketPriceAPIService.getRealTimePrices();
      
      if (prices && prices.data) {
        const priceMap = {};
        prices.data.forEach(item => {
          if (item.commodity && item.price) {
            priceMap[item.commodity.toLowerCase()] = {
              pricePerKg: item.price.value || item.pricePerKg || 0,
              market: item.market?.name || item.market || 'Unknown',
              state: item.market?.location || item.state || '',
              date: item.date || item.arrivalDate || new Date().toISOString().split('T')[0]
            };
          }
        });
        return priceMap;
      }
    } catch (error) {
      logger.warn('Market price API error');
    }
    
    return {};
  }

  /**
   * Get current season based on location and date
   */
  getCurrentSeason(location) {
    const month = new Date().getMonth() + 1; // 1-12
    
    // Indian seasons
    if (month >= 6 && month <= 10) {
      return 'Kharif';
    } else if (month >= 11 || month <= 3) {
      return 'Rabi';
    } else {
      return 'Zaid';
    }
  }

  /**
   * Get ML-based recommendations
   */
  async getMLRecommendations(features) {
    try {
      const PythonShell = require('python-shell').PythonShell;
      const options = {
        mode: 'json',
        pythonPath: 'python3',
        scriptPath: './services/ml',
        args: [
          JSON.stringify({
            temperature: features.temperature || 25,
            humidity: features.humidity || 60,
            ph: features.pH || 6.5,
            rainfall: features.rainfall || 0,
            season: features.season || 'Kharif'
          })
        ]
      };

      return new Promise((resolve, reject) => {
        PythonShell.run('predict_crop.py', options, (err, results) => {
          if (err) {
            logger.warn('ML prediction error, using rule-based');
            resolve(this.getRuleBasedRecommendations(features));
          } else {
            resolve(results[0] || this.getRuleBasedRecommendations(features));
          }
        });
      });
    } catch (error) {
      logger.warn('ML service unavailable, using rule-based recommendations');
      return this.getRuleBasedRecommendations(features);
    }
  }

  /**
   * Rule-based crop recommendations (fallback)
   */
  getRuleBasedRecommendations(features) {
    const crops = [];
    const temp = features.temperature || 25;
    const rainfall = features.rainfall || 0;
    const ph = features.pH || 6.5;
    const season = features.season || 'Kharif';

    // Rice
    if (temp >= 20 && temp <= 35 && rainfall >= 100 && ph >= 5.5 && ph <= 7.5) {
      crops.push({
        name: 'Rice',
        suitability: 95,
        season: 'Kharif',
        reason: 'Optimal temperature, rainfall, and soil pH for rice cultivation'
      });
    }

    // Wheat
    if (temp >= 10 && temp <= 25 && ph >= 6.0 && ph <= 7.5 && season === 'Rabi') {
      crops.push({
        name: 'Wheat',
        suitability: 90,
        season: 'Rabi',
        reason: 'Ideal conditions for wheat during Rabi season'
      });
    }

    // Cotton
    if (temp >= 21 && temp <= 30 && rainfall >= 50 && ph >= 5.8 && ph <= 8.0) {
      crops.push({
        name: 'Cotton',
        suitability: 85,
        season: 'Kharif',
        reason: 'Suitable temperature and soil conditions for cotton'
      });
    }

    // Maize
    if (temp >= 18 && temp <= 27 && rainfall >= 50 && ph >= 5.5 && ph <= 7.0) {
      crops.push({
        name: 'Maize',
        suitability: 80,
        season: 'Kharif',
        reason: 'Good conditions for maize cultivation'
      });
    }

    return {
      crops: crops.sort((a, b) => b.suitability - a.suitability).slice(0, 5),
      location: features,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Enrich recommendations with market data
   */
  enrichWithMarketData(recommendations, marketPrices) {
    if (!recommendations.crops) return recommendations;

    recommendations.crops = recommendations.crops.map(crop => {
      const priceData = marketPrices[crop.name.toLowerCase()];
      return {
        ...crop,
        currentPrice: priceData?.pricePerKg || 0,
        market: priceData?.market || 'N/A',
        priceDate: priceData?.date || new Date().toISOString().split('T')[0],
        estimatedProfit: priceData?.pricePerKg ? 
          (priceData.pricePerKg * crop.estimatedYield || 0) : 0
      };
    });

    return recommendations;
  }

  /**
   * Fallback recommendations
   */
  getFallbackRecommendations(location) {
    return {
      crops: [
        {
          name: 'Rice',
          suitability: 75,
          season: 'Kharif',
          reason: 'General recommendation based on location',
          currentPrice: 45,
          market: 'Local Mandi'
        },
        {
          name: 'Wheat',
          suitability: 70,
          season: 'Rabi',
          reason: 'Suitable for winter season',
          currentPrice: 30,
          market: 'Local Mandi'
        }
      ],
      location: location,
      timestamp: new Date().toISOString(),
      source: 'fallback'
    };
  }
}

module.exports = new CropService();


