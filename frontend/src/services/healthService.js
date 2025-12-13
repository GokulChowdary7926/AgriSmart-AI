import api from './api';
import logger from './logger';


const checkEndpointHealth = async (endpoint) => {
  const startTime = Date.now();
  
  try {
    const response = await api.get(endpoint.url, {
      timeout: 5000,
      validateStatus: (status) => status < 500 // Don't throw on 4xx
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      name: endpoint.name,
      status: response.status >= 200 && response.status < 300 ? 'healthy' : 'unhealthy',
      responseTime: `${responseTime}ms`,
      statusCode: response.status,
      timestamp: new Date().toISOString(),
      error: null
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      name: endpoint.name,
      status: 'offline',
      responseTime: `${responseTime}ms`,
      statusCode: error.response?.status || null,
      timestamp: new Date().toISOString(),
      error: error.message || 'Request failed'
    };
  }
};

export const checkAPIHealth = async () => {
  const endpoints = [
    { name: 'Auth API', url: '/auth/me' },
    { name: 'Weather API', url: '/weather/current?lat=28.6139&lng=77.2090' },
    { name: 'Market API', url: '/market/prices?limit=1' },
    { name: 'Crop API', url: '/crops?limit=1' },
    { name: 'Disease API', url: '/diseases?limit=1' },
    { name: 'Agri-GPT API', url: '/agri-gpt/health' },
    { name: 'Analytics API', url: '/analytics/dashboard' }
  ];
  
  const results = await Promise.all(
    endpoints.map(endpoint => checkEndpointHealth(endpoint))
  );
  
  return results;
};

export const startHealthMonitoring = (callback, interval = 5 * 60 * 1000) => {
  let isRunning = true;
  let timeoutId = null;
  
  const checkHealth = async () => {
    if (!isRunning) return;
    
    try {
      const health = await checkAPIHealth();
      const offlineServices = health.filter(s => s.status !== 'healthy');
      
      if (callback) {
        callback(health, offlineServices);
      }
      
      if (offlineServices.length > 0) {
        const criticalServices = offlineServices.filter(s => 
          s.name === 'Auth API' || s.name === 'Agri-GPT API'
        );
        
        if (criticalServices.length > 0) {
          logger.warn('Critical services offline', { services: criticalServices });
          
          if (typeof window !== 'undefined' && window.Notification && Notification.permission === 'granted') {
            new Notification('Service Alert', {
              body: `${criticalServices[0].name} is temporarily unavailable`,
              icon: '/favicon.ico'
            });
          }
        }
      }
    } catch (error) {
      logger.error('Health check error', error);
    }
    
    if (isRunning) {
      timeoutId = setTimeout(checkHealth, interval);
    }
  };
  
  checkHealth();
  
  return () => {
    isRunning = false;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
};

export const getHealthSummary = async () => {
  const health = await checkAPIHealth();
  
  const summary = {
    total: health.length,
    healthy: health.filter(s => s.status === 'healthy').length,
    unhealthy: health.filter(s => s.status === 'unhealthy').length,
    offline: health.filter(s => s.status === 'offline').length,
    averageResponseTime: health.reduce((sum, s) => {
      const time = parseInt(s.responseTime) || 0;
      return sum + time;
    }, 0) / health.length,
    services: health
  };
  
  return summary;
};

export default {
  checkAPIHealth,
  startHealthMonitoring,
  getHealthSummary,
  checkEndpointHealth
};








