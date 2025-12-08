const axios = require('axios');
const logger = require('../utils/logger');

class LocationService {
  constructor() {
    this.geocodingCache = new Map();
  }

  /**
   * Get location details from coordinates (reverse geocoding)
   */
  async getLocationFromCoordinates(latitude, longitude) {
    const cacheKey = `${latitude},${longitude}`;
    
    if (this.geocodingCache.has(cacheKey)) {
      return this.geocodingCache.get(cacheKey);
    }

    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1,
          'accept-language': 'en'
        },
        headers: {
          'User-Agent': 'AgriSmart-AI/1.0'
        }
      });

      const data = response.data;
      const location = {
        address: data.display_name,
        city: data.address?.city || data.address?.town || data.address?.village,
        district: data.address?.district || data.address?.county || data.address?.municipality || '',
        state: data.address?.state,
        country: data.address?.country || 'India',
        pincode: data.address?.postcode,
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        raw: data
      };

      // Cache for 24 hours
      this.geocodingCache.set(cacheKey, location);
      setTimeout(() => this.geocodingCache.delete(cacheKey), 24 * 60 * 60 * 1000);

      return location;
    } catch (error) {
      logger.error('Error getting location from coordinates:', error);
      // Return fallback location
      return {
        address: 'Unknown Location',
        city: 'Unknown',
        district: 'Unknown',
        state: 'Unknown',
        country: 'India',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }
  }

  /**
   * Get soil type based on location (India-specific)
   */
  async getSoilType(latitude, longitude, state = null) {
    // India soil type mapping by state/region
    const soilTypeMap = {
      'Punjab': 'alluvial',
      'Haryana': 'alluvial',
      'Uttar Pradesh': 'alluvial',
      'Bihar': 'alluvial',
      'West Bengal': 'alluvial',
      'Assam': 'alluvial',
      'Gujarat': 'black',
      'Madhya Pradesh': 'black',
      'Maharashtra': 'black',
      'Karnataka': 'red',
      'Tamil Nadu': 'red',
      'Andhra Pradesh': 'red',
      'Telangana': 'red',
      'Kerala': 'laterite',
      'Odisha': 'red',
      'Rajasthan': 'desert',
      'Himachal Pradesh': 'mountain',
      'Uttarakhand': 'mountain',
      'Jammu and Kashmir': 'mountain',
      'Meghalaya': 'laterite',
      'Mizoram': 'laterite',
      'Manipur': 'laterite',
      'Nagaland': 'laterite'
    };

    // Try to get state from coordinates if not provided
    if (!state) {
      const location = await this.getLocationFromCoordinates(latitude, longitude);
      state = location.state;
    }

    // Get soil type from state
    const soilType = soilTypeMap[state] || 'alluvial'; // Default to alluvial

    // Additional soil characteristics based on region
    const soilCharacteristics = {
      alluvial: { ph: 6.5, organicMatter: 'medium', drainage: 'good' },
      black: { ph: 7.5, organicMatter: 'high', drainage: 'moderate' },
      red: { ph: 6.0, organicMatter: 'low', drainage: 'good' },
      laterite: { ph: 5.5, organicMatter: 'low', drainage: 'excellent' },
      desert: { ph: 8.0, organicMatter: 'very low', drainage: 'excellent' },
      mountain: { ph: 6.0, organicMatter: 'high', drainage: 'good' }
    };

    return {
      type: soilType,
      ...soilCharacteristics[soilType],
      state: state || 'Unknown'
    };
  }

  /**
   * Get weather data for location
   */
  async getWeatherForLocation(latitude, longitude) {
    try {
      // Using OpenWeatherMap API (requires API key)
      // For now, return mock data - replace with actual API call
      const WeatherData = require('../models/WeatherData');
      
      // Try to get from database first (if WeatherData model exists and has getLatest method)
      try {
        if (WeatherData && typeof WeatherData.getLatest === 'function') {
          const existing = await WeatherData.getLatest([longitude, latitude]);
          if (existing && existing.timestamp > new Date(Date.now() - 60 * 60 * 1000)) {
            return {
              temperature: existing.temperature?.current || 25,
              rainfall: existing.precipitation?.rainfall || 0,
              humidity: existing.humidity || 60,
              conditions: existing.conditions?.main || 'Clear'
            };
          }
        }
      } catch (error) {
        // WeatherData model not available or getLatest not implemented - continue with fallback
        logger.debug('WeatherData.getLatest not available, using fallback');
      }

      // Fallback mock data
      return {
        temperature: 25,
        rainfall: 0,
        humidity: 60,
        conditions: 'Clear'
      };
    } catch (error) {
      logger.error('Error getting weather for location:', error);
      return {
        temperature: 25,
        rainfall: 0,
        humidity: 60,
        conditions: 'Clear'
      };
    }
  }

  /**
   * Get comprehensive location data (location + soil + weather)
   * Returns ALL required parameters: latitude, longitude, temperature, rainfall, pH, soilType
   */
  async getLocationData(latitude, longitude) {
    try {
      const [location, soil, weather] = await Promise.all([
        this.getLocationFromCoordinates(latitude, longitude),
        this.getSoilType(latitude, longitude),
        this.getWeatherForLocation(latitude, longitude)
      ]);

      // Ensure all required fields are present with proper structure
      return {
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          address: location.address || '',
          city: location.city || '',
          state: location.state || '',
          district: location.district || '',
          country: location.country || 'India',
          pincode: location.pincode || '',
          ...location
        },
        weather: {
          temperature: weather.temperature || 25,
          rainfall: weather.rainfall || 0,
          humidity: weather.humidity || 60,
          conditions: weather.conditions || 'Clear',
          ...weather
        },
        soil: {
          type: soil.type || 'alluvial',
          soilType: soil.type || 'alluvial', // Alias for compatibility
          ph: soil.ph || 6.5,
          pH: soil.ph || 6.5, // Alias for compatibility
          organicMatter: soil.organicMatter || 'medium',
          drainage: soil.drainage || 'good',
          ...soil
        },
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        // Direct access fields for easy access
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        temperature: weather.temperature || 25,
        rainfall: weather.rainfall || 0,
        ph: soil.ph || 6.5,
        pH: soil.ph || 6.5,
        soilType: soil.type || 'alluvial'
      };
    } catch (error) {
      logger.error('Error getting location data:', error);
      // Return fallback data with all required fields
      return {
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          address: 'Unknown Location',
          city: 'Unknown',
          state: 'Unknown',
          district: 'Unknown',
          country: 'India'
        },
        weather: {
          temperature: 25,
          rainfall: 0,
          humidity: 60,
          conditions: 'Clear'
        },
        soil: {
          type: 'alluvial',
          soilType: 'alluvial',
          ph: 6.5,
          pH: 6.5,
          organicMatter: 'medium',
          drainage: 'good'
        },
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        temperature: 25,
        rainfall: 0,
        ph: 6.5,
        pH: 6.5,
        soilType: 'alluvial'
      };
    }
  }
}

module.exports = new LocationService();
