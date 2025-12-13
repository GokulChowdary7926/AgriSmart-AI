const axios = require('axios');
let logger;
try {
  logger = require('../utils/logger');
} catch (error) {
  logger = {
    info: console.log,
    error: console.error,
    warn: console.warn
  };
}

class RealTimeAgricultureService {
  constructor() {
    this.iotSensors = new Map();
    this.marketAlerts = [];
    this.weatherAlerts = [];
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute
  }

  async getIoTData(farmId, sensorType = 'all') {
    try {
      const sensors = {
        soil: {
          moisture: Math.random() * 100,
          temperature: 25 + Math.random() * 10,
          ph: 6.5 + Math.random() * 1.5,
          nitrogen: 50 + Math.random() * 30,
          phosphorus: 30 + Math.random() * 20,
          potassium: 40 + Math.random() * 25,
          timestamp: new Date().toISOString()
        },
        weather: {
          temperature: 28 + Math.random() * 5,
          humidity: 60 + Math.random() * 20,
          rainfall: Math.random() * 10,
          windSpeed: Math.random() * 15,
          pressure: 1013 + Math.random() * 10,
          timestamp: new Date().toISOString()
        },
        crop: {
          health: 75 + Math.random() * 20,
          growth: 60 + Math.random() * 30,
          pestRisk: Math.random() * 30,
          diseaseRisk: Math.random() * 25,
          timestamp: new Date().toISOString()
        }
      };

      if (sensorType === 'all') {
        return {
          success: true,
          data: sensors,
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data: sensors[sensorType] || {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error fetching IoT data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getMarketAlerts(crop, state) {
    try {
      const alerts = [];
      const now = new Date();

      if (Math.random() > 0.7) {
        alerts.push({
          type: 'price_surge',
          severity: 'high',
          title: `${crop || 'Crop'} Price Surge Alert`,
          message: `Prices have increased by ${(Math.random() * 10 + 5).toFixed(1)}% in ${state || 'your region'}`,
          action: 'Consider selling now',
          timestamp: now.toISOString(),
          priority: 'high'
        });
      }

      if (Math.random() > 0.8) {
        alerts.push({
          type: 'price_drop',
          severity: 'medium',
          title: `${crop || 'Crop'} Price Drop Alert`,
          message: `Prices have decreased. Consider waiting or storing.`,
          action: 'Monitor market trends',
          timestamp: now.toISOString(),
          priority: 'medium'
        });
      }

      if (Math.random() > 0.75) {
        alerts.push({
          type: 'high_demand',
          severity: 'high',
          title: 'High Demand Alert',
          message: `High demand for ${crop || 'your crops'} in nearby markets`,
          action: 'Contact local mandis',
          timestamp: now.toISOString(),
          priority: 'high'
        });
      }

      return {
        success: true,
        alerts: alerts,
        count: alerts.length,
        timestamp: now.toISOString()
      };
    } catch (error) {
      logger.error('Error fetching market alerts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getWeatherAlerts(lat, lng) {
    try {
      const alerts = [];
      const now = new Date();

      if (Math.random() > 0.6) {
        alerts.push({
          type: 'rain_forecast',
          severity: 'medium',
          title: 'Rain Forecast',
          message: 'Heavy rainfall expected in next 24-48 hours',
          action: 'Harvest early or protect crops',
          timestamp: now.toISOString(),
          priority: 'medium',
          validUntil: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
        });
      }

      if (Math.random() > 0.85) {
        alerts.push({
          type: 'drought_warning',
          severity: 'high',
          title: 'Drought Warning',
          message: 'Low rainfall detected. Irrigation may be needed.',
          action: 'Check irrigation systems',
          timestamp: now.toISOString(),
          priority: 'high'
        });
      }

      if (Math.random() > 0.7) {
        alerts.push({
          type: 'temperature_extreme',
          severity: 'medium',
          title: 'Temperature Alert',
          message: 'Extreme temperatures expected. Protect sensitive crops.',
          action: 'Use shade nets or irrigation',
          timestamp: now.toISOString(),
          priority: 'medium'
        });
      }

      return {
        success: true,
        alerts: alerts,
        count: alerts.length,
        timestamp: now.toISOString()
      };
    } catch (error) {
      logger.error('Error fetching weather alerts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getIrrigationRecommendation(farmId) {
    try {
      const iotData = await this.getIoTData(farmId, 'soil');
      const soil = iotData.data;

      let recommendation = {
        action: 'no_action',
        message: 'Soil moisture is optimal',
        urgency: 'low',
        duration: 0,
        amount: 0
      };

      if (soil.moisture < 30) {
        recommendation = {
          action: 'irrigate',
          message: 'Soil moisture is low. Irrigation needed.',
          urgency: 'high',
          duration: 30, // minutes
          amount: 5000, // liters per acre
          method: 'drip' // or 'sprinkler', 'flood'
        };
      } else if (soil.moisture < 50) {
        recommendation = {
          action: 'irrigate',
          message: 'Soil moisture is moderate. Light irrigation recommended.',
          urgency: 'medium',
          duration: 15,
          amount: 2500,
          method: 'drip'
        };
      }

      return {
        success: true,
        recommendation: recommendation,
        soilData: soil,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting irrigation recommendation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getPestDiseaseWarning(farmId, crop) {
    try {
      const iotData = await this.getIoTData(farmId, 'crop');
      const cropData = iotData.data;

      const warnings = [];

      if (cropData.pestRisk > 20) {
        warnings.push({
          type: 'pest',
          severity: cropData.pestRisk > 40 ? 'high' : 'medium',
          message: `Pest risk detected (${cropData.pestRisk.toFixed(1)}%)`,
          action: 'Apply preventive measures',
          treatment: 'Use neem oil or recommended pesticides'
        });
      }

      if (cropData.diseaseRisk > 15) {
        warnings.push({
          type: 'disease',
          severity: cropData.diseaseRisk > 30 ? 'high' : 'medium',
          message: `Disease risk detected (${cropData.diseaseRisk.toFixed(1)}%)`,
          action: 'Monitor closely and apply treatment if needed',
          treatment: 'Use organic fungicides or consult expert'
        });
      }

      return {
        success: true,
        warnings: warnings,
        cropHealth: cropData.health,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting pest/disease warning:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getDashboardData(farmId, location) {
    try {
      const [iotData, marketAlerts, weatherAlerts, irrigation, pestWarning] = await Promise.all([
        this.getIoTData(farmId),
        this.getMarketAlerts(null, location?.state),
        this.getWeatherAlerts(location?.lat, location?.lng),
        this.getIrrigationRecommendation(farmId),
        this.getPestDiseaseWarning(farmId)
      ]);

      return {
        success: true,
        data: {
          iot: iotData.data,
          marketAlerts: marketAlerts.alerts || [],
          weatherAlerts: weatherAlerts.alerts || [],
          irrigation: irrigation.recommendation,
          pestWarning: pestWarning.warnings || [],
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new RealTimeAgricultureService();

