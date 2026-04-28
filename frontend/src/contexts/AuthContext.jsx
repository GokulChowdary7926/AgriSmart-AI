import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getApiErrorMessage } from '../services/api';
import logger from '../services/logger';

const AuthContext = createContext(null);
let hasLoggedMissingProviderWarning = false;
const USER_STORAGE_KEY = 'user';

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

const writeStoredUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (_) {
    // Non-blocking storage failure.
  }
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    if (!hasLoggedMissingProviderWarning) {
      hasLoggedMissingProviderWarning = true;
      logger.warn('useAuth accessed without AuthProvider; using safe fallback state');
    }
    const fallbackUser = readStoredUser();
    return {
      user: fallbackUser,
      farmer: null,
      loading: false,
      error: null,
      login: async () => ({ success: false, error: 'Authentication context unavailable' }),
      register: async () => ({ success: false, error: 'Authentication context unavailable' }),
      logout: () => {},
      updateProfile: async () => ({ success: false, error: 'Authentication context unavailable' }),
      isAuthenticated: Boolean(fallbackUser)
    };
  }
  return context;
};

export { useAuth };

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => readStoredUser());
  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem('token');
      writeStoredUser(null);
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setFarmer(null);
      setError('Your session expired. Please login again.');
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
        writeStoredUser(response.data.user);
        setFarmer(response.data.farmer || null);
        setError(null);
      } else {
        localStorage.removeItem('token');
        writeStoredUser(null);
        setUser(null);
        setFarmer(null);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        writeStoredUser(null);
        setUser(null);
        setFarmer(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const trimmedIdentifier = identifier?.trim() || '';
      const normalizedPassword = typeof password === 'string' ? password : '';
      
      if (!trimmedIdentifier || !normalizedPassword) {
        throw new Error('Email/Phone/User ID and password are required');
      }
      
      const response = await api.post('/auth/login', { 
        identifier: trimmedIdentifier,
        password: normalizedPassword 
      });
      
      const token = response.data.token || response.data.access_token;
      const user = response.data.user || response.data;
      const farmer = response.data.farmer || null;
      
      if (!token || !user) {
        throw new Error('Invalid login response');
      }
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      writeStoredUser(user);
      setFarmer(farmer);
      
      setLoading(false);
      
      return { success: true, user };
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, 'Login failed');
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);

    const mapRegistrationFieldErrors = (message) => {
      const normalizedMessage = String(message || '').toLowerCase();
      const fieldErrors = {};

      if (normalizedMessage.includes('email')) {
        fieldErrors.email = message;
      }
      if (normalizedMessage.includes('phone')) {
        fieldErrors.phone = message;
      }
      if (normalizedMessage.includes('username')) {
        fieldErrors.username = message;
      }
      if (normalizedMessage.includes('password')) {
        fieldErrors.password = message;
      }

      return fieldErrors;
    };
    
    try {
      const response = await api.post('/auth/register', userData);
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setUser(user);
        writeStoredUser(user);
        
        return { success: true, user };
      } else {
        const errorMessage = getApiErrorMessage(response.data, 'Registration failed');
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
          fieldErrors: mapRegistrationFieldErrors(errorMessage)
        };
      }
    } catch (err) {
      let errorMessage = 'Registration failed. Please check your information and try again.';
      
      logger.error('Registration error', err, { 
        response: err.response, 
        responseData: err.response?.data 
      });
      
      if (err.response?.data) {
        errorMessage = getApiErrorMessage(err, errorMessage);
      } else if (err.error) {
        errorMessage = err.error || errorMessage;
      } else if (err.message) {
        if (err.message.includes('Network Error') || err.code === 'ECONNREFUSED') {
          errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
        fieldErrors: mapRegistrationFieldErrors(errorMessage)
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    writeStoredUser(null);
    delete api.defaults.headers.common['Authorization'];
    
    setUser(null);
    setFarmer(null);
    setError(null);
    navigate('/login', { replace: true });
  };

  const updateProfile = async (profileData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.put('/auth/update-profile', profileData);
      
      if (response.data.success) {
        setUser(response.data.user);
        writeStoredUser(response.data.user);
        return { success: true, user: response.data.user };
      } else {
        const errorMessage = getApiErrorMessage(response.data, 'Update failed');
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, 'Update failed');
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const isAuthenticated = !!user && !loading;

  const value = useMemo(() => ({
    user,
    farmer,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated
  }), [user, farmer, loading, error, isAuthenticated]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

