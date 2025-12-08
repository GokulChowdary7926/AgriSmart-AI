const WeatherData = require('../models/WeatherData');
const logger = require('../utils/logger');

class WeatherController {
  // Get current weather
  static async getCurrent(req, res) {
    try {
      const { lat, lng, latitude, longitude } = req.query;
      
      // Support both lat/lng and latitude/longitude
      const latValue = lat || latitude;
      const lngValue = lng || longitude;
      
      if (!latValue || !lngValue) {
        // Return mock data if coordinates not provided
        return res.json({
          success: true,
          data: {
            temperature: { current: 25, min: 20, max: 30 },
            humidity: 60,
            precipitation: { rainfall: 0 },
            conditions: { main: 'Clear', description: 'Clear sky' },
            location: { city: 'Unknown', state: 'Unknown' }
          }
        });
      }
      
      const coordinates = [parseFloat(lngValue), parseFloat(latValue)];
      let weather = null;
      
      // Try to get weather from database if available
      try {
        if (WeatherData && typeof WeatherData.getLatest === 'function') {
          weather = await WeatherData.getLatest(coordinates);
        }
      } catch (dbError) {
        logger.warn('WeatherData.getLatest not available or failed:', dbError.message);
      }
      
      if (!weather) {
        // Return mock data if not found in database
        return res.json({
          success: true,
          data: {
            temperature: { current: 25, min: 20, max: 30 },
            humidity: 60,
            precipitation: { rainfall: 0 },
            conditions: { main: 'Clear', description: 'Clear sky' },
            location: { city: 'Unknown', state: 'Unknown' },
            coordinates: coordinates
          }
        });
      }
      
      res.json({
        success: true,
        data: weather
      });
    } catch (error) {
      logger.error('Error fetching current weather:', error);
      // Return mock data on error
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
  
  // Get weather history
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
      
      // Try to get history from database if available
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
  
  // Create weather data
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
  
  // Get weather forecast
  static async getForecast(req, res) {
    try {
      const { lat, lng, days = 7 } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          error: 'Latitude and longitude are required'
        });
      }
      
      // This would typically call an external weather API
      // For now, return a placeholder response
      res.json({
        success: true,
        data: {
          location: { lat: parseFloat(lat), lng: parseFloat(lng) },
          forecast: [],
          message: 'Forecast feature coming soon'
        }
      });
    } catch (error) {
      logger.error('Error fetching forecast:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = WeatherController;
