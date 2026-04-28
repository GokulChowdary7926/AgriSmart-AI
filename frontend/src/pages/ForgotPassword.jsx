import React, { useState } from 'react';
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
import { Link } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import api, { getApiErrorMessage } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email) {
      setError(t('auth.enterEmail', 'Please enter your email address'));
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/auth/forgot-password', { email: email.trim() });
      const message = t('auth.resetLinkSent', 'If this email is registered, a password reset link has been sent.');
      setSuccessMessage(message);
      enqueueSnackbar(message, { variant: 'success' });
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        t('auth.resetRequestFailed', 'Unable to process password reset request. Please try again later.')
      );
      setError(message);
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          🌾 AgriSmart AI
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom align="center" sx={{ mb: 3 }}>
          {t('auth.forgotPassword')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label={t('auth.emailAddress', 'Email address')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            placeholder={t('auth.emailExample', 'example@email.com')}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('auth.forgotPasswordHint', 'Enter the email associated with your account. If it exists, you will receive a link to reset your password.')}
          </Typography>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : t('auth.sendResetLink', 'Send reset link')}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <Typography variant="body2" color="primary">
              {t('auth.backToLogin', 'Back to login')}
            </Typography>
          </Link>
        </Box>
      </Paper>
    </Container>
  );
}

