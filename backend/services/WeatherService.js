const logger = require('../utils/logger');
const apiErrorHandler = require('./api/apiErrorHandler');
const fallbackManager = require('./api/fallbackManager');
const apiMonitor = require('./monitoring/apiMonitor');
const resilientHttpClient = require('./api/resilientHttpClient');

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
    this.cacheTimeout = 5 * 60 * 1000;
  }

  async getWeatherByIP() {
    try {
      const defaultCoords = { lat: 20.5937, lng: 78.9629 };
      
      
      return defaultCoords;
    } catch (error) {
      logger.warn('Using default location for weather');
      return { lat: 20.5937, lng: 78.9629 };
    }
  }

  async getWeatherByCoords(lat, lon) {
    const cacheKey = `weather_${lat}_${lon}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const openMeteoData = await this.getWeatherFromOpenMeteo(lat, lon);
      if (openMeteoData) {
        this.cache.set(cacheKey, { data: openMeteoData, timestamp: Date.now() });
        return openMeteoData;
      }

      if (this.openweatherApiKey && this.openweatherApiKey !== 'your_api_key_here') {
        const startTime = Date.now();
        const result = await resilientHttpClient.request({
          serviceName: 'weather-openweathermap-current',
          method: 'get',
          url: 'http://api.openweathermap.org/data/2.5/weather',
          params: {
            lat,
            lon,
            appid: this.openweatherApiKey,
            units: 'metric'
          },
          timeout: 10000,
          retry: { maxRetries: 2, baseDelay: 500, maxDelay: 4000 },
          breaker: { threshold: 4, timeout: 45000 }
        });
        const weatherData = result.success
          ? this.parseOpenWeatherData(result.response.data)
          : fallbackManager.getFallback('weather', { lat, lon });
        
        const responseTime = Date.now() - startTime;
        apiMonitor.recordRequest('weather', true, responseTime, false);
        
        this.cache.set(cacheKey, { data: weatherData, timestamp: Date.now() });
        return weatherData;
      }
    } catch (error) {
      logger.warn('OpenWeather API error:', error.message);
      
      const responseTime = Date.now() - (Date.now() - 100);
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
      const openMeteoForecast = await this.getForecastFromOpenMeteo(lat, lon);
      if (openMeteoForecast && openMeteoForecast.length > 0) {
        this.cache.set(cacheKey, { data: openMeteoForecast, timestamp: Date.now() });
        return openMeteoForecast;
      }
    } catch (e) {
      logger.warn('Open-Meteo forecast error:', e.message);
    }

    try {
      if (this.openweatherApiKey && this.openweatherApiKey !== 'your_api_key_here') {
        try {
          const result = await resilientHttpClient.request({
            serviceName: 'weather-openweathermap-forecast',
            method: 'get',
            url: this.weatherAPIs.openweathermap.forecast,
            params: {
              lat,
              lon,
              appid: this.openweatherApiKey,
              units: 'metric',
              cnt: 40 // 5 days * 8 intervals per day
            },
            timeout: 10000
          });
          if (!result.success) {
            throw new Error(result.error?.message || 'OpenWeatherMap forecast failed');
          }
          const response = result.response;

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
          const result = await resilientHttpClient.request({
            serviceName: 'weatherapi-forecast',
            method: 'get',
            url: `${this.weatherAPIs.weatherapi}/forecast.json`,
            params: {
              key: process.env.WEATHERAPI_KEY,
              q: `${lat},${lon}`,
              days: 7,
              aqi: 'yes',
              alerts: 'yes'
            },
            timeout: 10000
          });
          if (!result.success) {
            throw new Error(result.error?.message || 'WeatherAPI forecast failed');
          }
          const response = result.response;

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
    ).slice(0, 40);
  }

  async getSoilData(lat, lon) {
    try {
      const result = await resilientHttpClient.request({
        serviceName: 'soilgrids-weather',
        method: 'get',
        url: 'https://rest.isric.org/soilgrids/v2.0/properties/query',
        params: {
          lon: lon,
          lat: lat,
          property: ['phh2o', 'soc', 'clay', 'sand', 'silt'],
          depth: '0-5cm',
          value: 'mean'
        },
        timeout: 10000
      });
      if (!result.success) {
        throw new Error(result.error?.message || 'SoilGrids request failed');
      }
      const response = result.response;

      if (response.status === 200) {
        return this.parseSoilData(response.data);
      }
    } catch (error) {
      logger.warn('Soil API error:', error.message);
    }

    return this.getMockSoilData(lat, lon);
  }

  async getWeatherFromOpenMeteo(lat, lon) {
    try {
      const result = await resilientHttpClient.request({
        serviceName: 'openmeteo-current',
        method: 'get',
        url: 'https://api.open-meteo.com/v1/forecast',
        params: {
          latitude: lat,
          longitude: lon,
          current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,surface_pressure',
          daily: 'precipitation_sum',
          timezone: 'auto',
          forecast_days: 1
        },
        timeout: 10000
      });
      if (!result.success) {
        throw new Error(result.error?.message || 'Open-Meteo current request failed');
      }
      const response = result.response;
      if (response.data && response.data.current) {
        const c = response.data.current;
        const locationName = response.data.timezone || 'Location';
        return {
          temperature: c.temperature_2m,
          feels_like: c.temperature_2m,
          humidity: c.relative_humidity_2m || 60,
          pressure: c.surface_pressure || 1013,
          wind_speed: c.wind_speed_10m || 0,
          wind_degree: 0,
          weather: this.openMeteoWeatherCode(c.weather_code),
          description: this.openMeteoWeatherDesc(c.weather_code),
          clouds: 0,
          rainfall: c.precipitation || 0,
          sunrise: new Date().toISOString(),
          sunset: new Date().toISOString(),
          location: locationName,
          country: 'IN',
          source: 'AgriSmart AI',
          timestamp: new Date().toISOString()
        };
      }
    } catch (err) {
      logger.warn('Open-Meteo weather error:', err.message);
    }
    return null;
  }

  openMeteoWeatherCode(code) {
    const map = { 0: 'Clear', 1: 'Clear', 2: 'Partly Cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 61: 'Rain', 63: 'Rain', 65: 'Rain', 80: 'Rain', 81: 'Rain', 82: 'Rain', 95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm' };
    return map[code] != null ? map[code] : (code < 50 ? 'Clear' : code < 70 ? 'Rain' : 'Cloudy');
  }

  openMeteoWeatherDesc(code) {
    const map = { 0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Foggy', 48: 'Fog', 51: 'Light drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain', 80: 'Rain showers', 95: 'Thunderstorm' };
    return map[code] != null ? map[code] : 'Clear';
  }

  parseOpenWeatherData(data) {
    const main = data.main || {};
    const weatherArr = data.weather && data.weather[0];
    const sys = data.sys || {};
    return {
      temperature: main.temp != null ? main.temp : 25,
      feels_like: main.feels_like != null ? main.feels_like : main.temp,
      humidity: main.humidity != null ? main.humidity : 60,
      pressure: main.pressure != null ? main.pressure : 1013,
      wind_speed: (data.wind && data.wind.speed) != null ? data.wind.speed : 0,
      wind_degree: (data.wind && data.wind.deg) != null ? data.wind.deg : 0,
      weather: weatherArr ? (weatherArr.main || 'Clear') : 'Clear',
      description: weatherArr ? (weatherArr.description || 'Clear sky') : 'Clear sky',
      clouds: (data.clouds && data.clouds.all) != null ? data.clouds.all : 0,
      rainfall: (data.rain && data.rain['1h']) != null ? data.rain['1h'] : 0,
      sunrise: sys.sunrise ? new Date(sys.sunrise * 1000).toISOString() : new Date().toISOString(),
      sunset: sys.sunset ? new Date(sys.sunset * 1000).toISOString() : new Date().toISOString(),
      location: data.name || 'Location',
      country: sys.country || 'IN',
      source: 'AgriSmart AI',
      timestamp: new Date().toISOString()
    };
  }

  async getForecastFromOpenMeteo(lat, lon) {
    try {
      const result = await resilientHttpClient.request({
        serviceName: 'openmeteo-forecast',
        method: 'get',
        url: 'https://api.open-meteo.com/v1/forecast',
        params: {
          latitude: lat,
          longitude: lon,
          daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code',
          timezone: 'auto',
          forecast_days: 7
        },
        timeout: 10000
      });
      if (!result.success) {
        throw new Error(result.error?.message || 'Open-Meteo forecast request failed');
      }
      const response = result.response;
      if (!response.data || !response.data.daily) return null;
      const d = response.data.daily;
      const dates = d.time || [];
      const maxT = d.temperature_2m_max || [];
      const minT = d.temperature_2m_min || [];
      const precip = d.precipitation_sum || [];
      const codes = d.weather_code || [];
      return dates.slice(0, 10).map((date, i) => ({
        date: new Date(date).toISOString(),
        temperature: (maxT[i] + minT[i]) / 2,
        min_temp: minT[i],
        max_temp: maxT[i],
        humidity: 60,
        weather: this.openMeteoWeatherCode(codes[i] || 0),
        description: this.openMeteoWeatherDesc(codes[i] || 0),
        rainfall: precip[i] || 0
      }));
    } catch (err) {
      logger.warn('Open-Meteo forecast error:', err.message);
      return null;
    }
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
      source: 'AgriSmart AI',
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

  getMockWeather(lat, _lon) {
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
      source: 'AgriSmart AI',
      _source: 'fallback',
      isFallback: true,
      degradedReason: 'weather_api_unavailable',
      timestamp: new Date().toISOString()
    };
  }

  async getHourlyFromOpenMeteo(lat, lon, hours = 24) {
    try {
      const result = await resilientHttpClient.request({
        serviceName: 'openmeteo-hourly',
        method: 'get',
        url: 'https://api.open-meteo.com/v1/forecast',
        params: {
          latitude: lat,
          longitude: lon,
          hourly: 'temperature_2m,precipitation,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m',
          timezone: 'auto',
          forecast_days: Math.ceil(hours / 24) || 2
        },
        timeout: 10000
      });
      if (!result.success) {
        throw new Error(result.error?.message || 'Open-Meteo hourly request failed');
      }
      const response = result.response;
      if (!response.data || !response.data.hourly) return null;
      const h = response.data.hourly;
      const times = h.time || [];
      const temp = h.temperature_2m || [];
      const precip = h.precipitation || [];
      const code = h.weather_code || [];
      const humidity = h.relative_humidity_2m || [];
      const windSpeed = h.wind_speed_10m || [];
      const windDir = h.wind_direction_10m || [];
      const count = Math.min(hours, times.length);
      return Array.from({ length: count }, (_, i) => ({
        time: new Date(times[i]).toISOString(),
        temperature: temp[i] != null ? temp[i] : 25,
        conditions: {
          main: this.openMeteoWeatherCode(code[i] || 0),
          description: this.openMeteoWeatherDesc(code[i] || 0)
        },
        precipitation: { probability: Math.min(100, (precip[i] || 0) * 15), amount: precip[i] || 0 },
        humidity: humidity[i] != null ? humidity[i] : 60,
        wind: {
          speed: windSpeed[i] != null ? windSpeed[i] : 0,
          direction: this.windDegreeToDirection(windDir[i] || 0)
        }
      }));
    } catch (err) {
      logger.warn('Open-Meteo hourly error:', err.message);
      return null;
    }
  }

  windDegreeToDirection(deg) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(((deg % 360) / 45)) % 8;
    return dirs[idx] || 'N';
  }

  async getWeatherHourlyForecast(lat, lon, hours = 24) {
    const cacheKey = `hourly_${lat}_${lon}_${hours}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    const hourly = await this.getHourlyFromOpenMeteo(lat, lon, hours);
    if (hourly && hourly.length > 0) {
      this.cache.set(cacheKey, { data: hourly, timestamp: Date.now() });
      return hourly;
    }
    if (this.openweatherApiKey && this.openweatherApiKey !== 'your_api_key_here') {
      try {
        const result = await resilientHttpClient.request({
          serviceName: 'weather-openweathermap-hourly',
          method: 'get',
          url: this.weatherAPIs.openweathermap.forecast,
          params: { lat, lon, appid: this.openweatherApiKey, units: 'metric' },
          timeout: 10000
        });
        if (!result.success) {
          throw new Error(result.error?.message || 'OpenWeather hourly request failed');
        }
        const response = result.response;
        if (response.data && response.data.list && Array.isArray(response.data.list)) {
          const steps = Math.min(40, Math.ceil(hours / 3));
          const list = response.data.list.slice(0, steps);
          const data = list.map(item => ({
            time: new Date(item.dt * 1000).toISOString(),
            temperature: item.main?.temp ?? 25,
            conditions: {
              main: item.weather?.[0]?.main || 'Clear',
              description: item.weather?.[0]?.description || 'Clear sky'
            },
            precipitation: { probability: item.pop != null ? item.pop * 100 : 0, amount: item.rain?.['3h'] || 0 },
            humidity: item.main?.humidity ?? 60,
            wind: {
              speed: item.wind?.speed ?? 0,
              direction: this.windDegreeToDirection(item.wind?.deg ?? 0)
            }
          }));
          this.cache.set(cacheKey, { data, timestamp: Date.now() });
          return data;
        }
      } catch (e) {
        logger.warn('OpenWeather hourly forecast error:', e.message);
      }
    }
    const mock = [];
    const now = new Date();
    for (let i = 0; i < hours; i++) {
      const hour = new Date(now.getTime() + i * 60 * 60 * 1000);
      mock.push({
        time: hour.toISOString(),
        temperature: 25 + (Math.random() - 0.5) * 4,
        conditions: { main: 'Clear', description: 'Clear sky' },
        precipitation: { probability: 0, amount: 0 },
        humidity: 60,
        wind: { speed: 5, direction: 'SW' }
      });
    }
    return mock;
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
        rainfall: Math.random() * 5,
        isFallback: true,
        _source: 'fallback'
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
      source: 'AgriSmart AI',
      _source: 'fallback',
      isFallback: true,
      degradedReason: 'soil_api_unavailable',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new WeatherService();

