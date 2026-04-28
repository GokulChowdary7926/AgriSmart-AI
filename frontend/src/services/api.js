import axios from 'axios';
import logger from './logger';
import { getStoredLocation } from './realtimeLocation';

const AUTH_EXPIRED_EVENT = 'auth:expired';

const notifyAuthExpired = (reason = 'unauthorized') => {
  try {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { reason } }));
  } catch (_) {
    // Non-blocking: auth state can still be handled by route guards.
  }
};

export const getApiErrorMessage = (errorLike, fallback = 'Something went wrong. Please try again.') => {
  if (!errorLike) return fallback;

  if (typeof errorLike === 'string') return errorLike;

  const responseData = errorLike.response?.data || errorLike.data || errorLike;
  const structuredError = responseData?.error;

  if (typeof structuredError === 'string') return structuredError;
  if (structuredError?.message) return structuredError.message;
  if (responseData?.message && responseData?.success === false) return responseData.message;
  if (errorLike.message && typeof errorLike.message === 'string') return errorLike.message;

  return fallback;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    const language = localStorage.getItem('language') || localStorage.getItem('i18nextLng') || 'en';
    config.headers['Accept-Language'] = language;
    config.headers['X-App-Language'] = language;
    
    if (String(config.method || '').toLowerCase() === 'get') {
      config.params = config.params || {};
      if (!config.params.lang) {
        config.params.lang = language;
      }
    }
    
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    logger.error('Request error', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if ((error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR' || !error.response) && !originalRequest._retry) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      if (originalRequest._retryCount <= 2) {
        logger.debug(`Retrying request (attempt ${originalRequest._retryCount})`);
        
        await new Promise(resolve => setTimeout(resolve, 1000 * originalRequest._retryCount));
        
        return api.request(originalRequest);
      }
    }
    
    if (error.response) {
      switch (error.response.status) {
        case 401:
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            notifyAuthExpired('token_invalid_or_expired');
          }
          return Promise.reject({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please sign in again.' },
            message: 'Authentication required. Please sign in again.',
            statusCode: 401
          });
          
        case 403:
          logger.error('Access forbidden');
          return Promise.reject({
            success: false,
            error: { code: 'FORBIDDEN', message: 'You do not have permission to access this resource.' },
            message: 'You do not have permission to access this resource.',
            statusCode: 403
          });
          
        case 404:
          logger.error('API endpoint not found', { url: originalRequest.url });
          return Promise.reject({
            success: false,
            error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' },
            message: 'The requested resource was not found.',
            statusCode: 404
          });
          
        case 429:
          logger.warn('Rate limit exceeded');
          const retryAfter = error.response.headers['retry-after'] || 60;
          return Promise.reject({
            success: false,
            error: { code: 'RATE_LIMIT_EXCEEDED', message: `Too many requests. Please wait ${retryAfter} seconds before trying again.` },
            message: `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
            statusCode: 429,
            retryAfter
          });
          
        case 500:
          console.error('Server error:', error.response.data);
          return Promise.reject({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Server error. Please try again later.' },
            message: 'Server error. Please try again later.',
            statusCode: 500
          });
          
        case 503:
          logger.error('Service unavailable');
          return Promise.reject({
            success: false,
            error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again later.' },
            message: 'Service temporarily unavailable. Please try again later.',
            statusCode: 503
          });
      }
    }
    
    if (!error.response) {
      return Promise.reject({
        success: false,
        error: {
          code: error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: error.code === 'ECONNABORTED'
            ? 'Request timeout. Please check your connection and try again.'
            : 'Network error. Please check your connection.'
        },
        message: error.code === 'ECONNABORTED'
          ? 'Request timeout. Please check your connection and try again.'
          : 'Network error. Please check your connection.',
        isNetworkError: true,
        code: error.code
      });
    }
    
    if (error.response.status >= 500) {
      return Promise.reject({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Server error. Please try again later.' },
        message: 'Server error. Please try again later.',
        isServerError: true,
        statusCode: error.response.status
      });
    }
    
    if (error.response?.data) {
      const normalizedMessage = getApiErrorMessage(error.response.data, 'Request failed');
      return Promise.reject({
        ...error.response.data,
        message: normalizedMessage,
        statusCode: error.response.status,
        response: error.response // Keep response for debugging
      });
    }
    
    return Promise.reject(error.response?.data || error);
  }
);

export const checkApiHealth = async () => {
  try {
    const healthUrl = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')}/api/health`
      : '/api/health';
    const response = await axios.get(healthUrl, { timeout: 8000 });
    return response.data;
  } catch (error) {
    throw new Error('API server is not responding');
  }
};

export const getCropRecommendationWithAutoLocation = async () => {
  try {
    const position = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
    
    const { latitude, longitude } = position.coords;
    
    const language = localStorage.getItem('language') || 'en';
    
    const response = await api.post('/crops/recommend', {
      latitude,
      longitude,
      language
    });
    
    return response.data;
    
  } catch (error) {
    logger.error('Auto location recommendation error', error);
    try {
      const fallbackLocation = getStoredLocation();
      const payload = {
        language: localStorage.getItem('language') || 'en'
      };
      if (fallbackLocation?.lat && fallbackLocation?.lng) {
        payload.latitude = fallbackLocation.lat;
        payload.longitude = fallbackLocation.lng;
      }
      const response = await api.post('/crops/recommend', payload);
      return {
        ...(response?.data || {}),
        fallback: true,
        message: fallbackLocation?.lat && fallbackLocation?.lng
          ? 'Using last known location for recommendations'
          : 'Location unavailable for recommendations'
      };
    } catch (fallbackError) {
      logger.error('Fallback recommendation failed', fallbackError);
      return {
        success: true,
        fallback: true,
        message: 'Location unavailable for recommendations',
        data: { recommendations: [] }
      };
    }
  }
};

export const getSchemeRecommendationForFarmer = async (farmerProfile) => {
  try {
    const response = await api.post('/government-schemes/recommend', {
      ...farmerProfile,
      language: localStorage.getItem('language') || 'en'
    });
    
    return response.data;
    
  } catch (error) {
    logger.error('Scheme recommendation error', error);
    
    return {
      success: true,
      data: [
        {
          id: 'pm-kisan-fallback',
          name: 'PM-KISAN Scheme',
          description: 'Direct income support for farmers',
          category: 'financial',
          benefits: '₹6,000 per year',
          relevanceScore: 90
        },
        {
          id: 'pmfby-fallback',
          name: 'PM Fasal Bima Yojana',
          description: 'Crop insurance scheme',
          category: 'insurance',
          benefits: 'Low premium crop insurance',
          relevanceScore: 85
        }
      ],
      fallback: true,
      message: 'Using fallback scheme recommendations'
    };
  }
};

export default api;

