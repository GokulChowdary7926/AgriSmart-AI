
const mqtt = require('mqtt');
const redis = require('redis');
const logger = require('../utils/logger');

class IoTService {
  constructor() {
    this.mqttBroker = process.env.MQTT_BROKER || 'localhost';
    this.mqttPort = parseInt(process.env.MQTT_PORT || '1883');
    this.mqttUsername = process.env.MQTT_USERNAME || '';
    this.mqttPassword = process.env.MQTT_PASSWORD || '';
    
    this.redisClient = null;
    this.redisErrorLogged = false;
    if (process.env.REDIS_URL) {
      try {
        this.redisClient = redis.createClient({ 
          url: process.env.REDIS_URL,
          socket: {
            connectTimeout: 2000,
            reconnectStrategy: false
          }
        });
        this.redisClient.on('error', (err) => {
          if (!this.redisErrorLogged) {
            logger.warn('⚠️ Redis not available, continuing without cache');
            this.redisErrorLogged = true;
          }
          this.redisClient.quit().catch(() => {});
        });
        this.redisClient.on('connect', () => {
          logger.info('✅ Redis Connected (IoT Service)');
          this.redisErrorLogged = false;
        });
        this.redisClient.connect().catch(() => {
          this.redisClient.quit().catch(() => {});
        });
      } catch (error) {
        logger.warn('⚠️ Redis not available, continuing without cache');
        this.redisClient = null;
      }
    }
    
    this.mqttClient = null;
    this.setupMQTT();
    
    this.thresholds = this.loadThresholds();
    
    this.connectedSensors = {};
  }

  setupMQTT() {
    try {
      const mqttUrl = `mqtt://${this.mqttBroker}:${this.mqttPort}`;
      const options = {
        connectTimeout: 2000,
        reconnectPeriod: 0 // Disable auto-reconnect to prevent repeated errors
      };
      
      if (this.mqttUsername && this.mqttPassword) {
        options.username = this.mqttUsername;
        options.password = this.mqttPassword;
      }
      
      this.mqttClient = mqtt.connect(mqttUrl, options);
      this.mqttErrorLogged = false;
      
      this.mqttClient.on('connect', () => {
        logger.info('✅ Connected to MQTT broker');
        this.mqttClient.subscribe('sensors/#');
        this.mqttClient.subscribe('alerts/#');
        this.mqttErrorLogged = false;
      });
      
      this.mqttClient.on('message', (topic, message) => {
        this.handleMQTTMessage(topic, message);
      });
      
      this.mqttClient.on('error', (error) => {
        if (!this.mqttErrorLogged) {
          logger.warn('⚠️ MQTT broker not available, continuing without IoT features');
          this.mqttErrorLogged = true;
        }
      });
      
      this.mqttClient.on('close', () => {
      });
    } catch (error) {
      logger.warn(`⚠️ MQTT setup error, continuing without IoT features: ${error.message}`);
      this.mqttClient = null;
    }
  }

  async handleMQTTMessage(topic, message) {
    try {
      const data = JSON.parse(message.toString());
      
      if (topic.startsWith('sensors/')) {
        await this.processSensorData(topic, data);
      } else if (topic.startsWith('alerts/')) {
        await this.processAlert(topic, data);
      }
    } catch (error) {
      logger.error(`Error processing MQTT message: ${error.message}`);
    }
  }

  async processSensorData(topic, data) {
    try {
      const sensorId = topic.split('/').pop();
      const sensorType = data.type || 'unknown';
      const value = parseFloat(data.value || 0);
      const unit = data.unit || '';
      const location = data.location || {};
      const battery = data.battery || null;
      const signal = data.signal || null;
      
      const reading = {
        sensor_id: sensorId,
        sensor_type: sensorType,
        value,
        unit,
        timestamp: new Date().toISOString(),
        location,
        battery_level: battery,
        signal_strength: signal
      };
      
      await this.storeReading(reading);
      
      await this.checkThresholds(reading);
      
      this.updateSensorStatus(sensorId, 'active');
      
      logger.debug(`Processed data from sensor ${sensorId}: ${value}${unit}`);
    } catch (error) {
      logger.error(`Error processing sensor data: ${error.message}`);
    }
  }

  async storeReading(reading) {
    if (!this.redisClient) return;
    
    try {
      const key = `sensor:${reading.sensor_id}:latest`;
      const data = {
        value: reading.value,
        unit: reading.unit,
        timestamp: reading.timestamp,
        type: reading.sensor_type
      };
      
      await this.redisClient.setEx(key, 3600, JSON.stringify(data)); // 1 hour TTL
      
      const tsKey = `sensor:${reading.sensor_id}:history`;
      const tsData = JSON.stringify({
        timestamp: reading.timestamp,
        value: reading.value
      });
      
      const timestamp = new Date(reading.timestamp).getTime() / 1000;
      await this.redisClient.zAdd(tsKey, {
        score: timestamp,
        value: tsData
      });
      
      await this.redisClient.zRemRangeByRank(tsKey, 0, -1001);
    } catch (error) {
      logger.error(`Error storing reading: ${error.message}`);
    }
  }

  async checkThresholds(reading) {
    const threshold = this.thresholds[reading.sensor_type];
    
    if (!threshold) return;
    
    if (reading.value < threshold.min_value || reading.value > threshold.max_value) {
      await this.generateAlert(reading, threshold);
    }
  }

  async generateAlert(reading, threshold) {
    const alertData = {
      sensor_id: reading.sensor_id,
      sensor_type: reading.sensor_type,
      value: reading.value,
      unit: reading.unit,
      threshold_min: threshold.min_value,
      threshold_max: threshold.max_value,
      severity: threshold.severity,
      message: threshold.message_template
        .replace('{value}', reading.value)
        .replace('{unit}', reading.unit)
        .replace('{min}', threshold.min_value)
        .replace('{max}', threshold.max_value),
      action_required: threshold.action_required,
      timestamp: reading.timestamp,
      location: reading.location
    };
    
    if (this.redisClient) {
      const alertKey = `alert:${reading.sensor_id}:${Date.now()}`;
      await this.redisClient.setEx(alertKey, 86400, JSON.stringify(alertData)); // 24 hours
    }
    
    if (this.mqttClient) {
      this.mqttClient.publish(
        `alerts/${reading.sensor_type}`,
        JSON.stringify(alertData)
      );
    }
    
    logger.info(`Alert generated: ${alertData.message}`);
  }

  loadThresholds() {
    return {
      soil_moisture: {
        min_value: 20.0,
        max_value: 80.0,
        severity: 'medium',
        message_template: 'Soil moisture {value}{unit} is outside optimal range ({min}-{max}{unit})',
        action_required: 'Adjust irrigation'
      },
      temperature: {
        min_value: 10.0,
        max_value: 35.0,
        severity: 'high',
        message_template: 'Temperature {value}{unit} is outside safe range ({min}-{max}{unit})',
        action_required: 'Take crop protection measures'
      },
      soil_ph: {
        min_value: 5.5,
        max_value: 7.5,
        severity: 'low',
        message_template: 'Soil pH {value} is outside optimal range ({min}-{max})',
        action_required: 'Apply soil amendments'
      },
      nitrogen: {
        min_value: 200,
        max_value: 400,
        severity: 'medium',
        message_template: 'Soil nitrogen {value}{unit} is outside optimal range',
        action_required: 'Adjust fertilizer application'
      }
    };
  }

  async getSensorReadings(sensorId, startTime = null, endTime = null) {
    if (!this.redisClient) return [];
    
    try {
      const tsKey = `sensor:${sensorId}:history`;
      
      if (!startTime) {
        startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }
      if (!endTime) {
        endTime = new Date();
      }
      
      const startTimestamp = startTime.getTime() / 1000;
      const endTimestamp = endTime.getTime() / 1000;
      
      const readingsData = await this.redisClient.zRangeByScore(
        tsKey,
        startTimestamp,
        endTimestamp
      );
      
      return readingsData.map(data => {
        const reading = JSON.parse(data);
        return {
          value: reading.value,
          timestamp: reading.timestamp
        };
      });
    } catch (error) {
      logger.error(`Error getting sensor readings: ${error.message}`);
      return [];
    }
  }

  async analyzeSensorData(sensorId, periodDays = 7) {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - periodDays * 24 * 60 * 60 * 1000);
      
      const readings = await this.getSensorReadings(sensorId, startTime, endTime);
      
      if (readings.length === 0) {
        return { error: 'No data available' };
      }
      
      const values = readings.map(r => r.value);
      
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      let trend = 'stable';
      let trendStrength = 0;
      if (values.length > 1) {
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        if (secondAvg > firstAvg * 1.1) {
          trend = 'increasing';
          trendStrength = (secondAvg - firstAvg) / firstAvg;
        } else if (secondAvg < firstAvg * 0.9) {
          trend = 'decreasing';
          trendStrength = (firstAvg - secondAvg) / firstAvg;
        }
      }
      
      const insights = this.generateInsights(sensorId, {
        mean,
        median,
        min,
        max,
        trend,
        trendStrength
      }, values);
      
      return {
        count: values.length,
        mean,
        median,
        min,
        max,
        trend,
        trend_strength: trendStrength,
        insights
      };
    } catch (error) {
      logger.error(`Error analyzing sensor data: ${error.message}`);
      return { error: error.message };
    }
  }

  generateInsights(sensorId, stats, values) {
    const insights = [];
    const sensorType = this.getSensorType(sensorId);
    
    if (!sensorType) return insights;
    
    if (sensorType === 'soil_moisture') {
      const avgMoisture = stats.mean;
      
      if (avgMoisture < 30) {
        insights.push('Soil moisture is low. Consider increasing irrigation frequency.');
      } else if (avgMoisture > 70) {
        insights.push('Soil moisture is high. Reduce irrigation to prevent waterlogging.');
      } else {
        insights.push('Soil moisture is within optimal range. Maintain current irrigation schedule.');
      }
      
      if (stats.trend === 'decreasing' && stats.trendStrength > 0.1) {
        insights.push('Soil moisture is consistently decreasing. Check irrigation system.');
      }
    } else if (sensorType === 'temperature') {
      const avgTemp = stats.mean;
      
      if (avgTemp > 35) {
        insights.push('High temperatures detected. Consider shade nets or mulching.');
      } else if (avgTemp < 15) {
        insights.push('Low temperatures detected. Protect sensitive crops from frost.');
      }
      
      const tempRange = stats.max - stats.min;
      if (tempRange > 15) {
        insights.push('Large temperature fluctuations detected. Consider microclimate management.');
      }
    } else if (sensorType === 'soil_ph') {
      const avgPh = stats.mean;
      
      if (avgPh < 6.0) {
        insights.push('Soil is acidic. Consider applying lime or wood ash.');
      } else if (avgPh > 7.5) {
        insights.push('Soil is alkaline. Consider applying sulfur or gypsum.');
      } else {
        insights.push('Soil pH is within optimal range for most crops.');
      }
    }
    
    return insights;
  }

  getSensorType(sensorId) {
    if (sensorId.includes('moisture')) return 'soil_moisture';
    if (sensorId.includes('temp')) return 'temperature';
    if (sensorId.includes('ph')) return 'soil_ph';
    if (sensorId.includes('nitrogen')) return 'nitrogen';
    return null;
  }

  updateSensorStatus(sensorId, status) {
    this.connectedSensors[sensorId] = {
      status,
      last_seen: new Date().toISOString()
    };
    
    if (this.redisClient) {
      const statusKey = `sensor:${sensorId}:status`;
      this.redisClient.setEx(
        statusKey,
        300,
        JSON.stringify(this.connectedSensors[sensorId])
      );
    }
  }

  async getIrrigationRecommendation(soilMoisture, weatherForecast, cropType, soilType) {
    try {
      const recommendations = [];
      
      if (soilMoisture < 25) {
        recommendations.push({
          action: 'Irrigate immediately',
          priority: 'high',
          reason: 'Soil moisture critically low'
        });
      } else if (soilMoisture < 40) {
        recommendations.push({
          action: 'Irrigate within 24 hours',
          priority: 'medium',
          reason: 'Soil moisture below optimal'
        });
      } else if (soilMoisture > 75) {
        recommendations.push({
          action: 'Stop irrigation',
          priority: 'high',
          reason: 'Soil moisture too high'
        });
      }
      
      if (weatherForecast?.rain_probability > 60) {
        recommendations.push({
          action: 'Delay irrigation',
          priority: 'medium',
          reason: 'High probability of rainfall'
        });
      }
      
      if (weatherForecast?.temperature > 35) {
        recommendations.push({
          action: 'Irrigate in evening',
          priority: 'low',
          reason: 'High evaporation during day'
        });
      }
      
      const waterAmount = this.calculateWaterAmount(soilMoisture, cropType, soilType);
      
      return {
        soil_moisture: soilMoisture,
        unit: '%',
        recommendations,
        water_amount: waterAmount,
        irrigation_time: this.getBestIrrigationTime(weatherForecast),
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error generating irrigation recommendation: ${error.message}`);
      return { error: error.message };
    }
  }

  calculateWaterAmount(currentMoisture, cropType, soilType) {
    const targetMoisture = {
      rice: 80,
      wheat: 60,
      maize: 65,
      cotton: 55,
      vegetables: 70
    };
    
    const target = targetMoisture[cropType?.toLowerCase()] || 60;
    const deficit = Math.max(0, target - currentMoisture);
    
    const soilFactors = {
      sand: 0.8,
      loam: 1.2,
      clay: 1.5,
      clay_loam: 1.3
    };
    
    const soilFactor = soilFactors[soilType?.toLowerCase()] || 1.0;
    const waterAmount = deficit * soilFactor * 10; // Convert to mm
    
    return Math.round(waterAmount * 10) / 10;
  }

  getBestIrrigationTime(weatherForecast) {
    if (weatherForecast?.rain_probability > 40) {
      return 'Delay due to expected rain';
    }
    
    return 'Early morning or late evening';
  }
}

module.exports = new IoTService();












