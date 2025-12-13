import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import logger from '../services/logger';

const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null || !context._isProvider) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { useAuth };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
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

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
        setFarmer(response.data.farmer || null);
        setError(null);
      } else {
        localStorage.removeItem('token');
        setUser(null);
        setFarmer(null);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
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
      const normalizedPassword = password?.trim() || '';
      
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
      setFarmer(farmer);
      
      setLoading(false);
      
      return { success: true, user };
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Login failed';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/auth/register', userData);
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setUser(user);
        
        return { success: true, user };
      } else {
        const errorMessage = response.data.error || 'Registration failed';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      let errorMessage = 'Registration failed. Please check your information and try again.';
      
      logger.error('Registration error', err, { 
        response: err.response, 
        responseData: err.response?.data 
      });
      
      if (err.response?.data) {
        errorMessage = err.response.data.error || err.response.data.message || errorMessage;
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
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    
    setUser(null);
    setFarmer(null);
    setError(null);
    
    window.location.href = '/login';
  };

  const updateProfile = async (profileData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.put('/auth/update-profile', profileData);
      
      if (response.data.success) {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      } else {
        setError(response.data.error);
        return { success: false, error: response.data.error };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Update failed';
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
    isAuthenticated,
    _isProvider: true // Flag to identify if we're inside a provider
  }), [user, farmer, loading, error, isAuthenticated]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

