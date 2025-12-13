const logger = require('../utils/logger');

const dataQualityMiddleware = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data && typeof data === 'object' && !data._quality) {
      const enhancedData = {
        ...data,
        _quality: {
          timestamp: new Date().toISOString(),
          source: req.originalUrl,
          confidence: calculateConfidence(data, req),
          isMockData: isMockData(data),
          isFallback: isFallbackData(data),
          dataFreshness: calculateFreshness(data),
          warnings: getDataWarnings(data)
        }
      };
      
      if (enhancedData._quality.confidence < 0.7) {
        logger.warn('Low confidence data returned', {
          endpoint: req.originalUrl,
          confidence: enhancedData._quality.confidence,
          warnings: enhancedData._quality.warnings
        });
      }
      
      return originalJson.call(this, enhancedData);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

function calculateConfidence(data, req) {
  let confidence = 1.0; // Start with full confidence
  
  if (isMockData(data)) confidence *= 0.5;
  if (isFallbackData(data)) confidence *= 0.7;
  
  if (data._cached) confidence *= 0.9;
  
  if (req.apiFailures && req.apiFailures > 0) {
    confidence *= Math.max(0.5, 1 - (req.apiFailures * 0.1));
  }
  
  if (hasDefaultValues(data)) confidence *= 0.8;
  
  return Math.round(confidence * 100) / 100;
}

function isMockData(data) {
  if (data && data._source === 'mock') return true;
  if (data && data.mock === true) return true;
  if (data && data._mock === true) return true;
  
  if (data && data.prices) {
    const prices = Array.isArray(data.prices) ? data.prices : Object.values(data.prices);
    if (prices.length > 0 && prices.every(price => {
      const priceVal = typeof price === 'object' ? price.value || price.price : price;
      return priceVal === 100 || priceVal === 50 || priceVal === 25;
    })) {
      return true; // All prices are round numbers
    }
  }
  
  return false;
}

function isFallbackData(data) {
  if (data && data._source === 'fallback') return true;
  if (data && data.fallback === true) return true;
  if (data && data._fallback === true) return true;
  
  if (data && data.weather) {
    if (data.weather.temperature === 25 && data.weather.humidity === 60) {
      return true; // Default weather values
    }
  }
  
  if (data && data.recommendations) {
    if (Array.isArray(data.recommendations) && data.recommendations.length === 0) {
      return true; // Empty recommendations might be fallback
    }
  }
  
  return false;
}

function hasDefaultValues(data) {
  const defaultPatterns = [
    { path: 'temperature', value: 25 },
    { path: 'humidity', value: 60 },
    { path: 'rainfall', value: 0 },
    { path: 'pH', value: 6.5 },
  ];
  
  for (const pattern of defaultPatterns) {
    if (data && data[pattern.path] === pattern.value) {
      return true;
    }
  }
  
  return false;
}

function calculateFreshness(data) {
  if (!data || !data.timestamp) {
    if (data && data.data && data.data.timestamp) {
      return calculateFreshnessFromTimestamp(data.data.timestamp);
    }
    return 'unknown';
  }
  
  return calculateFreshnessFromTimestamp(data.timestamp);
}

function calculateFreshnessFromTimestamp(timestamp) {
  try {
    const dataTime = new Date(timestamp);
    const now = new Date();
    const diffMinutes = (now - dataTime) / (1000 * 60);
    
    if (diffMinutes < 5) return 'fresh';
    if (diffMinutes < 30) return 'recent';
    if (diffMinutes < 1440) return 'stale'; // 24 hours
    return 'outdated';
  } catch (error) {
    return 'unknown';
  }
}

function getDataWarnings(data) {
  const warnings = [];
  
  if (isMockData(data)) {
    warnings.push('Data is simulated/mock data');
  }
  
  if (isFallbackData(data)) {
    warnings.push('Data is from fallback source (may be less accurate)');
  }
  
  if (data && data._cached) {
    warnings.push('Data is cached (may not be current)');
  }
  
  const freshness = calculateFreshness(data);
  if (freshness === 'outdated') {
    warnings.push('Data is outdated (more than 24 hours old)');
  } else if (freshness === 'stale') {
    warnings.push('Data is stale (more than 30 minutes old)');
  }
  
  if (hasDefaultValues(data)) {
    warnings.push('Data contains default/placeholder values');
  }
  
  return warnings;
}

module.exports = dataQualityMiddleware;






