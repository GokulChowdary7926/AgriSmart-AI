import axios from 'axios';

// Create axios instance with default config
// Use relative URL to leverage Vite proxy, or full URL if VITE_API_URL is set
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add to headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (process.env.NODE_ENV === 'development') {
        // API Request logged
          method: config.method?.toUpperCase(),
          url: config.url,
          hasToken: !!token
        });
      }
    }
    
    // Add language header if available
    const language = localStorage.getItem('language') || 'en';
    config.headers['Accept-Language'] = language;
    
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      // API Response logged
        status: response.status,
        url: response.config.url
      });
    }
    // Return successful response
    return response;
  },
  (error) => {
    const originalRequest = error.config;
    
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ API Error:', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
        response: error.response?.data
      });
    }
    
    // Handle 401 Unauthorized errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Unauthorized - Clearing token
      localStorage.removeItem('token');
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('🌐 Network error:', error.message);
      return Promise.reject({
        success: false,
        error: 'Network error. Please check your connection.',
        isNetworkError: true
      });
    }
    
    // Handle server errors
    if (error.response.status >= 500) {
      console.error('🔥 Server error:', error.response.data);
      return Promise.reject({
        success: false,
        error: 'Server error. Please try again later.',
        isServerError: true
      });
    }
    
    // For 4xx errors, preserve the error structure from backend
    if (error.response?.data) {
      // Backend returns {success: false, error: "message"} for 4xx errors
      return Promise.reject({
        ...error.response.data,
        response: error.response // Keep response for debugging
      });
    }
    
    // Return error response
    return Promise.reject(error.response?.data || error);
  }
);

// API health check
export const checkApiHealth = async () => {
  try {
    const healthUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '') 
      : '/health'; // Use proxy for health check
    const response = await axios.get(healthUrl);
    return response.data;
  } catch (error) {
    throw new Error('API server is not responding');
  }
};

// Export default api instance
// Helper function for crop recommendation with auto-detection
export const getCropRecommendationWithAutoLocation = async () => {
  try {
    // Get current location
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
    
    // Get language
    const language = localStorage.getItem('language') || 'en';
    
    // Call recommendation API
    const response = await api.post('/crops/recommend', {
      latitude,
      longitude,
      language
    });
    
    return response.data;
    
  } catch (error) {
    console.error('Auto location recommendation error:', error);
    
    // Fallback to default location (New Delhi)
    const response = await api.post('/crops/recommend', {
      latitude: 28.6139,
      longitude: 77.2090,
      language: localStorage.getItem('language') || 'en'
    });
    
    return {
      ...response.data,
      fallback: true,
      message: 'Using default location for recommendations'
    };
  }
};

// Helper function for scheme recommendation
export const getSchemeRecommendationForFarmer = async (farmerProfile) => {
  try {
    const response = await api.post('/government-schemes/recommend', {
      ...farmerProfile,
      language: localStorage.getItem('language') || 'en'
    });
    
    return response.data;
    
  } catch (error) {
    console.error('Scheme recommendation error:', error);
    
    // Return fallback schemes
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

