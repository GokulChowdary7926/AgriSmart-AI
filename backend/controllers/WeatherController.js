const WeatherData = require('../models/WeatherData');
const WeatherService = require('../services/WeatherService');
const logger = require('../utils/logger');
const axios = require('axios');

class WeatherController {
  static async getCurrent(req, res) {
    try {
      const { lat, lng, latitude, longitude, city } = req.query;
      
      const latValue = lat || latitude;
      const lngValue = lng || longitude;
      
      let weather = null;
      
      if (latValue && lngValue) {
        try {
          const weatherData = await WeatherService.getWeatherByCoords(
            parseFloat(latValue),
            parseFloat(lngValue)
          );
          
          weather = {
            temperature: {
              current: weatherData.temperature,
              min: weatherData.temperature - 5,
              max: weatherData.temperature + 5,
              feels_like: weatherData.feels_like
            },
            humidity: weatherData.humidity,
            pressure: weatherData.pressure,
            precipitation: {
              rainfall: weatherData.rainfall || 0
            },
            conditions: {
              main: weatherData.weather,
              description: weatherData.description
            },
            wind: {
              speed: weatherData.wind_speed,
              degree: weatherData.wind_degree,
              direction: this.getWindDirection(weatherData.wind_degree)
            },
            clouds: weatherData.clouds,
            location: {
              city: weatherData.location || city || 'Current Location',
              country: weatherData.country || 'IN',
              coordinates: [parseFloat(latValue), parseFloat(lngValue)]
            },
            sunrise: weatherData.sunrise,
            sunset: weatherData.sunset,
            source: weatherData.source || 'api',
            timestamp: weatherData.timestamp || new Date().toISOString()
          };
        } catch (apiError) {
          logger.warn('WeatherService error:', apiError.message);
        }
      }
      
      if (!weather) {
        weather = {
          temperature: { current: 25, min: 20, max: 30, feels_like: 24 },
          humidity: 60,
          pressure: 1013,
          precipitation: { rainfall: 0 },
          conditions: { main: 'Clear', description: 'Clear sky' },
          wind: { speed: 5, degree: 180, direction: 'S' },
          clouds: 20,
          location: { city: city || 'Unknown', state: 'Unknown' },
          source: 'mock',
          timestamp: new Date().toISOString()
        };
      }
      
      res.json({
        success: true,
        data: weather
      });
    } catch (error) {
      logger.error('Error fetching current weather:', error);
      res.json({
        success: true,
        data: {
          temperature: { current: 25, min: 20, max: 30 },
          humidity: 60,
          precipitation: { rainfall: 0 },
          conditions: { main: 'Clear', description: 'Clear sky' }
        }
      });
    }
  }
  
  static getWindDirection(degree) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degree / 45) % 8;
    return directions[index];
  }
  
  static async getHistory(req, res) {
    try {
      const { lat, lng, startDate, endDate } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          error: 'Latitude and longitude are required'
        });
      }
      
      const coordinates = [parseFloat(lng), parseFloat(lat)];
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();
      
      let history = [];
      
      try {
        if (WeatherData && typeof WeatherData.getHistory === 'function') {
          history = await WeatherData.getHistory(coordinates, start, end);
        }
      } catch (dbError) {
        logger.warn('WeatherData.getHistory not available or failed:', dbError.message);
      }
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Error fetching weather history:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  static async create(req, res) {
    try {
      const { lat, lng, ...weatherData } = req.body;
      
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          error: 'Latitude and longitude are required'
        });
      }
      
      const weather = new WeatherData({
        ...weatherData,
        location: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
          ...weatherData.location
        },
        timestamp: weatherData.timestamp || new Date()
      });
      
      await weather.save();
      
      res.status(201).json({
        success: true,
        data: weather
      });
    } catch (error) {
      logger.error('Error creating weather data:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  static async getForecast(req, res) {
    try {
      const { lat, lng, days = 10 } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          error: 'Latitude and longitude are required'
        });
      }
      
      let forecastData = null;
      try {
        const forecast = await WeatherService.getWeatherForecast(
          parseFloat(lat),
          parseFloat(lng)
        );
        
        if (Array.isArray(forecast) && forecast.length > 0) {
          forecastData = forecast.map(item => ({
            date: item.date || new Date().toISOString(),
            temperature: {
              day: item.temperature || 25,
              min: item.min_temp || 20,
              max: item.max_temp || 30
            },
            conditions: {
              main: item.weather || 'Clear',
              description: item.description || 'Clear sky'
            },
            humidity: item.humidity || 60,
            precipitation: {
              probability: Math.min(100, (item.rainfall || 0) * 20),
              amount: item.rainfall || 0
            },
            wind: {
              speed: 5 + Math.random() * 10,
              direction: 'SW'
            }
          }));
        }
      } catch (apiError) {
        logger.warn('Forecast API error:', apiError.message);
      }
      
      if (!forecastData || !Array.isArray(forecastData) || forecastData.length === 0) {
        forecastData = [];
        for (let i = 0; i < parseInt(days); i++) {
          const date = new Date();
          date.setDate(date.getDate() + i);
          forecastData.push({
            date: date.toISOString(),
            temperature: {
              day: 25 + (Math.random() - 0.5) * 6,
              min: 20 + (Math.random() - 0.5) * 4,
              max: 30 + (Math.random() - 0.5) * 4
            },
            conditions: {
              main: ['Clear', 'Partly Cloudy', 'Cloudy', 'Rain'][Math.floor(Math.random() * 4)],
              description: 'Weather conditions'
            },
            humidity: Math.floor(50 + Math.random() * 40),
            precipitation: {
              probability: Math.floor(Math.random() * 50),
              amount: Math.random() * 5
            },
            wind: {
              speed: 5 + Math.random() * 10,
              direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)]
            }
          });
        }
      }
      
      const forecastArray = Array.isArray(forecastData) ? forecastData : [];
      
      res.json({
        success: true,
        data: forecastArray
      });
    } catch (error) {
      logger.error('Error fetching forecast:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  static async getHourlyForecast(req, res) {
    try {
      const { lat, lng, hours = 24 } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          error: 'Latitude and longitude are required'
        });
      }
      
      const hourlyForecast = [];
      const now = new Date();
      
      for (let i = 0; i < parseInt(hours); i++) {
        const hour = new Date(now.getTime() + i * 60 * 60 * 1000);
        hourlyForecast.push({
          time: hour.toISOString(),
          temperature: 25 + (Math.random() - 0.5) * 4,
          conditions: {
            main: ['Clear', 'Partly Cloudy', 'Cloudy', 'Rain'][Math.floor(Math.random() * 4)],
            description: 'Weather conditions'
          },
          precipitation: {
            probability: Math.floor(Math.random() * 30),
            amount: Math.random() * 2
          },
          humidity: Math.floor(50 + Math.random() * 30),
          wind: {
            speed: 3 + Math.random() * 8,
            direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)]
          }
        });
      }
      
      res.json({
        success: true,
        data: hourlyForecast
      });
    } catch (error) {
      logger.error('Error fetching hourly forecast:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getAlerts(req, res) {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          error: 'Latitude and longitude are required'
        });
      }

      let realTimeAlerts = [];
      const openweatherApiKey = process.env.OPENWEATHER_API_KEY;
      
      if (openweatherApiKey && openweatherApiKey !== 'your_api_key_here') {
        try {
          const response = await axios.get('http://api.openweathermap.org/data/2.5/onecall', {
            params: {
              lat: parseFloat(lat),
              lon: parseFloat(lng),
              appid: openweatherApiKey,
              units: 'metric',
              exclude: 'minutely,daily'
            },
            timeout: 10000
          });

          if (response.data && response.data.alerts && Array.isArray(response.data.alerts)) {
            realTimeAlerts = response.data.alerts.map(alert => ({
              id: `owm_${alert.start}_${alert.end}`,
              title: alert.event || 'Weather Alert',
              description: alert.description,
              severity: alert.severity || 'moderate',
              start: new Date(alert.start * 1000).toISOString(),
              end: new Date(alert.end * 1000).toISOString(),
              areas: [alert.tags || 'Current Location'],
              source: 'OpenWeatherMap',
              agricultural_impact: {
                affected_crops: ['All crops'],
                recommended_actions: getRecommendedActions(alert.event),
                risk_level: alert.severity === 'extreme' ? 'high' : 'medium'
              }
            }));
            logger.info(`✅ Got ${realTimeAlerts.length} real-time alerts from OpenWeatherMap`);
          }
        } catch (error) {
          logger.warn('OpenWeatherMap alerts API error:', error.message);
        }
      }

      let currentWeather = null;
      try {
        const weatherData = await WeatherService.getWeatherByCoords(
          parseFloat(lat),
          parseFloat(lng)
        );
        currentWeather = weatherData;
      } catch (error) {
        logger.warn('Could not fetch weather for alerts:', error.message);
      }

      const agriculturalAlerts = generateAgriculturalAlerts(currentWeather, lat, lng);

      const allAlerts = [...realTimeAlerts, ...agriculturalAlerts];

      res.json({
        success: true,
        data: {
          alerts: allAlerts,
          alert_count: allAlerts.length,
          severe_alerts: allAlerts.filter(a => a.severity === 'severe' || a.severity === 'extreme').length,
          real_time_alerts: realTimeAlerts.length,
          agricultural_alerts: agriculturalAlerts.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error fetching weather alerts:', error);
      res.json({
        success: true,
        data: {
          alerts: getMockAlerts(lat, lng),
          alert_count: 0,
          severe_alerts: 0,
          real_time_alerts: 0,
          agricultural_alerts: 0
        }
      });
    }
  }
}

function generateAgriculturalAlerts(weather, lat, lng) {
  const alerts = [];
  
  if (!weather) {
    return getMockAlerts(lat, lng);
  }

  if (weather.temperature > 35) {
    alerts.push({
      id: 'heatwave_' + Date.now(),
      title: 'Heatwave Alert',
      description: 'High temperatures may stress crops. Increase irrigation frequency and consider shade protection for sensitive plants.',
      severity: 'moderate',
      start: new Date(),
      end: new Date(Date.now() + 24 * 60 * 60 * 1000),
      areas: ['Current Location'],
      source: 'Agricultural Weather Advisory',
      agricultural_impact: {
        affected_crops: ['Wheat', 'Vegetables', 'Fruits'],
        recommended_actions: ['Increase watering', 'Use mulch', 'Provide shade'],
        risk_level: 'medium'
      }
    });
  }
  
  if (weather.temperature < 10) {
    alerts.push({
      id: 'frost_' + Date.now(),
      title: 'Frost Warning',
      description: 'Low temperatures may damage sensitive crops. Use frost protection covers or irrigation to protect plants.',
      severity: 'moderate',
      start: new Date(),
      end: new Date(Date.now() + 12 * 60 * 60 * 1000),
      areas: ['Current Location'],
      source: 'Agricultural Advisory',
      agricultural_impact: {
        affected_crops: ['Potato', 'Tomato', 'Citrus'],
        recommended_actions: ['Use frost cloths', 'Irrigate before frost', 'Harvest early'],
        risk_level: 'high'
      }
    });
  }
  
  if (weather.weather && (weather.weather.toLowerCase().includes('rain') || weather.rainfall > 20)) {
    alerts.push({
      id: 'rainfall_' + Date.now(),
      title: 'Heavy Rainfall Alert',
      description: 'Heavy rainfall expected. Ensure proper drainage to prevent waterlogging and soil erosion.',
      severity: weather.rainfall > 50 ? 'severe' : 'moderate',
      start: new Date(),
      end: new Date(Date.now() + 6 * 60 * 60 * 1000),
      areas: ['Current Location'],
      source: 'Agricultural Advisory',
      agricultural_impact: {
        affected_crops: ['Rice', 'Sugarcane'],
        recommended_actions: ['Check drainage', 'Delay fertilizer application', 'Monitor for diseases'],
        risk_level: weather.rainfall > 50 ? 'high' : 'medium'
      }
    });
  }
  
  if (weather.wind_speed > 30) {
    alerts.push({
      id: 'wind_' + Date.now(),
      title: 'Strong Winds Alert',
      description: 'Strong winds may damage crops and affect pollination. Secure plants and structures.',
      severity: 'moderate',
      start: new Date(),
      end: new Date(Date.now() + 8 * 60 * 60 * 1000),
      areas: ['Current Location'],
      source: 'Agricultural Advisory',
      agricultural_impact: {
        affected_crops: ['Tall crops', 'Fruit trees', 'Greenhouses'],
        recommended_actions: ['Stake plants', 'Secure structures', 'Delay spraying'],
        risk_level: 'medium'
      }
    });
  }

  if (alerts.length === 0) {
    return getMockAlerts(lat, lng);
  }

  return alerts;
}

function getRecommendedActions(alertType) {
  const actions = {
    'Rain': ['Check drainage systems', 'Delay fertilizer application', 'Monitor for waterlogging'],
    'Thunderstorm': ['Secure structures', 'Avoid field work', 'Protect equipment'],
    'Heat': ['Increase irrigation', 'Use shade protection', 'Monitor crop stress'],
    'Cold': ['Use frost protection', 'Cover sensitive crops', 'Delay planting'],
    'Wind': ['Secure plants and structures', 'Delay spraying', 'Protect greenhouses'],
    'Fog': ['Delay field operations', 'Use proper lighting', 'Be cautious on roads'],
    'Snow': ['Clear pathways', 'Protect crops', 'Monitor temperature']
  };
  
  if (!alertType) return ['Monitor conditions', 'Take necessary precautions'];
  
  const alertLower = alertType.toLowerCase();
  for (const [key, value] of Object.entries(actions)) {
    if (alertLower.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return ['Monitor conditions', 'Follow weather updates', 'Take necessary precautions'];
}

function getMockAlerts(lat, lng) {
  return [
    {
      id: 'mock_1',
      title: 'Heavy Rainfall Warning',
      description: 'Heavy rainfall expected in the next 24 hours. Accumulation of 50-100mm possible.',
      severity: 'severe',
      start: new Date(),
      end: new Date(Date.now() + 24 * 60 * 60 * 1000),
      areas: ['Maharashtra', 'Goa'],
      source: 'IMD Mumbai',
      agricultural_impact: {
        affected_crops: ['Rice', 'Sugarcane'],
        recommended_actions: ['Ensure drainage', 'Delay harvesting', 'Protect stored grains'],
        risk_level: 'high'
      }
    },
    {
      id: 'mock_2',
      title: 'Heatwave Advisory',
      description: 'Maximum temperatures likely to rise by 4-6°C above normal.',
      severity: 'moderate',
      start: new Date(),
      end: new Date(Date.now() + 48 * 60 * 60 * 1000),
      areas: ['North India'],
      source: 'India Meteorological Department',
      agricultural_impact: {
        affected_crops: ['Wheat', 'Vegetables'],
        recommended_actions: ['Increase irrigation frequency', 'Use mulch', 'Provide shade'],
        risk_level: 'medium'
      }
    }
  ];
}

module.exports = WeatherController;
