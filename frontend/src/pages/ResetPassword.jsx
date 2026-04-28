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
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import api, { getApiErrorMessage } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!password || !confirmPassword) {
      setError(t('auth.fillAllFields', 'Please fill in all fields'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch', 'Passwords do not match'));
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/auth/reset-password', { token, password: password.trim() });
      const message = t('auth.passwordResetSuccess', 'Password reset successful. You can now log in with your new password.');
      setSuccessMessage(message);
      enqueueSnackbar(message, { variant: 'success' });
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        t('auth.passwordResetFailed', 'Unable to reset password. The link may be invalid or expired.')
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
          {t('auth.resetPassword', 'Reset Password')}
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
            label={t('auth.newPassword', 'New password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label={t('auth.confirmNewPassword', 'Confirm new password')}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            required
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : t('auth.resetPasswordAction', 'Reset password')}
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

