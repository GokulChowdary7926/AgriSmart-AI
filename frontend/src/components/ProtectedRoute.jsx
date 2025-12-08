import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Check if we have a token in localStorage
  const hasToken = !!localStorage.getItem('token');

  // Give auth context time to initialize
  useEffect(() => {
    if (!loading) {
      // Small delay to ensure state is settled
      const timer = setTimeout(() => {
        setCheckingAuth(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Debug logging
  useEffect(() => {
    console.log('ProtectedRoute check:', {
      hasToken,
      isAuthenticated,
      user: !!user,
      loading,
      checkingAuth
    });
  }, [hasToken, isAuthenticated, user, loading, checkingAuth]);

  // Show loading while checking authentication
  if (loading || checkingAuth) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // If we have a token, allow access (even if user data isn't loaded yet)
  // This prevents redirect loops after login
  if (hasToken) {
    console.log('ProtectedRoute: Allowing access - token exists');
    return children;
  }

  // If authenticated (user exists), allow access
  if (isAuthenticated || user) {
    console.log('ProtectedRoute: Allowing access - authenticated');
    return children;
  }

  // No token and not authenticated - redirect to login
  console.log('ProtectedRoute: Redirecting to login - no token or user');
  return <Navigate to="/login" replace />;
}

