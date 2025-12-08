import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Thermostat as TempIcon,
  Opacity as HumidityIcon,
  Air as WindIcon,
  Cloud as CloudIcon,
  WbSunny as SunIcon,
  WaterDrop as RainIcon,
  MyLocation as MyLocationIcon
} from '@mui/icons-material';
import api from '../services/api';
import { useSnackbar } from 'notistack';

export default function Weather() {
  const [location, setLocation] = useState(null);
  const [city, setCity] = useState('');
  const [locationLoading, setLocationLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  // Auto-detect user location on mount
  useEffect(() => {
    const detectLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude.toString(),
              lng: position.coords.longitude.toString()
            });
            setLocationLoading(false);
            enqueueSnackbar('Location detected successfully', { variant: 'success' });
          },
          (error) => {
            console.error('Geolocation error:', error);
            // Fallback to default location (Delhi)
            setLocation({ lat: '28.6139', lng: '77.2090' });
            setLocationLoading(false);
            enqueueSnackbar('Using default location. Please enable location access for accurate weather.', { variant: 'info' });
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        // Fallback if geolocation not supported
        setLocation({ lat: '28.6139', lng: '77.2090' });
        setLocationLoading(false);
      }
    };

    detectLocation();
  }, [enqueueSnackbar]);

  const { data: weather, isLoading, refetch } = useQuery({
    queryKey: ['weather', location?.lat, location?.lng],
    queryFn: async () => {
      const params = city ? { city } : { lat: location.lat, lng: location.lng };
      const response = await api.get('/weather/current', { params });
      return response.data.data;
    },
    enabled: !!location?.lat && !!location?.lng && !locationLoading,
    refetchInterval: 300000 // Refetch every 5 minutes
  });

  const { data: forecast } = useQuery({
    queryKey: ['weather', 'forecast', location?.lat, location?.lng],
    queryFn: async () => {
      const response = await api.get('/weather/forecast', {
        params: { lat: location.lat, lng: location.lng, days: 7 }
      });
      return response.data.data || [];
    },
    enabled: !!location?.lat && !!location?.lng && !locationLoading
  });

  const handleRefreshLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude.toString(),
            lng: position.coords.longitude.toString()
          });
          setLocationLoading(false);
          enqueueSnackbar('Location refreshed', { variant: 'success' });
        },
        (error) => {
          setLocationLoading(false);
          enqueueSnackbar('Failed to refresh location', { variant: 'error' });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  };

  const handleSearch = () => {
    if (city) {
      refetch();
    }
  };

  const getWeatherIcon = (condition) => {
    const conditionLower = condition?.toLowerCase() || '';
    if (conditionLower.includes('rain')) return <RainIcon />;
    if (conditionLower.includes('cloud')) return <CloudIcon />;
    return <SunIcon />;
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Weather Information
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="City Name (Optional)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter city name to search"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Latitude"
              type="number"
              value={location?.lat || ''}
              onChange={(e) => setLocation({ ...location, lat: e.target.value })}
              disabled={locationLoading}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Longitude"
              type="number"
              value={location?.lng || ''}
              onChange={(e) => setLocation({ ...location, lng: e.target.value })}
              disabled={locationLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button 
              variant="contained" 
              onClick={handleSearch}
              disabled={locationLoading || (!city && (!location?.lat || !location?.lng))}
            >
              Get Weather
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button 
              variant="outlined" 
              startIcon={<MyLocationIcon />}
              onClick={handleRefreshLocation}
              disabled={locationLoading}
            >
              {locationLoading ? 'Detecting...' : 'Refresh My Location'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {locationLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2, alignSelf: 'center' }}>
            Detecting your location...
          </Typography>
        </Box>
      ) : isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : weather ? (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h5">
                      {weather.location?.city || 'Current Location'}
                    </Typography>
                    <Box sx={{ fontSize: 60 }}>
                      {getWeatherIcon(weather.conditions?.main)}
                    </Box>
                  </Box>
                  <Typography variant="h2" component="div" gutterBottom>
                    {weather.temperature?.current?.toFixed(1)}°C
                  </Typography>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    {weather.conditions?.description}
                  </Typography>
                  <Box display="flex" gap={2} mt={2}>
                    <Chip
                      icon={<TempIcon />}
                      label={`High: ${weather.temperature?.max}°C`}
                      variant="outlined"
                    />
                    <Chip
                      icon={<TempIcon />}
                      label={`Low: ${weather.temperature?.min}°C`}
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <HumidityIcon color="primary" />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Humidity
                          </Typography>
                          <Typography variant="h6">
                            {weather.humidity}%
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <WindIcon color="primary" />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Wind Speed
                          </Typography>
                          <Typography variant="h6">
                            {weather.wind?.speed} m/s
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <CloudIcon color="primary" />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Cloud Cover
                          </Typography>
                          <Typography variant="h6">
                            {weather.cloudCover}%
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          {forecast && forecast.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                7-Day Forecast
              </Typography>
              <Grid container spacing={2}>
                {forecast.map((day, index) => (
                  <Grid item xs={6} sm={4} md={1.7} key={index}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </Typography>
                        <Box sx={{ fontSize: 40, my: 1 }}>
                          {getWeatherIcon(day.conditions)}
                        </Box>
                        <Typography variant="h6">
                          {day.temperature?.day?.toFixed(0)}°C
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {day.precipitation}% rain
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
        </>
      ) : (
        <Alert severity="info">
          Enter a location to view weather information
        </Alert>
      )}
    </Container>
  );
}
