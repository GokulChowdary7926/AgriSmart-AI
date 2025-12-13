const axios = require('axios');
const logger = require('../utils/logger');
const apiErrorHandler = require('./api/apiErrorHandler');
const fallbackManager = require('./api/fallbackManager');
const retryManager = require('./api/retryManager');
const { CircuitBreakerManager } = require('./api/circuitBreaker');
const apiMonitor = require('./monitoring/apiMonitor');

class WeatherService {
  constructor() {
    this.openweatherApiKey = process.env.OPENWEATHER_API_KEY || null;
    this.weatherAPIs = {
      openweathermap: {
        current: 'http://api.openweathermap.org/data/2.5/weather',
        forecast: 'http://api.openweathermap.org/data/2.5/forecast',
        alerts: 'http://api.openweathermap.org/data/2.5/onecall'
      },
      imd: process.env.IMD_API_URL || 'https://mausam.imd.gov.in/api',
      weatherapi: process.env.WEATHERAPI_KEY ? `https://api.weatherapi.com/v1` : null
    };
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    this.circuitBreaker = CircuitBreakerManager.getBreaker('weather_openweathermap', {
      threshold: 5,
      timeout: 60000
    });
  }

  async getWeatherByIP() {
    try {
      const defaultCoords = { lat: 20.5937, lng: 78.9629 }; // Central India
      
      
      return defaultCoords;
    } catch (error) {
      logger.warn('Using default location for weather');
      return { lat: 20.5937, lng: 78.9629 }; // Fallback to India
    }
  }

  async getWeatherByCoords(lat, lon) {
    const cacheKey = `weather_${lat}_${lon}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      if (this.openweatherApiKey && this.openweatherApiKey !== 'your_api_key_here') {
        const startTime = Date.now();
        
        const weatherData = await this.circuitBreaker.execute(async () => {
          const result = await retryManager.executeWithRetry(async () => {
            const response = await axios.get('http://api.openweathermap.org/data/2.5/weather', {
              params: {
                lat,
                lon,
                appid: this.openweatherApiKey,
                units: 'metric'
              },
              timeout: 10000
            });

            if (response.status === 200) {
              return this.parseOpenWeatherData(response.data);
            } else {
              throw new Error(`Unexpected status: ${response.status}`);
            }
          }, { maxRetries: 2 });
          
          if (result.success) {
            return result.data;
          } else {
            throw result.error;
          }
        }, async () => {
          return fallbackManager.getFallback('weather', { lat, lon });
        });
        
        const responseTime = Date.now() - startTime;
        apiMonitor.recordRequest('weather', true, responseTime, false);
        
        this.cache.set(cacheKey, { data: weatherData, timestamp: Date.now() });
        return weatherData;
      }
    } catch (error) {
      logger.warn('OpenWeather API error:', error.message);
      
      const responseTime = Date.now() - (Date.now() - 100); // Approximate
      apiMonitor.recordRequest('weather', false, responseTime, false);
      apiMonitor.recordError('weather', error);
      
      const errorResponse = apiErrorHandler.handleError(error, 'weather', {
        params: { lat, lon },
        retryCount: 0
      });
      
      if (errorResponse.fallback) {
        logger.info('Using weather fallback data');
        apiMonitor.recordRequest('weather_fallback', true, 0, true);
        return errorResponse.data;
      }
    }

    if (!lat || !lon) {
      const ipLocation = await this.getWeatherByIP();
      if (ipLocation) {
        return this.getWeatherByCoords(ipLocation.lat, ipLocation.lng);
      }
    }

    const mockData = this.getMockWeather(lat, lon);
    this.cache.set(cacheKey, { data: mockData, timestamp: Date.now() });
    return mockData;
  }

  async getWeatherForecast(lat, lon) {
    const cacheKey = `forecast_${lat}_${lon}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      if (this.openweatherApiKey && this.openweatherApiKey !== 'your_api_key_here') {
        try {
          const response = await axios.get(this.weatherAPIs.openweathermap.forecast, {
            params: {
              lat,
              lon,
              appid: this.openweatherApiKey,
              units: 'metric',
              cnt: 40 // 5 days * 8 intervals per day
            },
            timeout: 10000
          });

          if (response.status === 200 && response.data && response.data.list) {
            const forecast = this.parseForecastData(response.data);
            this.cache.set(cacheKey, { data: forecast, timestamp: Date.now() });
            logger.info(`✅ Got real-time forecast from OpenWeatherMap (${forecast.length} periods)`);
            return forecast;
          }
        } catch (error) {
          logger.warn('OpenWeatherMap forecast API error:', error.message);
        }
      }

      if (process.env.WEATHERAPI_KEY) {
        try {
          const response = await axios.get(`${this.weatherAPIs.weatherapi}/forecast.json`, {
            params: {
              key: process.env.WEATHERAPI_KEY,
              q: `${lat},${lon}`,
              days: 7,
              aqi: 'yes',
              alerts: 'yes'
            },
            timeout: 10000
          });

          if (response.status === 200 && response.data && response.data.forecast) {
            const forecast = this.parseWeatherAPIForecast(response.data);
            this.cache.set(cacheKey, { data: forecast, timestamp: Date.now() });
            logger.info(`✅ Got real-time forecast from WeatherAPI (${forecast.length} periods)`);
            return forecast;
          }
        } catch (error) {
          logger.warn('WeatherAPI forecast error:', error.message);
        }
      }
    } catch (error) {
      logger.warn('Forecast API error:', error.message);
    }

    const mockForecast = this.getMockForecast();
    this.cache.set(cacheKey, { data: mockForecast, timestamp: Date.now() });
    return mockForecast;
  }

  parseWeatherAPIForecast(data) {
    if (!data.forecast || !data.forecast.forecastday) {
      return [];
    }
    
    return data.forecast.forecastday.flatMap(day => 
      day.hour.map(hour => ({
        date: hour.time,
        temperature: hour.temp_c,
        min_temp: day.day.mintemp_c,
        max_temp: day.day.maxtemp_c,
        humidity: hour.humidity,
        weather: hour.condition.text,
        description: hour.condition.text,
        rainfall: hour.precip_mm || 0,
        wind_speed: hour.wind_kph / 3.6, // Convert to m/s
        wind_degree: hour.wind_degree,
        cloud_cover: hour.cloud,
        visibility: hour.vis_km
      }))
    ).slice(0, 40); // Limit to 40 periods
  }

  async getSoilData(lat, lon) {
    try {
      const response = await axios.get('https://rest.isric.org/soilgrids/v2.0/properties/query', {
        params: {
          lon: lon,
          lat: lat,
          property: ['phh2o', 'soc', 'clay', 'sand', 'silt'],
          depth: '0-5cm',
          value: 'mean'
        },
        timeout: 10000
      });

      if (response.status === 200) {
        return this.parseSoilData(response.data);
      }
    } catch (error) {
      logger.warn('Soil API error:', error.message);
    }

    return this.getMockSoilData(lat, lon);
  }

  parseOpenWeatherData(data) {
    return {
      temperature: data.main.temp,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      wind_speed: data.wind?.speed || 0,
      wind_degree: data.wind?.deg || 0,
      weather: data.weather[0].main,
      description: data.weather[0].description,
      clouds: data.clouds?.all || 0,
      rainfall: data.rain?.['1h'] || 0,
      sunrise: new Date(data.sys.sunrise * 1000).toISOString(),
      sunset: new Date(data.sys.sunset * 1000).toISOString(),
      location: data.name,
      country: data.sys.country,
      source: 'openweathermap',
      timestamp: new Date().toISOString()
    };
  }

  parseForecastData(data) {
    if (!data || !data.list || !Array.isArray(data.list)) {
      return [];
    }
    return data.list.slice(0, 10).map(item => ({
      date: new Date(item.dt * 1000).toISOString(),
      temperature: item.main?.temp || 25,
      min_temp: item.main?.temp_min || 20,
      max_temp: item.main?.temp_max || 30,
      humidity: item.main?.humidity || 60,
      weather: item.weather?.[0]?.main || 'Clear',
      description: item.weather?.[0]?.description || 'Clear sky',
      rainfall: item.rain?.['3h'] || 0
    }));
  }

  parseSoilData(data) {
    const properties = data.properties;
    const clay = properties.clay?.mean || 30;
    const sand = properties.sand?.mean || 40;
    const silt = properties.silt?.mean || 30;
    
    return {
      ph: properties.phh2o?.mean || 7.0,
      organic_carbon: properties.soc?.mean || 1.5,
      clay,
      sand,
      silt,
      soil_type: this.determineSoilType(clay, sand, silt),
      source: 'isric_soilgrids',
      timestamp: new Date().toISOString()
    };
  }

  determineSoilType(clay, sand, silt) {
    const total = clay + sand + silt;
    if (total === 0) return 'Unknown';
    
    const clayPct = (clay / total) * 100;
    const sandPct = (sand / total) * 100;
    const siltPct = (silt / total) * 100;
    
    if (clayPct > 40) return 'Clay';
    if (sandPct > 70) return 'Sandy';
    if (siltPct > 80) return 'Silt';
    if (Math.abs(clayPct - 30) < 10 && Math.abs(sandPct - 40) < 10) return 'Loam';
    if (clayPct > 30 && sandPct > 40) return 'Clay Loam';
    return 'Sandy Loam';
  }

  getMockWeather(lat, lon) {
    let temp, rainfall;
    
    if (lat > 28) { // North India
      temp = 20 + Math.random() * 10;
      rainfall = 600;
    } else if (lat < 15) { // South India
      temp = 25 + Math.random() * 5;
      rainfall = 1200;
    } else { // Central India
      temp = 22 + Math.random() * 8;
      rainfall = 800;
    }

    return {
      temperature: Math.round(temp * 10) / 10,
      feels_like: Math.round((temp + (Math.random() - 0.5) * 2) * 10) / 10,
      humidity: Math.floor(40 + Math.random() * 50),
      pressure: Math.floor(1000 + Math.random() * 20),
      wind_speed: Math.round((1 + Math.random() * 15) * 10) / 10,
      wind_degree: Math.floor(Math.random() * 360),
      weather: ['Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)],
      description: 'Mock weather data',
      clouds: Math.floor(Math.random() * 100),
      rainfall,
      location: 'Mock Location',
      country: 'IN',
      source: 'mock',
      timestamp: new Date().toISOString()
    };
  }

  getMockForecast() {
    const forecast = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      forecast.push({
        date: date.toISOString(),
        temperature: 25 + (Math.random() - 0.5) * 6,
        min_temp: 20 + (Math.random() - 0.5) * 4,
        max_temp: 30 + (Math.random() - 0.5) * 4,
        humidity: Math.floor(50 + Math.random() * 40),
        weather: ['Clear', 'Partly Cloudy', 'Cloudy'][Math.floor(Math.random() * 3)],
        description: 'Mock forecast',
        rainfall: Math.random() * 5
      });
    }
    return forecast;
  }

  getMockSoilData(lat, lon) {
    let soilType, ph;
    
    if (lat > 28) { // Indo-Gangetic plain
      soilType = 'Alluvial';
      ph = 7.5;
    } else if (lat < 15 && lon > 78) { // Deccan plateau
      soilType = 'Black Cotton';
      ph = 7.0;
    } else if (lat < 20) { // Southern peninsula
      soilType = 'Red';
      ph = 6.5;
    } else { // Central India
      soilType = 'Mixed';
      ph = 7.2;
    }

    return {
      ph: Math.round(ph * 10) / 10,
      organic_carbon: Math.round((0.5 + Math.random() * 2) * 100) / 100,
      clay: Math.floor(20 + Math.random() * 30),
      sand: Math.floor(30 + Math.random() * 40),
      silt: Math.floor(10 + Math.random() * 30),
      soil_type: soilType,
      source: 'mock',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new WeatherService();

