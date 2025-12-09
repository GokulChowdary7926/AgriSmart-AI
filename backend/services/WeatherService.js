const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Real-time Weather Service
 * Integrates with OpenWeatherMap and provides fallbacks
 */
class WeatherService {
  constructor() {
    this.openweatherApiKey = process.env.OPENWEATHER_API_KEY || null;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get weather by IP address (fallback location detection)
   */
  async getWeatherByIP() {
    try {
      // Default to a central Indian location
      const defaultCoords = { lat: 20.5937, lng: 78.9629 }; // Central India
      
      // Optional: Enable real IP detection (requires IP geolocation service)
      /*
      try {
        const ipResponse = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
        const ipData = ipResponse.data;
        const locationResponse = await axios.get(`http://ip-api.com/json/${ipData.ip}`, { timeout: 5000 });
        const locationData = locationResponse.data;
        if (locationData.lat && locationData.lon) {
          return { lat: locationData.lat, lng: locationData.lon };
        }
      } catch (ipError) {
        logger.warn('IP geolocation failed, using default location');
      }
      */
      
      return defaultCoords;
    } catch (error) {
      logger.warn('Using default location for weather');
      return { lat: 20.5937, lng: 78.9629 }; // Fallback to India
    }
  }

  /**
   * Get weather by coordinates
   */
  async getWeatherByCoords(lat, lon) {
    const cacheKey = `weather_${lat}_${lon}`;
    const cached = this.cache.get(cacheKey);
    
    // Check cache
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // Try OpenWeatherMap
      if (this.openweatherApiKey && this.openweatherApiKey !== 'your_api_key_here') {
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
          const weatherData = this.parseOpenWeatherData(response.data);
          this.cache.set(cacheKey, { data: weatherData, timestamp: Date.now() });
          return weatherData;
        }
      }
    } catch (error) {
      logger.warn('OpenWeather API error:', error.message);
    }

    // Try to get location from IP if coordinates not provided
    if (!lat || !lon) {
      const ipLocation = await this.getWeatherByIP();
      if (ipLocation) {
        return this.getWeatherByCoords(ipLocation.lat, ipLocation.lng);
      }
    }

    // Fallback to mock data
    const mockData = this.getMockWeather(lat, lon);
    this.cache.set(cacheKey, { data: mockData, timestamp: Date.now() });
    return mockData;
  }

  /**
   * Get weather forecast
   */
  async getWeatherForecast(lat, lon) {
    try {
      if (this.openweatherApiKey && this.openweatherApiKey !== 'your_api_key_here') {
        const response = await axios.get('http://api.openweathermap.org/data/2.5/forecast', {
          params: {
            lat,
            lon,
            appid: this.openweatherApiKey,
            units: 'metric',
            cnt: 7
          },
          timeout: 10000
        });

        if (response.status === 200) {
          return this.parseForecastData(response.data);
        }
      }
    } catch (error) {
      logger.warn('Forecast API error:', error.message);
    }

    return this.getMockForecast();
  }

  /**
   * Get soil data based on location
   */
  async getSoilData(lat, lon) {
    try {
      // Using ISRIC Soil Grids API (free tier)
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

  /**
   * Parse OpenWeatherMap response
   */
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

  /**
   * Parse forecast data
   */
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

  /**
   * Parse soil data
   */
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

  /**
   * Determine soil type from texture
   */
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

  /**
   * Get mock weather data
   */
  getMockWeather(lat, lon) {
    // Simple approximation for India
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

  /**
   * Get mock forecast
   */
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

  /**
   * Get mock soil data
   */
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

