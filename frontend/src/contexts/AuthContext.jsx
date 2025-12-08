import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

// Export hook separately to fix Fast Refresh
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
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

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
        setFarmer(response.data.farmer || null);
        setError(null);
      } else {
        // If response doesn't have user, clear token
        localStorage.removeItem('token');
        setUser(null);
        setFarmer(null);
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      // Only logout if it's an auth error (401/403)
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        setUser(null);
        setFarmer(null);
      }
      // For other errors, keep the token but don't set user
      // This allows the app to work even if /auth/me fails
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      // Trim and normalize inputs
      const normalizedEmail = email?.trim().toLowerCase() || '';
      const normalizedPassword = password?.trim() || '';
      
      console.log('🔐 Attempting login...', {
        email: normalizedEmail,
        passwordLength: normalizedPassword.length
      });
      
      if (!normalizedEmail || !normalizedPassword) {
        throw new Error('Email and password are required');
      }
      
      const response = await api.post('/auth/login', { 
        email: normalizedEmail, 
        password: normalizedPassword 
      });
      console.log('✅ Login response:', response.data);
      
      // Handle both success: true and direct token/user response
      const token = response.data.token || response.data.access_token;
      const user = response.data.user || response.data;
      const farmer = response.data.farmer || null;
      
      console.log('Extracted token:', token ? 'exists' : 'missing');
      console.log('Extracted user:', user ? 'exists' : 'missing');
      
      if (!token || !user) {
        console.error('Invalid login response - missing token or user');
        throw new Error('Invalid login response');
      }
      
      // Store token first - this is synchronous and immediate
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('Token stored in localStorage');
      
      // Update state immediately
      setUser(user);
      setFarmer(farmer);
      console.log('User state updated');
      
      // Set loading to false
      setLoading(false);
      
      // Return success
      return { success: true, user };
    } catch (err) {
      console.error('Login error:', err);
      console.error('Error response:', err.response?.data);
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
        
        // Store token
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Update state
        setUser(user);
        
        return { success: true, user };
      } else {
        const errorMessage = response.data.error || 'Registration failed';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      // Extract error message from response
      let errorMessage = 'Registration failed. Please check your information and try again.';
      
      console.error('Registration error:', err);
      console.error('Error response:', err.response);
      console.error('Error response data:', err.response?.data);
      
      if (err.response?.data) {
        // Backend returned an error
        errorMessage = err.response.data.error || err.response.data.message || errorMessage;
      } else if (err.error) {
        // Error from axios interceptor
        errorMessage = err.error || errorMessage;
      } else if (err.message) {
        // Network or other error
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
    // Clear token
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    
    // Clear state
    setUser(null);
    setFarmer(null);
    setError(null);
    
    // Redirect to login - use window.location to avoid hook dependency
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

  // Calculate isAuthenticated - user exists and not loading
  const isAuthenticated = !!user && !loading;

  const value = {
    user,
    farmer,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

