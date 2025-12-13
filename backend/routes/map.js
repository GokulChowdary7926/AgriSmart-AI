const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

router.get('/reverse-geocode', async (req, res) => {
  try {
    const { latitude, longitude, language = 'en' } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    logger.info(`Reverse geocoding: ${latitude}, ${longitude} (Language: ${language})`);
    
    const osmResult = await reverseGeocodeOSM(latitude, longitude, language);
    
    if (osmResult) {
      return res.json({
        success: true,
        address: osmResult,
        provider: 'openstreetmap'
      });
    }
    
    const approximateAddress = generateApproximateAddress(latitude, longitude, language);
    
    res.json({
      success: true,
      address: approximateAddress,
      provider: 'approximate',
      note: 'Using approximate address based on coordinates'
    });
    
  } catch (error) {
    logger.error('Reverse geocode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get address from coordinates',
      error: error.message
    });
  }
});

router.get('/geocode', async (req, res) => {
  try {
    const { query, language = 'en' } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    logger.info(`Geocoding: "${query}" (Language: ${language})`);
    
    const osmResults = await forwardGeocodeOSM(query, language);
    
    if (osmResults && osmResults.length > 0) {
      return res.json({
        success: true,
        results: osmResults,
        provider: 'openstreetmap',
        count: osmResults.length
      });
    }
    
    res.json({
      success: true,
      results: [],
      message: 'No results found'
    });
    
  } catch (error) {
    logger.error('Geocode error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to geocode address',
      error: error.message
    });
  }
});

router.get('/address-details', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, language = 'en' } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    const address = await reverseGeocodeOSM(latitude, longitude, language);
    
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }
    
    res.json({
      success: true,
      address: address,
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      formatted: formatCompleteAddress(address, language)
    });
    
  } catch (error) {
    logger.error('Address details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get address details'
    });
  }
});

async function reverseGeocodeOSM(latitude, longitude, language) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'json',
        lat: latitude,
        lon: longitude,
        zoom: 18,
        addressdetails: 1,
        'accept-language': language,
        polygon: 0
      },
      headers: {
        'User-Agent': 'AgriSmart-AI/1.0'
      }
    });
    
    if (response.data && response.data.address) {
      return formatOSMAddress(response.data, latitude, longitude);
    }
    
    return null;
  } catch (error) {
    logger.error('OSM reverse geocode error:', error.message);
    return null;
  }
}

async function forwardGeocodeOSM(query, language) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'json',
        addressdetails: 1,
        limit: 10,
        'accept-language': language,
        countrycodes: 'in' // Prioritize India
      },
      headers: {
        'User-Agent': 'AgriSmart-AI/1.0'
      }
    });
    
    if (response.data && response.data.length > 0) {
      return response.data.map(item => ({
        display_name: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        address: item.address,
        type: item.type,
        importance: item.importance
      }));
    }
    
    return [];
  } catch (error) {
    logger.error('OSM forward geocode error:', error.message);
    return [];
  }
}

function formatOSMAddress(data, lat, lng) {
  const address = data.address || {};
  
  return {
    display_name: data.display_name,
    house_number: address.house_number || '',
    road: address.road || '',
    neighbourhood: address.neighbourhood || '',
    village: address.village || '',
    town: address.town || '',
    city: address.city || address.town || address.village || '',
    county: address.county || '',
    district: address.district || address.county || '',
    state: address.state || '',
    state_district: address.state_district || '',
    region: address.region || '',
    postcode: address.postcode || '',
    country: address.country || '',
    country_code: address.country_code || '',
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
    type: data.type || 'unknown',
    boundingbox: data.boundingbox,
    formatted: formatAddressString(address),
    raw: address
  };
}

function formatAddressString(address) {
  const parts = [];
  
  if (address.house_number) parts.push(address.house_number);
  if (address.road) parts.push(address.road);
  if (address.village) parts.push(address.village);
  if (address.town && address.town !== address.village) parts.push(address.town);
  if (address.city && address.city !== address.town) parts.push(address.city);
  if (address.district) parts.push(address.district);
  if (address.state) parts.push(address.state);
  if (address.postcode) parts.push(address.postcode);
  if (address.country) parts.push(address.country);
  
  return parts.join(', ');
}

function formatCompleteAddress(address, language) {
  const parts = [];
  
  if (address.house_number) parts.push(`House: ${address.house_number}`);
  if (address.road) parts.push(`Road: ${address.road}`);
  if (address.village) parts.push(`Village: ${address.village}`);
  if (address.city) parts.push(`City: ${address.city}`);
  if (address.district) parts.push(`District: ${address.district}`);
  if (address.state) parts.push(`State: ${address.state}`);
  if (address.postcode) parts.push(`Postal Code: ${address.postcode}`);
  if (address.country) parts.push(`Country: ${address.country}`);
  
  return parts.join('\n');
}

function generateApproximateAddress(latitude, longitude, language) {
  const regions = {
    'north': { state: 'Punjab/Haryana', district: 'Northern Region', city: 'North India' },
    'south': { state: 'Tamil Nadu/Karnataka', district: 'Southern Region', city: 'South India' },
    'east': { state: 'West Bengal/Odisha', district: 'Eastern Region', city: 'East India' },
    'west': { state: 'Maharashtra/Gujarat', district: 'Western Region', city: 'West India' },
    'central': { state: 'Madhya Pradesh', district: 'Central Region', city: 'Central India' }
  };
  
  const region = getIndianRegion(latitude, longitude);
  const regionInfo = regions[region] || regions.central;
  
  return {
    display_name: `${regionInfo.city}, ${regionInfo.district}, ${regionInfo.state}, India`,
    city: regionInfo.city,
    district: regionInfo.district,
    state: regionInfo.state,
    country: 'India',
    country_code: 'IN',
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    formatted: `${regionInfo.city}, ${regionInfo.district}, ${regionInfo.state}, India`,
    type: 'approximate',
    note: 'Approximate location based on coordinates'
  };
}

function getIndianRegion(lat, lng) {
  if (lat > 30) return 'north'; // Punjab, Haryana, Himachal
  if (lat < 15) return 'south'; // Tamil Nadu, Kerala, Karnataka
  if (lng > 85) return 'east'; // West Bengal, Odisha, Assam
  if (lng < 70) return 'west'; // Gujarat, Rajasthan
  return 'central'; // Madhya Pradesh, Uttar Pradesh
}

module.exports = router;

















