import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { useLanguage } from '../contexts/LanguageContext';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useLanguage();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (formData.password !== formData.confirmPassword) {
      const message = t('auth.passwordsDoNotMatch', 'Passwords do not match');
      setError(message);
      setFieldErrors({ confirmPassword: message });
      return;
    }

    if (formData.password.length < 6) {
      const message = t('auth.passwordMinLength', 'Password must be at least 6 characters');
      setError(message);
      setFieldErrors({ password: message });
      return;
    }

    if (!formData.username || formData.username.trim().length < 3) {
      const message = t('auth.usernameMinLength', 'Username must be at least 3 characters');
      setError(message);
      setFieldErrors({ username: message });
      return;
    }

    if (!/^[a-z0-9_]+$/.test(formData.username.toLowerCase())) {
      const message = t('auth.usernamePattern', 'Username can only contain lowercase letters, numbers, and underscores');
      setError(message);
      setFieldErrors({ username: message });
      return;
    }

    const registrationData = { ...formData };
    delete registrationData.confirmPassword;
    registrationData.username = registrationData.username.toLowerCase().trim();
    const result = await register(registrationData);
    
    if (result && result.success) {
      const successMessage = t('auth.registerSuccess', 'Registration successful!');
      enqueueSnackbar(successMessage, {
        variant: 'success',
        preventDuplicate: true,
        key: `register-success:${successMessage}`
      });
      navigate('/login', { replace: true });
    } else {
      const errorMsg = result?.error || t('auth.registerFailed', 'Registration failed');
      setError(errorMsg);
      if (result?.fieldErrors && typeof result.fieldErrors === 'object') {
        setFieldErrors(result.fieldErrors);
      }
      enqueueSnackbar(errorMsg, {
        variant: 'error',
        preventDuplicate: true,
        key: `register-error:${errorMsg}`
      });
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          {t('auth.register')}
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          {t('auth.createAccountHint', 'Create your account to get started')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label={t('auth.fullName', 'Full Name')}
            name="name"
            value={formData.name}
            onChange={handleChange}
            margin="normal"
            required
            autoComplete="name"
          />
          <TextField
            fullWidth
            label={t('auth.username', 'Username')}
            name="username"
            value={formData.username}
            onChange={handleChange}
            margin="normal"
            required
            autoComplete="username"
            error={Boolean(fieldErrors.username)}
            helperText={
              fieldErrors.username ||
              t('auth.usernameHelper', '3-30 characters, lowercase letters, numbers, and underscores only')
            }
            inputProps={{ 
              pattern: '[a-z0-9_]+',
              style: { textTransform: 'lowercase' }
            }}
          />
          <TextField
            fullWidth
            label={t('auth.email')}
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
            required
            autoComplete="email"
            error={Boolean(fieldErrors.email)}
            helperText={fieldErrors.email || ''}
          />
          <TextField
            fullWidth
            label={t('auth.phone')}
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            margin="normal"
            required
            autoComplete="tel"
            error={Boolean(fieldErrors.phone)}
            helperText={fieldErrors.phone || ''}
          />
          <TextField
            fullWidth
            label={t('auth.password')}
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            margin="normal"
            required
            autoComplete="new-password"
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password || ''}
          />
          <TextField
            fullWidth
            label={t('auth.confirmPassword')}
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            margin="normal"
            required
            autoComplete="new-password"
            error={Boolean(fieldErrors.confirmPassword)}
            helperText={fieldErrors.confirmPassword || ''}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : t('auth.register')}
          </Button>
          <Box textAlign="center">
            <Typography variant="body2">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link to="/login" style={{ textDecoration: 'none' }}>
                {t('auth.loginHere')}
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}




















