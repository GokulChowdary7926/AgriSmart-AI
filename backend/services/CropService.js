const axios = require('axios');
const path = require('path');
const logger = require('../utils/logger');
const WeatherService = require('./WeatherService');
const marketPriceAPIService = require('./marketPriceAPIService');

class CropService {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 30 * 60 * 1000; // 30 minutes
  }

  async getRealTimeRecommendations(location, soilData) {
    try {
      const weather = await this.getRealTimeWeather(location);
      
      const soil = soilData || await this.getRealTimeSoilData(location);
      
      const marketPrices = await this.getCurrentCropPrices();
      
      const season = this.getCurrentSeason(location);
      
      const recommendations = await this.getMLRecommendations({
        ...location,
        ...weather,
        ...soil,
        season
      });
      
      return this.enrichWithMarketData(recommendations, marketPrices);
      
    } catch (error) {
      logger.error('Real-time crop recommendation error:', error);
      return this.getFallbackRecommendations(location);
    }
  }

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
    
    return {
      pH: 6.5,
      organicCarbon: 1.2,
      clayContent: 25
    };
  }

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

  getCurrentSeason(location) {
    const month = new Date().getMonth() + 1; // 1-12
    
    if (month >= 6 && month <= 10) {
      return 'Kharif';
    } else if (month >= 11 || month <= 3) {
      return 'Rabi';
    } else {
      return 'Zaid';
    }
  }

  async getMLRecommendations(features) {
    try {
      const tf = require('@tensorflow/tfjs-node');
      if (this.mlModel) {
        return await this.getTensorFlowPredictions(features);
      } else {
        await this.loadMLModel();
        if (this.mlModel) {
          return await this.getTensorFlowPredictions(features);
        }
      }
    } catch (tfError) {
      logger.warn('TensorFlow.js not available, trying Python ML...');
    }

    try {
      const pythonService = require('./PythonService');
      
      if (pythonService.isAvailable) {
        try {
          const result = await pythonService.executeScript(
            path.join(__dirname, 'ml', 'predict_crop_enhanced.py'),
            ['--input', JSON.stringify({
              temperature: features.temperature || 25,
              humidity: features.humidity || 60,
              ph: features.pH || 6.5,
              rainfall: features.rainfall || 0,
              season: features.season || 'Kharif',
              N: features.N || 50,
              P: features.P || 50,
              K: features.K || 50
            })]
          );
          
          logger.mlPrediction('crop-recommendation', features, result, 0, 0.85, {
            engine: 'python-ml',
            script: 'predict_crop_enhanced.py'
          });
          
          return result;
        } catch (pythonError) {
          logger.warn('Python ML prediction failed, trying fallback', pythonError);
        }
      }
      
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
            season: features.season || 'Kharif',
            N: features.N || 50,
            P: features.P || 50,
            K: features.K || 50
          })
        ],
        timeout: 10000 // 10 second timeout
      };

      return new Promise((resolve, reject) => {
        PythonShell.run('predict_crop.py', options, (err, results) => {
          if (err) {
            logger.warn('Python ML prediction error, using rule-based');
            resolve(this.getRuleBasedRecommendations(features));
          } else {
            resolve(results[0] || this.getRuleBasedRecommendations(features));
          }
        });
      });
    } catch (error) {
      logger.warn('ML service unavailable, using enhanced rule-based recommendations');
      return this.getRuleBasedRecommendations(features);
    }
  }

  async loadMLModel() {
    try {
      try {
        const modelRegistry = require('./ModelRegistryService');
        const modelInfo = await modelRegistry.getModel('crop-recommendation').catch(() => null);
        
        if (modelInfo && modelInfo.valid) {
          const tf = require('@tensorflow/tfjs-node');
          const modelPath = path.join(modelInfo.path, 'model.json');
          if (fs.existsSync(modelPath)) {
            this.mlModel = await tf.loadLayersModel(`file://${modelPath}`);
            logger.info('Crop recommendation ML model loaded from registry', {
              model: 'crop-recommendation',
              version: modelInfo.version,
              path: modelInfo.path
            });
            return;
          }
        }
      } catch (registryError) {
        logger.debug('Model registry not available, trying legacy paths', { error: registryError.message });
      }
      
      const tf = require('@tensorflow/tfjs-node');
      const fs = require('fs');
      const path = require('path');
      
      const modelPaths = [
        path.join(__dirname, '../../ml-models/crop-recommendation/model.json'),
        path.join(__dirname, '../ml-models/crop-recommendation/model.json'),
        path.join(process.cwd(), 'ml-models/crop-recommendation/model.json')
      ];
      
      for (const modelPath of modelPaths) {
        try {
          if (fs.existsSync(modelPath)) {
            this.mlModel = await tf.loadLayersModel(`file://${modelPath}`);
            logger.info('Crop recommendation ML model loaded from legacy path', { path: modelPath });
            return;
          }
        } catch (pathError) {
          continue;
        }
      }
      
      logger.warn('No ML model found, will use rule-based recommendations');
    } catch (error) {
      logger.warn('Could not load ML model', error, { service: 'CropService' });
    }
  }

  async getTensorFlowPredictions(features) {
    try {
      const tf = require('@tensorflow/tfjs-node');
      
      const inputTensor = tf.tensor2d([[
        features.N || 50,
        features.P || 50,
        features.K || 50,
        features.temperature || 25,
        features.humidity || 60,
        features.pH || 6.5,
        features.rainfall || 0
      ]]);
      
      const prediction = this.mlModel.predict(inputTensor);
      const probabilities = await prediction.data();
      
      const cropLabels = this.getCropLabels();
      
      const topIndices = this.getTopIndices(probabilities, 5);
      const crops = topIndices.map((index, i) => ({
        name: cropLabels[index] || `Crop_${index}`,
        suitability: Math.round(probabilities[index] * 100),
        confidence: probabilities[index],
        season: this.getSeasonForCrop(cropLabels[index]),
        reason: `ML model prediction with ${Math.round(probabilities[index] * 100)}% confidence`
      }));
      
      inputTensor.dispose();
      prediction.dispose();
      
      return {
        crops: crops,
        location: features,
        timestamp: new Date().toISOString(),
        source: 'ml_tensorflow'
      };
    } catch (error) {
      logger.error('TensorFlow prediction error:', error);
      throw error; // Will fallback to rule-based
    }
  }

  getTopIndices(probabilities, topN) {
    const indexed = probabilities.map((prob, index) => ({ prob, index }));
    indexed.sort((a, b) => b.prob - a.prob);
    return indexed.slice(0, topN).map(item => item.index);
  }

  getCropLabels() {
    return [
      'Rice', 'Maize', 'Chickpea', 'Kidneybeans', 'Pigeonpeas',
      'Mothbeans', 'Mungbean', 'Blackgram', 'Lentil', 'Pomegranate',
      'Banana', 'Mango', 'Grapes', 'Watermelon', 'Muskmelon',
      'Apple', 'Orange', 'Papaya', 'Coconut', 'Cotton',
      'Jute', 'Coffee'
    ];
  }

  getSeasonForCrop(cropName) {
    const kharifCrops = ['Rice', 'Maize', 'Cotton', 'Sugarcane', 'Groundnut'];
    const rabiCrops = ['Wheat', 'Barley', 'Mustard', 'Chickpea', 'Lentil'];
    
    if (kharifCrops.includes(cropName)) return 'Kharif';
    if (rabiCrops.includes(cropName)) return 'Rabi';
    return 'Kharif'; // Default
  }

  getRuleBasedRecommendations(features) {
    const crops = [];
    const temp = features.temperature || 25;
    const rainfall = features.rainfall || 0;
    const ph = features.pH || 6.5;
    const season = features.season || 'Kharif';
    const N = features.N || 50;
    const P = features.P || 50;
    const K = features.K || 50;
    const humidity = features.humidity || 60;

    const cropDatabase = [
      {
        name: 'Rice',
        idealTemp: { min: 20, max: 35 },
        idealRainfall: { min: 100, max: 200 },
        idealPH: { min: 5.5, max: 7.5 },
        idealN: { min: 40, max: 80 },
        idealP: { min: 20, max: 60 },
        idealK: { min: 30, max: 70 },
        idealHumidity: { min: 70, max: 90 },
        season: 'Kharif',
        duration: '110-130 days',
        yield: '35-45 quintals/acre'
      },
      {
        name: 'Wheat',
        idealTemp: { min: 10, max: 25 },
        idealRainfall: { min: 30, max: 100 },
        idealPH: { min: 6.0, max: 7.5 },
        idealN: { min: 50, max: 100 },
        idealP: { min: 30, max: 70 },
        idealK: { min: 40, max: 80 },
        idealHumidity: { min: 50, max: 70 },
        season: 'Rabi',
        duration: '100-120 days',
        yield: '40-50 quintals/acre'
      },
      {
        name: 'Cotton',
        idealTemp: { min: 21, max: 30 },
        idealRainfall: { min: 50, max: 100 },
        idealPH: { min: 5.8, max: 8.0 },
        idealN: { min: 40, max: 90 },
        idealP: { min: 20, max: 60 },
        idealK: { min: 30, max: 80 },
        idealHumidity: { min: 60, max: 80 },
        season: 'Kharif',
        duration: '150-180 days',
        yield: '8-12 quintals/acre'
      },
      {
        name: 'Maize',
        idealTemp: { min: 18, max: 27 },
        idealRainfall: { min: 50, max: 150 },
        idealPH: { min: 5.5, max: 7.0 },
        idealN: { min: 50, max: 100 },
        idealP: { min: 30, max: 70 },
        idealK: { min: 40, max: 90 },
        idealHumidity: { min: 50, max: 80 },
        season: 'Kharif',
        duration: '80-100 days',
        yield: '25-35 quintals/acre'
      },
      {
        name: 'Sugarcane',
        idealTemp: { min: 26, max: 32 },
        idealRainfall: { min: 100, max: 200 },
        idealPH: { min: 6.0, max: 7.5 },
        idealN: { min: 60, max: 120 },
        idealP: { min: 30, max: 80 },
        idealK: { min: 50, max: 100 },
        idealHumidity: { min: 70, max: 90 },
        season: 'Kharif',
        duration: '10-12 months',
        yield: '60-80 tonnes/acre'
      }
    ];

    cropDatabase.forEach(crop => {
      let score = 0;
      let reasons = [];
      let maxScore = 100;

      if (temp >= crop.idealTemp.min && temp <= crop.idealTemp.max) {
        const tempScore = 20;
        score += tempScore;
        reasons.push(`Optimal temperature (${temp}°C)`);
      } else {
        const tempDiff = Math.min(
          Math.abs(temp - crop.idealTemp.min),
          Math.abs(temp - crop.idealTemp.max)
        );
        const tempScore = Math.max(0, 20 - (tempDiff * 2));
        score += tempScore;
      }

      if (rainfall >= crop.idealRainfall.min && rainfall <= crop.idealRainfall.max) {
        score += 20;
        reasons.push(`Adequate rainfall (${rainfall}mm)`);
      } else if (rainfall < crop.idealRainfall.min) {
        const rainScore = Math.max(0, 20 - ((crop.idealRainfall.min - rainfall) / 10));
        score += rainScore;
      } else {
        const rainScore = Math.max(0, 20 - ((rainfall - crop.idealRainfall.max) / 20));
        score += rainScore;
      }

      if (ph >= crop.idealPH.min && ph <= crop.idealPH.max) {
        score += 15;
        reasons.push(`Suitable soil pH (${ph})`);
      } else {
        const phDiff = Math.min(
          Math.abs(ph - crop.idealPH.min),
          Math.abs(ph - crop.idealPH.max)
        );
        const phScore = Math.max(0, 15 - (phDiff * 3));
        score += phScore;
      }

      const nScore = this.calculateNutrientScore(N, crop.idealN);
      const pScore = this.calculateNutrientScore(P, crop.idealP);
      const kScore = this.calculateNutrientScore(K, crop.idealK);
      score += (nScore + pScore + kScore) / 3 * 0.25;
      if (nScore > 15 && pScore > 15 && kScore > 15) {
        reasons.push('Good nutrient levels');
      }

      if (season === crop.season) {
        score += 10;
        reasons.push(`Perfect for ${season} season`);
      } else {
        score += 5; // Partial match
      }

      if (humidity >= crop.idealHumidity.min && humidity <= crop.idealHumidity.max) {
        score += 10;
        reasons.push(`Optimal humidity (${humidity}%)`);
      }

      if (score >= 50) {
        crops.push({
          name: crop.name,
          suitability: Math.round(score),
          season: crop.season,
          duration: crop.duration,
          estimatedYield: crop.yield,
          reason: reasons.length > 0 ? reasons.join(', ') : 'Suitable conditions',
          scoringBreakdown: {
            temperature: Math.round((temp >= crop.idealTemp.min && temp <= crop.idealTemp.max) ? 20 : 10),
            rainfall: Math.round((rainfall >= crop.idealRainfall.min && rainfall <= crop.idealRainfall.max) ? 20 : 10),
            ph: Math.round((ph >= crop.idealPH.min && ph <= crop.idealPH.max) ? 15 : 7),
            nutrients: Math.round((nScore + pScore + kScore) / 3 * 0.25),
            season: Math.round(season === crop.season ? 10 : 5),
            humidity: Math.round((humidity >= crop.idealHumidity.min && humidity <= crop.idealHumidity.max) ? 10 : 5)
          }
        });
      }
    });

    return {
      crops: crops.sort((a, b) => b.suitability - a.suitability).slice(0, 5),
      location: features,
      timestamp: new Date().toISOString(),
      source: 'rule_based_enhanced'
    };
  }

  calculateNutrientScore(value, ideal) {
    if (value >= ideal.min && value <= ideal.max) {
      return 20; // Perfect
    } else if (value < ideal.min) {
      const diff = ideal.min - value;
      return Math.max(0, 20 - (diff * 0.5)); // Penalty for low
    } else {
      const diff = value - ideal.max;
      return Math.max(0, 20 - (diff * 0.3)); // Penalty for high
    }
  }

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



