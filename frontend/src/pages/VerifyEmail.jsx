import React, { useEffect, useState } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Link
} from '@mui/material';
import { useSnackbar } from 'notistack';
import api, { getApiErrorMessage } from '../services/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    const verify = async () => {
      try {
        const response = await api.post('/auth/verify-email', { token });
        if (response.data?.success) {
          setStatus('success');
          setMessage(response.data.message || 'Email verified successfully.');
          enqueueSnackbar('Email verified successfully. You can now log in.', { variant: 'success' });
        } else {
          setStatus('error');
          setMessage(getApiErrorMessage(response.data, 'Email verification failed.'));
        }
      } catch (err) {
        setStatus('error');
        setMessage(getApiErrorMessage(err, 'Email verification failed. The link may have expired.'));
      }
    };

    verify();
  }, [searchParams, enqueueSnackbar]);

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography component="h1" variant="h5" gutterBottom>
            Verify Email
          </Typography>

          {status === 'verifying' && (
            <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" mt={2}>
                Verifying your email, please wait...
              </Typography>
            </Box>
          )}

          {status === 'success' && (
            <Box mt={2} width="100%">
              <Alert severity="success" sx={{ mb: 2 }}>
                {message}
              </Alert>
              <Button
                fullWidth
                variant="contained"
                component={RouterLink}
                to="/login"
                sx={{ mt: 1 }}
              >
                Go to Login
              </Button>
            </Box>
          )}

          {status === 'error' && (
            <Box mt={2} width="100%">
              <Alert severity="error" sx={{ mb: 2 }}>
                {message}
              </Alert>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                If the link has expired, please log in and request a new verification email from your profile or settings.
              </Typography>
              <Button
                fullWidth
                variant="contained"
                component={RouterLink}
                to="/login"
                sx={{ mt: 1 }}
              >
                Go to Login
              </Button>
              <Box mt={2}>
                <Link component={RouterLink} to="/register" variant="body2">
                  Create a new account
                </Link>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

