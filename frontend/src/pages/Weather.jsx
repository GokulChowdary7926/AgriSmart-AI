import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
  useTheme,
  Tabs,
  Tab,
  Container,
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
  AlertTitle,
  Button,
  Collapse
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  LocationOn as LocationIcon,
  WaterDrop as RainIcon,
  Air as WindIcon,
  Opacity as HumidityIcon,
  Compress as PressureIcon,
  WbSunny as SunIcon,
  NightsStay as MoonIcon,
  Cloud as CloudIcon,
  Thunderstorm as StormIcon,
  AcUnit as SnowIcon,
  Notifications as AlertIcon,
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  Agriculture as AgricultureIcon
} from '@mui/icons-material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import logger from '../services/logger';
import { useSnackbar } from 'notistack';
import { useLanguage } from '../contexts/LanguageContext';
import { getBestAvailableLocation } from '../services/realtimeLocation';

export default function Weather() {
  const WEATHER_SETTINGS_STORAGE_KEY = 'weather:ui-settings';
  const { t, language } = useLanguage();
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState('Current Location');
  const [locationsMenuAnchor, setLocationsMenuAnchor] = useState(null);
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState(null);
  const [expandedAlerts, setExpandedAlerts] = useState({});
  const [temperatureUnit, setTemperatureUnit] = useState('c');
  const [windSpeedUnit, setWindSpeedUnit] = useState('kmh');
  const [timeFormat, setTimeFormat] = useState('12h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { enqueueSnackbar } = useSnackbar();
  useTheme();
  const locale = language === 'ta' ? 'ta-IN' : 'en-IN';

  const savedLocations = [
    { id: 1, name: t('weather.currentLocation', 'Current Location'), lat: null, lng: null },
    { id: 2, name: 'Mumbai, Maharashtra', lat: 19.0760, lng: 72.8777 },
    { id: 3, name: 'Delhi', lat: 28.6139, lng: 77.2090 },
    { id: 4, name: 'Bengaluru, Karnataka', lat: 12.9716, lng: 77.5946 },
    { id: 5, name: 'Punjab Farmlands', lat: 31.1471, lng: 75.3412 }
  ];

  useEffect(() => {
    const detectLocation = async () => {
      try {
        const resolved = await getBestAvailableLocation(api, language);
        if (resolved?.lat && resolved?.lng) {
          setLocation({ lat: String(resolved.lat), lng: String(resolved.lng) });
          if (resolved.city || resolved.state) {
            setSelectedLocation([resolved.city, resolved.state].filter(Boolean).join(', '));
          }
        } else {
          enqueueSnackbar(t('weather.locationUnavailable', 'Live location unavailable. Enable location access for local weather.'), { variant: 'warning' });
        }
      } catch (error) {
        logger.error('Geolocation error', error);
      } finally {
        setLocationLoading(false);
      }
    };

    detectLocation();
  }, [enqueueSnackbar, language, t]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WEATHER_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.temperatureUnit === 'c' || parsed?.temperatureUnit === 'f') setTemperatureUnit(parsed.temperatureUnit);
      if (parsed?.windSpeedUnit === 'kmh' || parsed?.windSpeedUnit === 'ms') setWindSpeedUnit(parsed.windSpeedUnit);
      if (parsed?.timeFormat === '12h' || parsed?.timeFormat === '24h') setTimeFormat(parsed.timeFormat);
      if (typeof parsed?.autoRefresh === 'boolean') setAutoRefresh(parsed.autoRefresh);
    } catch (_) {
      // Ignore invalid persisted settings.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        WEATHER_SETTINGS_STORAGE_KEY,
        JSON.stringify({
          temperatureUnit,
          windSpeedUnit,
          timeFormat,
          autoRefresh
        })
      );
    } catch (_) {
      // Ignore storage errors.
    }
  }, [temperatureUnit, windSpeedUnit, timeFormat, autoRefresh]);

  const { data: weather, isLoading, refetch } = useQuery({
    queryKey: ['weather', location?.lat, location?.lng],
    queryFn: async () => {
      const response = await api.get('/weather/current', {
        params: { lat: location.lat, lng: location.lng }
      });
      return response.data.data;
    },
    enabled: !!location?.lat && !!location?.lng && !locationLoading,
    refetchInterval: autoRefresh ? 300000 : false
  });

  const { data: forecast } = useQuery({
    queryKey: ['weather', 'forecast', location?.lat, location?.lng],
    queryFn: async () => {
      try {
        const response = await api.get('/weather/forecast', {
          params: { lat: location.lat, lng: location.lng, days: 10 }
        });
        const data = response.data.data;
        if (Array.isArray(data)) {
          return data;
        }
        if (data && Array.isArray(data.forecast)) {
          return data.forecast;
        }
        return [];
      } catch (error) {
        logger.error('Error fetching forecast', error);
        return [];
      }
    },
    enabled: !!location?.lat && !!location?.lng && !locationLoading
  });

  const { data: hourlyForecast } = useQuery({
    queryKey: ['weather', 'hourly', location?.lat, location?.lng],
    queryFn: async () => {
      try {
        const response = await api.get('/weather/hourly', {
          params: { lat: location.lat, lng: location.lng, hours: 24 }
        });
        return response.data.data || [];
      } catch {
        return [];
      }
    },
    enabled: !!location?.lat && !!location?.lng && !locationLoading && tabValue === 0
  });

  const { data: weatherAlerts } = useQuery({
    queryKey: ['weather', 'alerts', location?.lat, location?.lng],
    queryFn: async () => {
      try {
        const response = await api.get('/weather/alerts', {
          params: { lat: location.lat, lng: location.lng }
        });
        const alerts = response.data.data?.alerts || response.data.data || [];
        return alerts.filter(alert => {
          const title = (alert.title || alert.message || '').toLowerCase();
          const type = (alert.type || '').toLowerCase();
          const source = (alert.source || '').toLowerCase();
          
          const weatherKeywords = ['rain', 'rainfall', 'storm', 'thunder', 'wind', 'heat', 'cold', 'frost', 'temperature', 'weather', 'meteorological', 'imd', 'climate'];
          
          return type === 'weather' || 
                 weatherKeywords.some(keyword => title.includes(keyword) || source.includes(keyword)) ||
                 alert.severity;
        });
      } catch {
        return getMockAlerts();
      }
    },
    enabled: !!location?.lat && !!location?.lng && !locationLoading
  });

  const getMockAlerts = () => {
    return [
      {
        id: 1,
        title: 'Heavy Rainfall Warning',
        description: 'Heavy rainfall expected in the next 24 hours. Accumulation of 50-100mm possible.',
        severity: 'severe',
        start: new Date(),
        end: new Date(Date.now() + 24 * 60 * 60 * 1000),
        areas: ['Maharashtra', 'Goa'],
        source: 'AgriSmart AI',
        agricultural_impact: {
          affected_crops: ['Rice', 'Sugarcane'],
          recommended_actions: ['Ensure drainage', 'Delay harvesting', 'Protect stored grains'],
          risk_level: 'high'
        }
      },
      {
        id: 2,
        title: 'Heatwave Advisory',
        description: 'Maximum temperatures likely to rise by 4-6°C above normal.',
        severity: 'moderate',
        start: new Date(),
        end: new Date(Date.now() + 48 * 60 * 60 * 1000),
        areas: ['North India'],
        source: 'AgriSmart AI',
        agricultural_impact: {
          affected_crops: ['Wheat', 'Vegetables'],
          recommended_actions: ['Increase irrigation frequency', 'Use mulch', 'Provide shade'],
          risk_level: 'medium'
        }
      }
    ];
  };

  const handleRefresh = async () => {
    setLocationLoading(true);
    try {
      const resolved = await getBestAvailableLocation(api, language);
      if (resolved?.lat && resolved?.lng) {
        setLocation({ lat: String(resolved.lat), lng: String(resolved.lng) });
        if (resolved.city || resolved.state) {
          setSelectedLocation([resolved.city, resolved.state].filter(Boolean).join(', '));
        }
        refetch();
        enqueueSnackbar(t('weather.locationRefreshed', 'Location refreshed'), { variant: 'success' });
      } else {
        enqueueSnackbar(t('weather.failedRefreshLocation', 'Failed to refresh location'), { variant: 'error' });
      }
    } finally {
      setLocationLoading(false);
    }
  };

  const handleLocationSelect = (loc) => {
    setSelectedLocation(loc.name);
    if (loc.lat && loc.lng) {
      setLocation({ lat: loc.lat.toString(), lng: loc.lng.toString() });
    } else {
      handleRefresh();
    }
    setLocationsMenuAnchor(null);
  };

  const getWeatherGradient = (condition) => {
    const conditionLower = condition?.toLowerCase() || '';
    
    if (conditionLower.includes('rain') || conditionLower.includes('storm') || conditionLower.includes('thunder')) {
      return 'linear-gradient(135deg, #111827 0%, #1f2937 45%, #0b1220 100%)';
    }
    if (conditionLower.includes('cloud') || conditionLower.includes('overcast')) {
      return 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #020617 100%)';
    }
    if (conditionLower.includes('snow')) {
      return 'linear-gradient(135deg, #1f2937 0%, #334155 50%, #0f172a 100%)';
    }
    if (conditionLower.includes('clear') || conditionLower.includes('sun')) {
      return 'linear-gradient(135deg, #0b1020 0%, #111827 55%, #020617 100%)';
    }
    return 'linear-gradient(135deg, #111827 0%, #1f2937 100%)';
  };

  const toDisplayTemp = (value) => {
    const celsius = Number(value || 0);
    if (temperatureUnit === 'f') return Math.round((celsius * 9) / 5 + 32);
    return Math.round(celsius);
  };

  const tempUnitLabel = temperatureUnit === 'f' ? '°F' : '°C';

  const toDisplayWind = (value) => {
    const speedMs = Number(value || 0);
    if (windSpeedUnit === 'kmh') {
      return { value: (speedMs * 3.6).toFixed(1), unit: 'km/h' };
    }
    return { value: speedMs.toFixed(1), unit: 'm/s' };
  };

  const getWeatherIcon = (condition, size = 'large') => {
    const conditionLower = condition?.toLowerCase() || '';
    const iconSize = size === 'large' ? 120 : size === 'medium' ? 60 : 40;
    
    if (conditionLower.includes('thunder') || conditionLower.includes('storm')) {
      return <StormIcon sx={{ fontSize: iconSize, color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />;
    }
    if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
      return <RainIcon sx={{ fontSize: iconSize, color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />;
    }
    if (conditionLower.includes('snow')) {
      return <SnowIcon sx={{ fontSize: iconSize, color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />;
    }
    if (conditionLower.includes('cloud') || conditionLower.includes('overcast')) {
      return <CloudIcon sx={{ fontSize: iconSize, color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))', opacity: 0.9 }} />;
    }
    return <SunIcon sx={{ fontSize: iconSize, color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />;
  };

  const formatTime = (dateString) => {
    if (!dateString) return t('weather.now', 'Now');
    const date = new Date(dateString);
    return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: timeFormat === '12h' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('weather.today', 'Today');
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return t('weather.today', 'Today');
    if (date.toDateString() === tomorrow.toDateString()) return t('weather.tomorrow', 'Tomorrow');
    return date.toLocaleDateString(locale, { weekday: 'long' });
  };

  const getAlertSeverity = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'severe': return 'error';
      case 'moderate': return 'warning';
      default: return 'info';
    }
  };

  const getAlertIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'severe': return '⚠️';
      case 'moderate': return '🔶';
      default: return 'ℹ️';
    }
  };

  const toggleAlertExpand = (alertId) => {
    setExpandedAlerts(prev => ({
      ...prev,
      [alertId]: !prev[alertId]
    }));
  };

  if (locationLoading || isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ color: 'white', mb: 3 }} />
          <Typography variant="h6" sx={{ color: 'white' }}>
            {t('weather.loadingData', 'Loading weather data...')}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!weather) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" color="text.secondary">{t('weather.unableToLoad', 'Unable to load weather data')}</Typography>
      </Box>
    );
  }

  const gradient = getWeatherGradient(weather.conditions?.main);
  const currentTemp = toDisplayTemp(weather.temperature?.current || 0);
  const highTemp = toDisplayTemp(weather.temperature?.max || 0);
  const lowTemp = toDisplayTemp(weather.temperature?.min || 0);
  const feelsLikeTemp = toDisplayTemp(weather.temperature?.feels_like || weather.temperature?.current || 0);
  const windDisplay = toDisplayWind(weather.wind?.speed || 0);

  const chartData = hourlyForecast?.slice(0, 12).map((hour, index) => ({
    time: index === 0 ? t('weather.now', 'Now') : formatTime(hour.time),
    temp: toDisplayTemp(hour.temperature || 0),
    pop: hour.precipitation?.probability || 0
  })) || [];

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: gradient,
      color: 'white',
      pb: 4,
      transition: 'background 0.5s ease'
    }}>
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon />
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              {selectedLocation}
            </Typography>
            <IconButton 
              size="small" 
              sx={{ color: 'white' }}
              aria-label={t('weather.selectLocation', 'Select location')}
              onClick={(e) => setLocationsMenuAnchor(e.currentTarget)}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              sx={{ color: 'white' }}
              aria-label={t('common.refresh', 'Refresh')}
              onClick={handleRefresh}
            >
              <RefreshIcon />
            </IconButton>
            <IconButton 
              sx={{ color: 'white' }}
              aria-label={t('common.settings', 'Open settings')}
              onClick={(e) => setSettingsMenuAnchor(e.currentTarget)}
            >
              <SettingsIcon />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            size="small"
            label={`${t('weather.units', 'Units')}: ${temperatureUnit === 'f' ? '°F' : '°C'}`}
            sx={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}
          />
          <Chip
            size="small"
            label={`${t('weather.windLabel', 'Wind')}: ${windSpeedUnit === 'kmh' ? 'km/h' : 'm/s'}`}
            sx={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}
          />
          <Chip
            size="small"
            label={`${t('weather.timeFormat', 'Time Format')}: ${timeFormat === '24h' ? '24h' : '12h'}`}
            sx={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}
          />
          <Chip
            size="small"
            label={`${t('weather.autoRefresh', 'Auto Refresh')}: ${autoRefresh ? t('common.on', 'On') : t('common.off', 'Off')}`}
            sx={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}
          />
        </Box>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2, flexDirection: { xs: 'column', md: 'row' } }}>
              {getWeatherIcon(weather.conditions?.main, 'large')}
              <Typography 
                variant="h1" 
                sx={{ 
                  fontWeight: 100, 
                  fontSize: { xs: '5rem', md: '8rem' },
                  lineHeight: 1,
                  letterSpacing: -4
                }}
              >
                {currentTemp}{tempUnitLabel}
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ mb: 2, opacity: 0.9, textTransform: 'capitalize' }}>
              {weather.conditions?.description || weather.conditions?.main}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8 }}>
              {t('weather.feelsLikeSummary', {
                feelsLike: feelsLikeTemp,
                high: highTemp,
                low: lowTemp,
                defaultValue: 'Feels like {{feelsLike}}{{unit}} • H: {{high}}{{unit}} L: {{low}}{{unit}}',
                unit: tempUnitLabel
              })}
            </Typography>
          </Box>
        </motion.div>
      </Container>

      <Container maxWidth="lg">
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            { icon: <SunIcon />, label: t('weather.feelsLike', 'FEELS LIKE'), value: `${feelsLikeTemp}${tempUnitLabel}` },
            { icon: <HumidityIcon />, label: t('weather.humidityLabel', 'HUMIDITY'), value: `${weather.humidity || 0}%` },
            { icon: <WindIcon />, label: t('weather.windLabel', 'WIND'), value: `${windDisplay.value} ${windDisplay.unit}` },
            { icon: <PressureIcon />, label: t('weather.pressureLabel', 'PRESSURE'), value: `${weather.pressure || 1013} hPa` },
            { icon: <SunIcon />, label: t('weather.sunriseLabel', 'SUNRISE'), value: weather.sunrise ? new Date(weather.sunrise).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: timeFormat === '12h' }) : '6:00 AM' },
            { icon: <MoonIcon />, label: t('weather.sunsetLabel', 'SUNSET'), value: weather.sunset ? new Date(weather.sunset).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: timeFormat === '12h' }) : '6:00 PM' }
          ].map((item, index) => (
            <Grid item xs={6} sm={4} md={2} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Paper sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  background: 'rgba(9, 13, 26, 0.72)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 2,
                  border: '1px solid rgba(255, 255, 255, 0.14)'
                }}>
                  <Box sx={{ color: 'white', mb: 1 }}>
                    {item.icon}
                  </Box>
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>
                    {item.label}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {item.value}
                  </Typography>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        <Paper sx={{ 
          mb: 3, 
          borderRadius: 2,
          background: 'rgba(9, 13, 26, 0.72)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.14)'
        }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, v) => setTabValue(v)}
            centered
            sx={{
              '& .MuiTab-root': { color: 'rgba(255, 255, 255, 0.7)' },
              '& .Mui-selected': { color: 'white' },
              '& .MuiTabs-indicator': { backgroundColor: 'white' }
            }}
          >
            <Tab label={t('weather.hourly', 'Hourly')} />
            <Tab label={t('weather.tenDay', '10-Day')} />
            <Tab label={t('weather.alertsTab', 'Alerts')} />
          </Tabs>
        </Paper>

        <Box sx={{ mb: 4 }}>
          {tabValue === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Paper sx={{ 
                p: 3, 
                borderRadius: 2,
                background: 'rgba(9, 13, 26, 0.72)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.14)'
              }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                  {t('weather.hourlyForecast', 'HOURLY FORECAST')}
                </Typography>
                <Box sx={{ overflowX: 'auto', pb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, minWidth: 'max-content' }}>
                    {hourlyForecast?.slice(0, 24).map((hour, index) => (
                      <Box key={index} sx={{ textAlign: 'center', minWidth: 80 }}>
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                          {index === 0 ? t('weather.now', 'Now') : formatTime(hour.time)}
                        </Typography>
                        <Box sx={{ my: 1, fontSize: '1.5rem' }}>
                          {getWeatherIcon(hour.conditions?.main, 'small')}
                        </Box>
                        <Typography variant="h6">
                          {toDisplayTemp(hour.temperature || 0)}{tempUnitLabel}
                        </Typography>
                        {hour.precipitation?.probability > 0 && (
                          <Typography variant="caption" sx={{ color: '#64B5F6' }}>
                            {Math.round(hour.precipitation.probability)}%
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
                
                {chartData.length > 0 && (
                  <Box sx={{ mt: 4, height: 150 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, opacity: 0.7 }}>
                      {t('weather.temperatureTrend', 'TEMPERATURE TREND')}
                    </Typography>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFB74D" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#FFB74D" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                          dataKey="time" 
                          stroke="rgba(255,255,255,0.5)"
                        />
                        <YAxis 
                          stroke="rgba(255,255,255,0.5)"
                          tickFormatter={(value) => `${value}°`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'rgba(0,0,0,0.8)', 
                            border: 'none',
                            borderRadius: 8,
                            color: 'white'
                          }}
                          formatter={(value) => [`${value}${tempUnitLabel}`, 'Temperature']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="temp" 
                          stroke="#FFB74D" 
                          fill="url(#tempGradient)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </Paper>
            </motion.div>
          )}

          {tabValue === 1 && forecast && Array.isArray(forecast) && forecast.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Paper sx={{ 
                p: 3, 
                borderRadius: 2,
                background: 'rgba(9, 13, 26, 0.72)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.14)'
              }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                  {t('weather.tenDayForecast', '10-DAY FORECAST')}
                </Typography>
                <Box>
                  {forecast.slice(0, 10).map((day, index) => {
                    const minTemp = toDisplayTemp(day.temperature?.min || 0);
                    const maxTemp = toDisplayTemp(day.temperature?.max || day.temperature?.day || 0);
                    const precipProb = day.precipitation?.probability || 0;
                    
                    return (
                      <React.Fragment key={index}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            py: 1.5,
                            px: 1,
                            transition: 'background-color 0.2s',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: 1
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                minWidth: { xs: 80, md: 100 }, 
                                fontWeight: index === 0 ? 600 : 400
                              }}
                            >
                              {index === 0 ? t('weather.today', 'Today') : formatDate(day.date)}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                              {precipProb > 0 && (
                                <Chip 
                                  label={`${Math.round(precipProb)}%`} 
                                  size="small" 
                                  sx={{ 
                                    background: 'rgba(100, 181, 246, 0.2)',
                                    color: '#64B5F6',
                                    fontSize: '0.7rem'
                                  }}
                                />
                              )}
                              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 40 }}>
                                {getWeatherIcon(day.conditions?.main, 'small')}
                              </Box>
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: { xs: 100, md: 120 }, justifyContent: 'flex-end' }}>
                            <Typography variant="body1" sx={{ opacity: 0.7 }}>
                              {minTemp}{tempUnitLabel}
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {maxTemp}{tempUnitLabel}
                            </Typography>
                          </Box>
                        </Box>
                        {index < Math.min(forecast.length, 10) - 1 && (
                          <Divider sx={{ opacity: 0.3 }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </Box>
              </Paper>
            </motion.div>
          )}

          {tabValue === 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Paper sx={{ 
                p: 3, 
                borderRadius: 2,
                background: 'rgba(9, 13, 26, 0.72)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.14)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <AlertIcon />
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    {t('weather.alertsTitle', 'WEATHER ALERTS')}
                  </Typography>
                  {weatherAlerts && weatherAlerts.length > 0 && (
                    <Chip 
                      label={weatherAlerts.length} 
                      size="small" 
                      sx={{ 
                        background: 'rgba(239, 83, 80, 0.2)',
                        color: '#EF5350'
                      }}
                    />
                  )}
                </Box>

                <AnimatePresence>
                  {!weatherAlerts || weatherAlerts.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" sx={{ opacity: 0.7 }}>
                        {t('weather.noActiveAlerts', 'No active weather alerts for your area.')}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {weatherAlerts.map((alert, index) => (
                        <motion.div
                          key={alert.id || index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          <Alert 
                            severity={getAlertSeverity(alert.severity)}
                            sx={{ 
                              background: alert.severity === 'severe' 
                                ? 'rgba(239, 83, 80, 0.2)' 
                                : alert.severity === 'moderate'
                                ? 'rgba(255, 167, 38, 0.2)'
                                : 'rgba(33, 150, 243, 0.2)',
                              color: 'white',
                              alignItems: 'flex-start',
                              borderRadius: 2,
                              border: `1px solid ${alert.severity === 'severe' ? '#EF5350' : alert.severity === 'moderate' ? '#FF9800' : '#2196F3'}`
                            }}
                            icon={false}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, width: '100%' }}>
                              <Box sx={{ fontSize: '1.5rem', lineHeight: 1 }}>
                                {getAlertIcon(alert.severity)}
                              </Box>
                              
                              <Box sx={{ flex: 1 }}>
                                <AlertTitle sx={{ 
                                  color: 'white', 
                                  mb: 1,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    {alert.title || alert.message}
                                  </Typography>
                                  <Chip 
                                    label={alert.severity?.toUpperCase() || t('weather.info', 'INFO')} 
                                    size="small"
                                    sx={{ 
                                      background: alert.severity === 'severe' 
                                        ? 'rgba(239, 83, 80, 0.3)' 
                                        : 'rgba(255, 167, 38, 0.3)',
                                      color: 'white',
                                      fontSize: '0.7rem'
                                    }}
                                  />
                                </AlertTitle>
                                
                                <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                                  {alert.description || alert.message}
                                </Typography>
                                
                                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                                  {alert.areas && (
                                    <Chip 
                                      icon={<LocationIcon sx={{ fontSize: 16 }} />}
                                      label={`Areas: ${Array.isArray(alert.areas) ? alert.areas.join(', ') : alert.areas}`}
                                      size="small"
                                      sx={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                                    />
                                  )}
                                  {alert.source && (
                                    <Chip 
                                      label={`Source: ${alert.source}`}
                                      size="small"
                                      sx={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                                    />
                                  )}
                                </Box>

                                {alert.agricultural_impact && (
                                  <>
                                    <Button
                                      size="small"
                                      onClick={() => toggleAlertExpand(alert.id || index)}
                                      endIcon={<ExpandMoreIcon sx={{ transform: expandedAlerts[alert.id || index] ? 'rotate(180deg)' : 'rotate(0deg)' }} />}
                                      sx={{ color: 'white', mb: 1 }}
                                    >
                                      {t('weather.agriculturalImpact', 'Agricultural Impact')}
                                    </Button>
                                    <Collapse in={expandedAlerts[alert.id || index]}>
                                      <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <AgricultureIcon sx={{ fontSize: 16 }} />
                                          {t('weather.agriculturalImpactCaps', 'AGRICULTURAL IMPACT')}
                                        </Typography>
                                        {alert.agricultural_impact.affected_crops && (
                                          <Typography variant="body2" sx={{ mb: 1 }}>
                                            <strong>{t('weather.affectedCrops', 'Affected Crops')}:</strong> {Array.isArray(alert.agricultural_impact.affected_crops) ? alert.agricultural_impact.affected_crops.join(', ') : alert.agricultural_impact.affected_crops}
                                          </Typography>
                                        )}
                                        {alert.agricultural_impact.recommended_actions && (
                                          <Typography variant="body2" sx={{ mb: 1 }}>
                                            <strong>{t('weather.recommendedActions', 'Recommended Actions')}:</strong> {Array.isArray(alert.agricultural_impact.recommended_actions) ? alert.agricultural_impact.recommended_actions.join(', ') : alert.agricultural_impact.recommended_actions}
                                          </Typography>
                                        )}
                                        {alert.agricultural_impact.risk_level && (
                                          <Chip 
                                            label={`Risk Level: ${alert.agricultural_impact.risk_level.toUpperCase()}`}
                                            size="small"
                                            sx={{ 
                                              background: alert.agricultural_impact.risk_level === 'high' ? 'rgba(239, 83, 80, 0.3)' : 'rgba(255, 167, 38, 0.3)',
                                              color: 'white'
                                            }}
                                          />
                                        )}
                                      </Box>
                                    </Collapse>
                                  </>
                                )}
                              </Box>
                            </Box>
                          </Alert>
                        </motion.div>
                      ))}
                    </Box>
                  )}
                </AnimatePresence>
              </Paper>
            </motion.div>
          )}
        </Box>
      </Container>

      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.3)'
          }
        }}
        onClick={handleRefresh}
      >
        <RefreshIcon />
      </Fab>

      <Menu
        anchorEl={locationsMenuAnchor}
        open={Boolean(locationsMenuAnchor)}
        onClose={() => setLocationsMenuAnchor(null)}
        PaperProps={{
          sx: {
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(20px)',
            color: 'white',
            mt: 1
          }
        }}
      >
        {savedLocations.map((loc) => (
          <MenuItem 
            key={loc.id} 
            onClick={() => handleLocationSelect(loc)}
            selected={selectedLocation === loc.name}
          >
            <ListItemIcon>
              <LocationIcon sx={{ color: 'white' }} />
            </ListItemIcon>
            <ListItemText>{loc.name}</ListItemText>
          </MenuItem>
        ))}
        <Divider sx={{ my: 1, background: 'rgba(255,255,255,0.1)' }} />
        <MenuItem>
          <ListItemIcon>
            <AddIcon sx={{ color: 'white' }} />
          </ListItemIcon>
          <ListItemText>{t('weather.addLocation', 'Add Location')}</ListItemText>
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={settingsMenuAnchor}
        open={Boolean(settingsMenuAnchor)}
        onClose={() => setSettingsMenuAnchor(null)}
        PaperProps={{
          sx: {
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(20px)',
            color: 'white',
            mt: 1
          }
        }}
      >
        <MenuItem
          selected={temperatureUnit === 'c'}
          onClick={() => {
            setTemperatureUnit('c');
            setSettingsMenuAnchor(null);
          }}
        >
          <ListItemText>{t('weather.unitsCelsius', 'Temperature: Celsius (°C)')}</ListItemText>
        </MenuItem>
        <MenuItem
          selected={temperatureUnit === 'f'}
          onClick={() => {
            setTemperatureUnit('f');
            setSettingsMenuAnchor(null);
          }}
        >
          <ListItemText>{t('weather.unitsFahrenheit', 'Temperature: Fahrenheit (°F)')}</ListItemText>
        </MenuItem>
        <MenuItem
          selected={windSpeedUnit === 'kmh'}
          onClick={() => {
            setWindSpeedUnit('kmh');
            setSettingsMenuAnchor(null);
          }}
        >
          <ListItemText>{t('weather.windUnitKmh', 'Wind Unit: km/h')}</ListItemText>
        </MenuItem>
        <MenuItem
          selected={windSpeedUnit === 'ms'}
          onClick={() => {
            setWindSpeedUnit('ms');
            setSettingsMenuAnchor(null);
          }}
        >
          <ListItemText>{t('weather.windUnitMs', 'Wind Unit: m/s')}</ListItemText>
        </MenuItem>
        <MenuItem
          selected={timeFormat === '12h'}
          onClick={() => {
            setTimeFormat('12h');
            setSettingsMenuAnchor(null);
          }}
        >
          <ListItemText>{t('weather.timeFormat12', 'Time Format: 12-hour')}</ListItemText>
        </MenuItem>
        <MenuItem
          selected={timeFormat === '24h'}
          onClick={() => {
            setTimeFormat('24h');
            setSettingsMenuAnchor(null);
          }}
        >
          <ListItemText>{t('weather.timeFormat24', 'Time Format: 24-hour')}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAutoRefresh((prev) => !prev);
          }}
        >
          <ListItemText>
            {autoRefresh
              ? t('weather.autoRefreshOn', 'Auto Refresh: On')
              : t('weather.autoRefreshOff', 'Auto Refresh: Off')}
          </ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
