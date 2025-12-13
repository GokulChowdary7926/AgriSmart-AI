import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  const hasToken = !!localStorage.getItem('token');

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setCheckingAuth(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading || checkingAuth) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (hasToken) {
    return children;
  }

  if (isAuthenticated || user) {
    return children;
  }

  return <Navigate to="/login" replace />;
}

