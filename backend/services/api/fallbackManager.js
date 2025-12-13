
const logger = require('../../utils/logger');

class FallbackManager {
  constructor() {
    this.fallbackData = {
      weather: this.getWeatherFallback(),
      market: this.getMarketFallback(),
      crops: this.getCropsFallback(),
      diseases: this.getDiseasesFallback()
    };
  }

  getFallback(serviceName, params = {}) {
    const fallback = this.fallbackData[serviceName];
    if (!fallback) {
      logger.warn(`No fallback available for service: ${serviceName}`);
      return null;
    }

    if (serviceName === 'weather' && params.lat && params.lng) {
      return this.customizeWeatherFallback(fallback, params);
    }

    if (serviceName === 'market' && params.commodity) {
      return this.customizeMarketFallback(fallback, params);
    }

    return {
      ...fallback,
      source: 'fallback',
      note: 'Using fallback data - external API unavailable',
      timestamp: new Date().toISOString()
    };
  }

  getWeatherFallback() {
    return {
      temperature: 25,
      feels_like: 26,
      humidity: 60,
      pressure: 1013,
      wind_speed: 5,
      wind_deg: 180,
      description: 'Partly Cloudy',
      icon: 'https://openweathermap.org/img/wn/03d.png',
      agricultural_insights: [{
        type: 'info',
        message: 'Weather data unavailable. Using average conditions.',
        severity: 'low'
      }],
      alerts: []
    };
  }

  getMarketFallback() {
    return {
      prices: [
        {
          commodity: 'Wheat',
          market: 'Delhi',
          price: 2200,
          unit: 'Quintal',
          change: 0,
          date: new Date().toISOString().split('T')[0]
        },
        {
          commodity: 'Rice',
          market: 'Mumbai',
          price: 2800,
          unit: 'Quintal',
          change: 0,
          date: new Date().toISOString().split('T')[0]
        }
      ],
      analysis: {
        trend: 'STABLE',
        volatility: 0,
        note: 'Market data unavailable. Using sample data.'
      }
    };
  }

  getCropsFallback() {
    return {
      recommendations: [
        {
          crop: 'Rice',
          suitability: 'HIGH',
          season: 'Kharif',
          reason: 'Suitable for most Indian regions'
        },
        {
          crop: 'Wheat',
          suitability: 'HIGH',
          season: 'Rabi',
          reason: 'Widely grown across India'
        }
      ],
      note: 'Using general crop recommendations'
    };
  }

  getDiseasesFallback() {
    return {
      common_diseases: [
        {
          name: 'Rust',
          crop: 'Wheat',
          symptoms: 'Orange-brown pustules on leaves',
          treatment: 'Apply fungicides and ensure proper spacing'
        }
      ],
      note: 'Limited disease data available'
    };
  }

  customizeWeatherFallback(fallback, params) {
    const lat = params.lat;
    let tempAdjustment = 0;
    
    if (lat > 30) tempAdjustment = -5; // North India - cooler
    if (lat < 15) tempAdjustment = 5;  // South India - warmer
    
    return {
      ...fallback,
      temperature: fallback.temperature + tempAdjustment,
      feels_like: fallback.feels_like + tempAdjustment,
      location: `Lat: ${params.lat}, Lng: ${params.lng}`
    };
  }

  customizeMarketFallback(fallback, params) {
    const commodity = params.commodity.toLowerCase();
    const priceMap = {
      'wheat': 2200,
      'rice': 2800,
      'corn': 1800,
      'potato': 1500,
      'tomato': 3000,
      'cotton': 6000
    };

    const price = priceMap[commodity] || 2000;

    return {
      ...fallback,
      prices: [{
        commodity: params.commodity,
        market: 'General',
        price: price,
        unit: 'Quintal',
        change: 0,
        date: new Date().toISOString().split('T')[0]
      }]
    };
  }

  shouldUseFallback(error, retryCount = 0) {
    
    if (retryCount >= 3) return true;
    
    if (error.code === 'ECONNREFUSED' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND') {
      return true;
    }
    
    if (error.response) {
      const status = error.response.status;
      if (status === 429 || status === 503 || status >= 500) {
        return true;
      }
    }
    
    return false;
  }
}

module.exports = new FallbackManager();







