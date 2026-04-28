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

  getTimeBucket(minutes = 30) {
    const now = new Date();
    return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}-${Math.floor(now.getUTCHours() * 60 / minutes)}`;
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
    const v = min + (max - min) * this.hashToUnit(seed);
    return Number(v.toFixed(precision));
  }

  async getIoTData(farmId, sensorType = 'all') {
    try {
      const bucket = this.getTimeBucket(30);
      const baseSeed = `${farmId || 'demo-farm'}:${bucket}`;
      const sensors = {
        soil: {
          moisture: this.valueFromSeed(`${baseSeed}:soil:moisture`, 25, 85),
          temperature: this.valueFromSeed(`${baseSeed}:soil:temperature`, 20, 34),
          ph: this.valueFromSeed(`${baseSeed}:soil:ph`, 5.8, 7.8),
          nitrogen: this.valueFromSeed(`${baseSeed}:soil:nitrogen`, 45, 85),
          phosphorus: this.valueFromSeed(`${baseSeed}:soil:phosphorus`, 25, 60),
          potassium: this.valueFromSeed(`${baseSeed}:soil:potassium`, 35, 70),
          timestamp: new Date().toISOString()
        },
        weather: {
          temperature: this.valueFromSeed(`${baseSeed}:weather:temperature`, 22, 38),
          humidity: this.valueFromSeed(`${baseSeed}:weather:humidity`, 40, 90),
          rainfall: this.valueFromSeed(`${baseSeed}:weather:rainfall`, 0, 18),
          windSpeed: this.valueFromSeed(`${baseSeed}:weather:wind`, 1, 18),
          pressure: this.valueFromSeed(`${baseSeed}:weather:pressure`, 1000, 1026),
          timestamp: new Date().toISOString()
        },
        crop: {
          health: this.valueFromSeed(`${baseSeed}:crop:health`, 68, 96),
          growth: this.valueFromSeed(`${baseSeed}:crop:growth`, 50, 92),
          pestRisk: this.valueFromSeed(`${baseSeed}:crop:pestRisk`, 5, 45),
          diseaseRisk: this.valueFromSeed(`${baseSeed}:crop:diseaseRisk`, 5, 40),
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
      const iot = await this.getIoTData(`${state || 'region'}:${crop || 'general'}`, 'crop');
      const cropRisk = iot?.data || {};
      const demandIndex = this.valueFromSeed(`${state || 'India'}:${crop || 'all'}:${this.getTimeBucket(120)}:demand`, 0, 100);
      const priceDelta = this.valueFromSeed(`${state || 'India'}:${crop || 'all'}:${this.getTimeBucket(120)}:priceDelta`, -8, 12);

      if (priceDelta >= 4) {
        alerts.push({
          type: 'price_surge',
          severity: priceDelta >= 8 ? 'high' : 'medium',
          title: `${crop || 'Crop'} Price Surge Alert`,
          message: `Prices have increased by ${priceDelta.toFixed(1)}% in ${state || 'your region'}`,
          action: 'Consider selling now',
          timestamp: now.toISOString(),
          priority: priceDelta >= 8 ? 'high' : 'medium'
        });
      }

      if (priceDelta <= -4) {
        alerts.push({
          type: 'price_drop',
          severity: 'medium',
          title: `${crop || 'Crop'} Price Drop Alert`,
          message: `Prices have decreased by ${Math.abs(priceDelta).toFixed(1)}%. Consider waiting or storage.`,
          action: 'Monitor market trends',
          timestamp: now.toISOString(),
          priority: 'medium'
        });
      }

      if (demandIndex >= 72 || cropRisk.health >= 88) {
        alerts.push({
          type: 'high_demand',
          severity: 'high',
          title: 'High Demand Alert',
          message: `High demand for ${crop || 'your crops'} in nearby markets (index ${Math.round(demandIndex)}/100)`,
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
      const locationSeed = `${lat || 20.5937}:${lng || 78.9629}:${this.getTimeBucket(120)}`;
      const rainfallRisk = this.valueFromSeed(`${locationSeed}:rainRisk`, 0, 100);
      const droughtRisk = this.valueFromSeed(`${locationSeed}:droughtRisk`, 0, 100);
      const heatRisk = this.valueFromSeed(`${locationSeed}:heatRisk`, 0, 100);

      if (rainfallRisk >= 60) {
        alerts.push({
          type: 'rain_forecast',
          severity: rainfallRisk >= 78 ? 'high' : 'medium',
          title: 'Rain Forecast',
          message: `Elevated rainfall risk (${Math.round(rainfallRisk)}%) expected in next 24-48 hours`,
          action: 'Harvest early or protect crops',
          timestamp: now.toISOString(),
          priority: rainfallRisk >= 78 ? 'high' : 'medium',
          validUntil: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()
        });
      }

      if (droughtRisk >= 82) {
        alerts.push({
          type: 'drought_warning',
          severity: 'high',
          title: 'Drought Warning',
          message: `Low rainfall probability detected (risk ${Math.round(droughtRisk)}%). Irrigation may be needed.`,
          action: 'Check irrigation systems',
          timestamp: now.toISOString(),
          priority: 'high'
        });
      }

      if (heatRisk >= 65) {
        alerts.push({
          type: 'temperature_extreme',
          severity: heatRisk >= 82 ? 'high' : 'medium',
          title: 'Temperature Alert',
          message: `Extreme temperature risk detected (${Math.round(heatRisk)}%). Protect sensitive crops.`,
          action: 'Use shade nets or irrigation',
          timestamp: now.toISOString(),
          priority: heatRisk >= 82 ? 'high' : 'medium'
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

  async getPestDiseaseWarning(farmId, _crop) {
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

