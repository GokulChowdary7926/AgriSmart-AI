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
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // Redirect if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && isAuthenticated && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    const result = await login(email, password);
    
    if (result && result.success) {
      enqueueSnackbar('Login successful!', { variant: 'success' });
      // Small delay to ensure token is stored
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
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            autoComplete="email"
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

