import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [identifierType, setIdentifierType] = useState('auto'); // 'auto', 'email', 'phone', 'username'
  const { login, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && isAuthenticated && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (!identifier) {
      setIdentifierType('auto');
      return;
    }

    const trimmed = identifier.trim();
    
    if (trimmed.includes('@')) {
      setIdentifierType('email');
    }
    else if (/^[\d\s+\-]+$/.test(trimmed) && trimmed.replace(/[\s+\-]/g, '').length >= 10) {
      setIdentifierType('phone');
    }
    else {
      setIdentifierType('username');
    }
  }, [identifier]);

  const getIdentifierLabel = () => {
    switch (identifierType) {
      case 'email':
        return 'Email';
      case 'phone':
        return 'Phone Number';
      case 'username':
        return 'Username';
      default:
        return 'Email / Phone / Username';
    }
  };

  const getIdentifierPlaceholder = () => {
    switch (identifierType) {
      case 'email':
        return 'example@email.com';
      case 'phone':
        return '+91 9876543210';
      case 'username':
        return 'myusername';
      default:
        return 'Enter email, phone number, or username';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    const result = await login(identifier, password);
    
    if (result && result.success) {
      enqueueSnackbar('Login successful!', { variant: 'success' });
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 50);
    } else {
      const errorMsg = result?.error || 'Login failed';
      setError(errorMsg);
      enqueueSnackbar(errorMsg, { variant: 'error' });
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          🌾 AgriSmart AI
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom align="center" sx={{ mb: 3 }}>
          Login
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label="📧 Email" 
              size="small" 
              color={identifierType === 'email' ? 'primary' : 'default'}
              variant={identifierType === 'email' ? 'filled' : 'outlined'}
            />
            <Chip 
              label="📱 Phone" 
              size="small" 
              color={identifierType === 'phone' ? 'primary' : 'default'}
              variant={identifierType === 'phone' ? 'filled' : 'outlined'}
            />
            <Chip 
              label="👤 Username" 
              size="small" 
              color={identifierType === 'username' ? 'primary' : 'default'}
              variant={identifierType === 'username' ? 'filled' : 'outlined'}
            />
          </Box>
          <TextField
            fullWidth
            label={getIdentifierLabel()}
            type={identifierType === 'email' ? 'email' : identifierType === 'phone' ? 'tel' : 'text'}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            margin="normal"
            required
            placeholder={getIdentifierPlaceholder()}
            autoComplete="username"
            helperText={
              identifierType === 'auto' 
                ? 'Enter your email, phone number, or username' 
                : identifierType === 'email'
                ? 'Login with your email address'
                : identifierType === 'phone'
                ? 'Login with your phone number'
                : 'Login with your username'
            }
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            autoComplete="current-password"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Login'}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <Typography variant="body2" color="primary">
              Don't have an account? Register here
            </Typography>
          </Link>
        </Box>
      </Paper>
    </Container>
  );
}

