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
  Chip,
  Stack
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { useLanguage } from '../contexts/LanguageContext';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [identifierType, setIdentifierType] = useState('auto'); // 'auto', 'email', 'phone', 'username'
  const { login, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { t, language, changeLanguage } = useLanguage();

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
        return t('auth.email');
      case 'phone':
        return t('auth.phone');
      case 'username':
        return t('auth.username', 'Username');
      default:
        return t('auth.identifier', 'Email / Phone / Username');
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
        return t('auth.identifierPlaceholder', 'Enter email, phone number, or username');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier || !password) {
      setError(t('auth.fillAllFields', 'Please fill in all fields'));
      return;
    }
    
    const result = await login(identifier, password);
    
    if (result && result.success) {
      enqueueSnackbar(t('auth.loginSuccess', 'Login successful!'), { variant: 'success' });
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 50);
    } else {
      const errorMsg = result?.error || t('auth.loginFailed', 'Login failed');
      setError(errorMsg);
      enqueueSnackbar(errorMsg, { variant: 'error' });
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant={language === 'en' ? 'contained' : 'outlined'}
              onClick={() => changeLanguage('en')}
            >
              English
            </Button>
            <Button
              size="small"
              variant={language === 'ta' ? 'contained' : 'outlined'}
              onClick={() => changeLanguage('ta')}
            >
              தமிழ்
            </Button>
          </Stack>
        </Box>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          🌾 AgriSmart AI
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom align="center" sx={{ mb: 3 }}>
          {t('auth.login')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={`📧 ${t('auth.email')}`} 
              size="small" 
              color={identifierType === 'email' ? 'primary' : 'default'}
              variant={identifierType === 'email' ? 'filled' : 'outlined'}
            />
            <Chip 
              label={`📱 ${t('auth.phone')}`} 
              size="small" 
              color={identifierType === 'phone' ? 'primary' : 'default'}
              variant={identifierType === 'phone' ? 'filled' : 'outlined'}
            />
            <Chip 
              label={`👤 ${t('auth.username', 'Username')}`} 
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
                ? t('auth.identifierHint', 'Enter your email, phone number, or username')
                : identifierType === 'email'
                ? t('auth.loginWithEmail', 'Login with your email address')
                : identifierType === 'phone'
                ? t('auth.loginWithPhone', 'Login with your phone number')
                : t('auth.loginWithUsername', 'Login with your username')
            }
          />
          <TextField
            fullWidth
            label={t('auth.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            autoComplete="current-password"
          />
          <Box sx={{ textAlign: 'right', mt: 1 }}>
            <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
              <Typography variant="body2" color="primary">
                {t('auth.forgotPassword')}
              </Typography>
            </Link>
          </Box>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : t('auth.login')}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <Typography variant="body2" color="primary">
              {t('auth.dontHaveAccount')} {t('auth.registerHere')}
            </Typography>
          </Link>
        </Box>
      </Paper>
    </Container>
  );
}

