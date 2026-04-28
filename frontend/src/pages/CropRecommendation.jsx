import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Autocomplete,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Cloud as WeatherIcon,
  Grass as SoilIcon,
  Refresh as RefreshIcon,
  MyLocation as MyLocationIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import api from '../services/api';
import logger from '../services/logger';
import LoadingState from '../components/common/LoadingState';
import { useLanguage } from '../contexts/LanguageContext';
import { setStoredLocation } from '../services/realtimeLocation';

export default function CropRecommendation() {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });
  const [useManual, setUseManual] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);

  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    if (lat && lng) {
      setLocation({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        source: 'url'
      });
      setStoredLocation({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        source: 'url'
      });
      setUseManual(false);
    }
  }, [searchParams]);

  const getCurrentLocation = useCallback(() => {
    setLocationLoading(true);
    setLocationError(null);
    setUseManual(false);

    if (!navigator.geolocation) {
      setLocationError(t('cropRecommendation.geolocationNotSupported'));
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'gps'
        });
        setStoredLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'gps'
        });
        setLocationLoading(false);
      },
      (error) => {
        logger.error('Location error', error, { service: 'CropRecommendation' });
        fetch('https://ipapi.co/json/')
          .then(res => res.json())
          .then(data => {
            setLocation({
              lat: data.latitude,
              lng: data.longitude,
              city: data.city,
              state: data.region,
              country: data.country_name,
              source: 'ip'
            });
            setStoredLocation({
              lat: data.latitude,
              lng: data.longitude,
              city: data.city,
              state: data.region,
              country: data.country_name,
              source: 'ip'
            });
            setLocationLoading(false);
          })
          .catch(() => {
            setLocationError(t('cropRecommendation.locationError'));
            setLocationLoading(false);
          });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  useEffect(() => {
    if (!location && !searchParams.get('lat')) {
      getCurrentLocation();
    }
  }, [location, searchParams, getCurrentLocation]);

  const searchLocation = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setLocationSearchResults([]);
      return;
    }

    setLocationSearchLoading(true);
    try {
      const response = await api.get('/map/geocode', {
        params: { query, language: localStorage.getItem('language') || 'en' }
      });

      if (response.data.success && response.data.results) {
        setLocationSearchResults(response.data.results || []);
      } else {
        setLocationSearchResults([]);
      }
    } catch (error) {
      logger.error('Location search error', error, { query: locationSearchQuery });
      setLocationSearchResults([]);
    } finally {
      setLocationSearchLoading(false);
    }
  }, []);

  const handleLocationSelect = (selectedLocation) => {
    if (selectedLocation && selectedLocation.latitude && selectedLocation.longitude) {
      setLocation({
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
        city: selectedLocation.city,
        state: selectedLocation.state,
        district: selectedLocation.district,
        address: selectedLocation.display_name || selectedLocation.formatted,
        source: 'search'
      });
      setStoredLocation({
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
        city: selectedLocation.city,
        state: selectedLocation.state,
        district: selectedLocation.district,
        address: selectedLocation.display_name || selectedLocation.formatted,
        source: 'search'
      });
      setLocationSearchQuery('');
      setLocationSearchResults([]);
    }
  };

  const { data: recommendations, isLoading: recommendationsLoading, error: recommendationsError, refetch } = useQuery({
    queryKey: ['cropRecommendations', location?.lat, location?.lng],
    queryFn: async () => {
      if (!location?.lat || !location?.lng) {
        throw new Error('Location is required');
      }

      const response = await api.post('/crops/recommend', {
        latitude: location.lat,
        longitude: location.lng,
        language: localStorage.getItem('language') || 'en'
      });

      return response.data;
    },
    enabled: !!location?.lat && !!location?.lng && !useManual,
    retry: 1,
    staleTime: 5 * 60 * 1000
  });

  const handleManualSubmit = () => {
    const lat = parseFloat(manualCoords.lat);
    const lng = parseFloat(manualCoords.lng);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setLocationError(t('cropRecommendation.invalidRange'));
      return;
    }

    setLocation({ lat, lng, source: 'manual' });
    setStoredLocation({ lat, lng, source: 'manual' });
    setUseManual(false);
    setLocationError(null);
  };

  const recommendationData = recommendations?.data || recommendations;
  const crops = recommendationData?.recommendations || recommendationData?.crops || [];
  const locationInfo = recommendationData?.location || {};
  const weatherInfo = recommendationData?.weather || recommendationData?.conditions || {};
  const soilInfo = recommendationData?.soil || {};
  const marketState = locationInfo?.state || location?.state || '';
  const marketDistrict = locationInfo?.district || location?.district || location?.city || '';

  const normalizeCommodityKey = useCallback((value) => {
    const raw = String(value || '')
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .trim();
    const compact = raw.replace(/[^a-z\u0B80-\u0BFF]/g, '');
    const aliases = {
      நெல்: 'rice',
      அரிசி: 'rice',
      rice: 'rice',
      paddy: 'rice',
      கரும்பு: 'sugarcane',
      sugarcane: 'sugarcane',
      சோளம்: 'maize',
      மக்காச்சோளம்: 'maize',
      maize: 'maize',
      corn: 'maize',
      சிறுநீரகபீன்ஸ்: 'kidneybeans',
      kidneybeans: 'kidneybeans',
      அவரைப்பயறு: 'mothbeans',
      mothbeans: 'mothbeans',
      பாசிப்பயறு: 'mungbean',
      mungbean: 'mungbean',
      கொண்டைக்கடலை: 'chickpea',
      chickpea: 'chickpea',
      மாதுளை: 'pomegranate',
      pomegranate: 'pomegranate',
      பருப்பு: 'lentil',
      lentil: 'lentil'
    };
    return aliases[compact] || compact;
  }, []);

  const todayDate = new Date().toISOString().split('T')[0];

  const { data: marketReference } = useQuery({
    queryKey: ['cropRecommendationMarketPricesToday', marketState, marketDistrict, todayDate, language],
    queryFn: async () => {
      const params = { limit: 1000 };
      if (marketState) params.state = marketState;
      const response = await api.get('/market/prices', { params });
      const list = Array.isArray(response?.data?.data) ? response.data.data : [];
      const latestByCommodity = new Map();
      list.forEach((item) => {
        const key = normalizeCommodityKey(item?.commodity || item?.name);
        if (!key) return;
        const raw = typeof item?.price === 'object' ? item.price?.value : item?.price;
        const price = Number(raw);
        if (!Number.isFinite(price) || price <= 0) return;
        const itemDate = new Date(item?.date || item?.recordedAt || item?.timestamp || 0);
        const ts = itemDate.getTime() || 0;
        const isToday = itemDate.toISOString().slice(0, 10) === todayDate;
        const prev = latestByCommodity.get(key);
        if (!prev || (isToday && !prev.isToday) || (isToday === prev.isToday && ts >= prev.ts)) {
          latestByCommodity.set(key, {
            price,
            ts,
            isToday,
            market: item?.market?.name || item?.market?.location || item?.state || ''
          });
        }
      });
      const byCommodity = {};
      latestByCommodity.forEach((value, key) => {
        byCommodity[key] = value;
      });
      return byCommodity;
    },
    enabled: Boolean(crops.length),
    staleTime: 10 * 60 * 1000
  });

  const localizeRecommendationText = useCallback((value) => {
    const text = String(value || '').trim();
    if (!text || language !== 'ta') return text;
    const map = {
      'Suitable for your region': 'உங்கள் பகுதியில் ஏற்றது',
      'Very high yield': 'மிக அதிக விளைச்சல்',
      'Year-round income': 'ஆண்டு முழுவதும் வருமானம்',
      'Multiple products': 'பல தயாரிப்புகள்',
      'Fast growing': 'வேகமாக வளரக்கூடியது',
      'Multiple uses': 'பல பயன்பாடுகள்',
      'Good market demand': 'சந்தையில் நல்ல தேவை',
      'Stable food': 'நிலையான உணவுப் பயிர்',
      'Staple food': 'முதன்மை உணவுப் பயிர்',
      'Stapple food': 'முதன்மை உணவுப் பயிர்',
      'High demand': 'அதிக தேவை',
      'Multiple varieties': 'பல வகைகள்',
      'High yield': 'அதிக விளைச்சல்',
      'Short duration': 'குறுகிய காலம்',
      'Suitable for your soil type': 'உங்கள் மண் வகைக்கு ஏற்றது',
      'Good climate compatibility': 'உங்கள் வானிலைக்கு ஏற்றது'
    };
    return map[text] || text;
  }, [language]);

  const localizeCropName = useCallback((value) => {
    const text = String(value || '').trim();
    if (!text || language !== 'ta') return text;
    const map = {
      rice: 'நெல்',
      paddy: 'நெல்',
      sugarcane: 'கரும்பு',
      maize: 'மக்காச்சோளம்',
      kidneybeans: 'கிட்னி பீன்ஸ்',
      mothbeans: 'மொத் பீன்ஸ்',
      mungbean: 'பாசிப்பயறு',
      chickpea: 'கொண்டைக்கடலை',
      lentil: 'பருப்பு',
      blackgram: 'உளுந்து',
      greengram: 'பாசிப்பயறு',
      pomegranate: 'மாதுளை',
      groundnut: 'நிலக்கடலை',
      wheat: 'கோதுமை',
      tomato: 'தக்காளி',
      millet: 'சிறுதானியம்'
    };
    const key = text.toLowerCase().replace(/\s+/g, '');
    return map[key] || text;
  }, [language]);

  const localizeSeasonText = useCallback((value) => {
    const text = String(value || '').trim();
    if (!text || language !== 'ta') return text;
    const normalized = text.toLowerCase();
    if (normalized.includes('kharif')) return 'கரீப்';
    if (normalized.includes('rabi')) return 'ரபி';
    if (normalized.includes('zaid')) return 'சைத்';
    if (normalized.includes('year-round') || normalized.includes('yearround')) return 'ஆண்டு முழுவதும்';
    return text;
  }, [language]);

  const localizeDurationText = useCallback((value) => {
    const text = String(value || '').trim();
    if (!text || language !== 'ta') return text;
    return text
      .replace(/\bdays?\b/gi, 'நாட்கள்')
      .replace(/\bmonths?\b/gi, 'மாதங்கள்')
      .replace(/\byears?\b/gi, 'ஆண்டுகள்');
  }, [language]);

  const formatMarketPrice = useCallback((crop) => {
    const cropKey = normalizeCommodityKey(crop?.name || crop?.label || crop?.crop);
    const live = cropKey ? marketReference?.[cropKey] : null;
    const livePerKg = Number(live?.price);
    if (Number.isFinite(livePerKg) && livePerKg > 0) {
      const unit = language === 'ta' ? '/கிலோ' : '/kg';
      return `₹${livePerKg.toFixed(2)}${unit}`;
    }
    return language === 'ta' ? 'சந்தை விலை இல்லை' : 'Market price unavailable';
  }, [language, marketReference, normalizeCommodityKey]);

  useEffect(() => {
    if (recommendations && crops.length > 0) {
      logger.info('Crop recommendations generated', {
        count: crops.length,
        location: location,
        modelUsed: recommendations._quality?.source || 'rule-based',
        confidence: recommendations._quality?.confidence
      });
    }
  }, [recommendations, crops, location]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        {t('cropRecommendation.title')}
      </Typography>

      <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{t('cropRecommendation.location', 'Location')}</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<MyLocationIcon />}
              onClick={getCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? t('cropRecommendation.gettingLocation') : t('cropRecommendation.useCurrentLocation')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              disabled={!location || recommendationsLoading}
            >
              {t('common.refresh', 'Refresh')}
            </Button>
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Autocomplete
            fullWidth
            freeSolo
            options={locationSearchResults}
            getOptionLabel={(option) => {
              if (typeof option === 'string') return option;
              return option.display_name || option.formatted || `${option.city || ''}, ${option.state || ''}, ${option.country || 'India'}`.trim();
            }}
            loading={locationSearchLoading}
            onInputChange={(event, newValue) => {
              setLocationSearchQuery(newValue);
              if (newValue && newValue.length >= 3) {
                searchLocation(newValue);
              } else {
                setLocationSearchResults([]);
              }
            }}
            onChange={(event, newValue) => {
              if (newValue && typeof newValue !== 'string') {
                handleLocationSelect(newValue);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('cropRecommendation.searchLocation', 'Search Location')}
                placeholder={t('cropRecommendation.searchPlaceholder', 'Type to search for a location...')}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <SearchIcon sx={{ color: 'text.secondary', mr: 1, ml: 0.5 }} />
                      {params.InputProps.startAdornment}
                    </>
                  )
                }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.latitude || option.display_name}>
                <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="body2">
                    {option.display_name || option.formatted || `${option.city || ''}, ${option.state || ''}`}
                  </Typography>
                  {option.district && option.district !== option.city && (
                    <Typography variant="caption" color="text.secondary">
                      {t('map.district')}: {option.district}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
            noOptionsText={t('cropRecommendation.noLocationsFound', 'No locations found. Try searching for a city, state, or district.')}
          />
        </Box>

        {locationError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {locationError}
          </Alert>
        )}

        {location ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LocationIcon color="primary" />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {t('cropRecommendation.coordinates', 'Coordinates')}: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </Typography>
              </Box>
              {locationInfo.address && (
                <Typography variant="body2" color="text.secondary">
                  {locationInfo.address}
                </Typography>
              )}
              {(locationInfo.city || locationInfo.state) && (
                <Typography variant="body2" color="text.secondary">
                  {locationInfo.city}{locationInfo.city && locationInfo.state ? ', ' : ''}{locationInfo.state}
                  {locationInfo.country && `, ${locationInfo.country}`}
                </Typography>
              )}
              {location.district && (
                <Typography variant="body2" color="text.secondary">
                  {t('map.district')}: {location.district}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  icon={<InfoIcon />}
                  label={t('cropRecommendation.source', { source: location.source?.toUpperCase() || 'GPS', defaultValue: 'Source: {{source}}' })}
                  size="small"
                  variant="outlined"
                />
                {location.accuracy && (
                  <Chip
                    label={t('cropRecommendation.accuracy', { value: Math.round(location.accuracy), defaultValue: 'Accuracy: +-{{value}}m' })}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info">
            {t('cropRecommendation.gettingLocation', 'Getting your location...')}
          </Alert>
        )}

        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            {t('cropRecommendation.enterManually')}
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label={t('cropRecommendation.latitude', 'Latitude')}
                type="number"
                value={manualCoords.lat}
                onChange={(e) => setManualCoords({ ...manualCoords, lat: e.target.value })}
                placeholder={t('cropRecommendation.latitudeExample', 'e.g., 28.6139')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label={t('cropRecommendation.longitude', 'Longitude')}
                type="number"
                value={manualCoords.lng}
                onChange={(e) => setManualCoords({ ...manualCoords, lng: e.target.value })}
                placeholder={t('cropRecommendation.longitudeExample', 'e.g., 77.2090')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleManualSubmit}
                disabled={!manualCoords.lat || !manualCoords.lng}
              >
                {t('common.submit', 'Submit')}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {(weatherInfo.temperature || soilInfo.soilType) && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {weatherInfo.temperature && (
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <WeatherIcon color="primary" />
                  <Typography variant="h6">{t('cropRecommendation.weather')}</Typography>
                </Box>
                <Grid container spacing={2}>
                  {weatherInfo.temperature && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">{t('weather.temperature')}</Typography>
                      <Typography variant="h6">{weatherInfo.temperature}°C</Typography>
                    </Grid>
                  )}
                  {(weatherInfo.rainfall !== undefined && weatherInfo.rainfall !== null) && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">{t('weather.rainfall')}</Typography>
                      <Typography variant="h6">{Number(weatherInfo.rainfall)}mm</Typography>
                    </Grid>
                  )}
                  {weatherInfo.humidity && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">{t('weather.humidity')}</Typography>
                      <Typography variant="h6">{weatherInfo.humidity}%</Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </Grid>
          )}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SoilIcon color="primary" />
                <Typography variant="h6">{t('cropRecommendation.soil')}</Typography>
              </Box>
              <Grid container spacing={2}>
                {soilInfo.soilType ? (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">{t('profile.soilType', 'Soil Type')}</Typography>
                    <Chip
                      label={soilInfo.soilType}
                      color="primary"
                      sx={{ mt: 0.5, fontWeight: 600, fontSize: '1rem', py: 2.5 }}
                    />
                  </Grid>
                ) : (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">{t('profile.soilType', 'Soil Type')}</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, fontStyle: 'italic' }} color="text.secondary">
                      {t('cropRecommendation.soilUnavailable', 'Not available for this location')}
                    </Typography>
                  </Grid>
                )}
                {soilInfo.ph && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">{t('cropRecommendation.phLevel', 'pH Level')}</Typography>
                    <Typography variant="h6">{soilInfo.ph}</Typography>
                  </Grid>
                )}
                {soilInfo.organicMatter && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">{t('cropRecommendation.organicMatter', 'Organic Matter')}</Typography>
                    <Typography variant="h6">{soilInfo.organicMatter}</Typography>
                  </Grid>
                )}
                {soilInfo.organic_carbon && !soilInfo.organicMatter && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">{t('cropRecommendation.organicCarbon', 'Organic Carbon')}</Typography>
                    <Typography variant="h6">{soilInfo.organic_carbon}</Typography>
                  </Grid>
                )}
                {soilInfo.drainage && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">{t('cropRecommendation.drainage', 'Drainage')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {soilInfo.drainage}
                    </Typography>
                  </Grid>
                )}
                {soilInfo.ph_range && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">{t('cropRecommendation.phRange', 'pH Range')}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {soilInfo.ph_range}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      <LoadingState
        isLoading={recommendationsLoading}
        error={recommendationsError}
        retry={() => refetch()}
        dataLength={crops.length}
        type="card"
        emptyMessage={t('cropRecommendation.noRecommendations', 'No crop recommendations available for this location. Please try a different location.')}
      >
      {crops.length > 0 && (
        <Paper sx={{ p: 3, bgcolor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            {t('cropRecommendation.recommendedCrops')}
          </Typography>
          <Grid container spacing={3}>
            {crops.map((crop, index) => (
              <Grid item xs={12} md={6} lg={4} key={crop.id || crop.name || index}>
                <Card sx={{ height: '100%', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {localizeCropName(crop.name || crop.label || crop.crop || t('cropRecommendation.unknownCrop', 'Unknown Crop'))}
                      </Typography>
                      {crop.suitabilityScore && (
                        <Chip
                          label={`${crop.suitabilityScore}%`}
                          color={crop.suitabilityScore >= 80 ? 'success' : crop.suitabilityScore >= 60 ? 'warning' : 'default'}
                          size="small"
                          icon={<StarIcon />}
                        />
                      )}
                    </Box>

                    {crop.scoringBreakdown && (
                      <Accordion sx={{ mb: 2, bgcolor: 'background.default' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckIcon color="success" fontSize="small" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {t('cropRecommendation.detailedReasonsForRecommendation', 'Detailed Reasons for Recommendation')}
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                            {crop.scoringBreakdown.soilCompatibility && (
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {t('cropRecommendation.soilCompatibility', 'Soil Compatibility')}
                                  </Typography>
                                  <Chip
                                    label={`${crop.scoringBreakdown.soilCompatibility.score}/${crop.scoringBreakdown.soilCompatibility.maxScore}`}
                                    size="small"
                                    color={crop.scoringBreakdown.soilCompatibility.score >= 20 ? 'success' : 'default'}
                                  />
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                  {crop.scoringBreakdown.soilCompatibility.details?.description || ''}
                                </Typography>
                                {crop.scoringBreakdown.soilCompatibility.details?.details && Array.isArray(crop.scoringBreakdown.soilCompatibility.details.details) && (
                                  <List dense>
                                    {crop.scoringBreakdown.soilCompatibility.details.details.map((detail, idx) => (
                                      <ListItem key={idx} sx={{ py: 0.25, px: 0 }}>
                                        <ListItemText
                                          primary={detail}
                                          primaryTypographyProps={{ variant: 'caption' }}
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                )}
                              </Box>
                            )}

                            {crop.scoringBreakdown.weatherAlignment && (
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {t('cropRecommendation.weatherAlignment', 'Weather Alignment')}
                                  </Typography>
                                  <Chip
                                    label={`${crop.scoringBreakdown.weatherAlignment.score}/${crop.scoringBreakdown.weatherAlignment.maxScore}`}
                                    size="small"
                                    color={crop.scoringBreakdown.weatherAlignment.score >= 25 ? 'success' : 'default'}
                                  />
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                  {crop.scoringBreakdown.weatherAlignment.details?.description || ''}
                                </Typography>
                                {crop.scoringBreakdown.weatherAlignment.details?.details && Array.isArray(crop.scoringBreakdown.weatherAlignment.details.details) && (
                                  <List dense>
                                    {crop.scoringBreakdown.weatherAlignment.details.details.map((detail, idx) => (
                                      <ListItem key={idx} sx={{ py: 0.25, px: 0 }}>
                                        <ListItemText
                                          primary={detail}
                                          primaryTypographyProps={{ variant: 'caption' }}
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                )}
                              </Box>
                            )}

                            {crop.scoringBreakdown.economicViability && (
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {t('cropRecommendation.economicViability', 'Economic Viability')}
                                  </Typography>
                                  <Chip
                                    label={`${crop.scoringBreakdown.economicViability.score}/${crop.scoringBreakdown.economicViability.maxScore}`}
                                    size="small"
                                    color={crop.scoringBreakdown.economicViability.score >= 20 ? 'success' : 'default'}
                                  />
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                  {crop.scoringBreakdown.economicViability.details?.description || ''}
                                </Typography>
                                {crop.scoringBreakdown.economicViability.details?.details && Array.isArray(crop.scoringBreakdown.economicViability.details.details) && (
                                  <List dense>
                                    {crop.scoringBreakdown.economicViability.details.details.map((detail, idx) => (
                                      <ListItem key={idx} sx={{ py: 0.25, px: 0 }}>
                                        <ListItemText
                                          primary={detail}
                                          primaryTypographyProps={{ variant: 'caption' }}
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                )}
                              </Box>
                            )}

                            {crop.scoringBreakdown.riskFactor && (
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {t('cropRecommendation.riskFactor', 'Risk Factor')}
                                  </Typography>
                                  <Chip
                                    label={`${crop.scoringBreakdown.riskFactor.score}/${crop.scoringBreakdown.riskFactor.maxScore}`}
                                    size="small"
                                    color={crop.scoringBreakdown.riskFactor.score >= 15 ? 'success' : crop.scoringBreakdown.riskFactor.score >= 10 ? 'warning' : 'error'}
                                  />
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                  {crop.scoringBreakdown.riskFactor.details?.description || ''}
                                </Typography>
                                {crop.scoringBreakdown.riskFactor.details?.details && Array.isArray(crop.scoringBreakdown.riskFactor.details.details) && (
                                  <List dense>
                                    {crop.scoringBreakdown.riskFactor.details.details.map((detail, idx) => (
                                      <ListItem key={idx} sx={{ py: 0.25, px: 0 }}>
                                        <ListItemText
                                          primary={detail}
                                          primaryTypographyProps={{ variant: 'caption' }}
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                )}
                              </Box>
                            )}
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    )}

                    {!crop.scoringBreakdown && crop.reasons && (Array.isArray(crop.reasons) ? crop.reasons : [crop.reasons]).length > 0 && (
                      <Accordion sx={{ mb: 2, bgcolor: 'background.default' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckIcon color="success" fontSize="small" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {t('cropRecommendation.whyRecommended', 'Why Recommended')}
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List dense>
                            {(Array.isArray(crop.reasons) ? crop.reasons : [crop.reasons]).map((reason, idx) => (
                              <ListItem key={idx} sx={{ py: 0.5, px: 0 }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                  <CheckIcon fontSize="small" color="success" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={localizeRecommendationText(typeof reason === 'string' ? reason : reason.description || reason)}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    )}

                    {crop.advantages && Array.isArray(crop.advantages) && crop.advantages.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TrendingUpIcon fontSize="small" color="primary" />
                          {t('cropRecommendation.advantages', 'Advantages')}
                        </Typography>
                        <List dense>
                          {crop.advantages.map((advantage, idx) => (
                            <ListItem key={idx} sx={{ py: 0.5, px: 0 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <StarIcon fontSize="small" color="warning" />
                              </ListItemIcon>
                              <ListItemText
                                primary={localizeRecommendationText(advantage)}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2}>
                      {crop.season && (
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">{t('cropRecommendation.season', 'Season')}</Typography>
                          <Chip
                            label={localizeSeasonText(crop.season)}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        </Grid>
                      )}
                      {crop.duration && (
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">{t('cropRecommendation.duration', 'Duration')}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                            {localizeDurationText(crop.duration)}
                            {crop.duration && !/\s*(days|months?)$/i.test(String(crop.duration).trim())
                              ? ` ${language === 'ta' ? 'நாட்கள்' : (crop.durationUnit || 'days')}`
                              : ''}
                          </Typography>
                        </Grid>
                      )}
                      {crop.expectedYield && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">{t('cropRecommendation.expectedYield', 'Expected Yield')}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', mt: 0.5 }}>
                            {crop.expectedYield}{crop.expectedYield && !/\s*(tons?\/ha|kg\/ha|quintals?\/acre)$/i.test(String(crop.expectedYield).trim()) ? ` ${crop.yieldUnit || 'tons/ha'}` : ''}
                          </Typography>
                        </Grid>
                      )}
                      {(
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">{t('cropRecommendation.marketPrice', 'Market Price')}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                            {formatMarketPrice(crop)}
                          </Typography>
                          {(() => {
                            const key = normalizeCommodityKey(crop?.name || crop?.label || crop?.crop);
                            const live = key ? marketReference?.[key] : null;
                            if (!live?.market) return null;
                            return (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                {language === 'ta' ? `மார்க்கெட்: ${live.market}` : `Market: ${live.market}`}
                              </Typography>
                            );
                          })()}
                          {crop.priceTrend && (
                            <Chip
                              label={t('cropRecommendation.priceTrend', {
                                trend: crop.priceTrend,
                                defaultValue: 'Price Trend: {{trend}}'
                              })}
                              size="small"
                              color={crop.priceTrend === 'increasing' ? 'success' : crop.priceTrend === 'stable' ? 'default' : 'error'}
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Grid>
                      )}
                      {crop.potentialRevenue && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">{t('cropRecommendation.potentialRevenue', 'Potential Revenue (per hectare)')}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main', mt: 0.5 }}>
                            ₹{crop.potentialRevenue.min?.toLocaleString()} - ₹{crop.potentialRevenue.max?.toLocaleString()}
                          </Typography>
                        </Grid>
                      )}
                      {crop.profitMargin && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">{t('cropRecommendation.profitMargin', 'Estimated Profit Margin')}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                            {crop.profitMargin.percentage || crop.profitMargin}
                            {crop.profitMargin.min && ` (₹${crop.profitMargin.min.toLocaleString()} - ₹${crop.profitMargin.max.toLocaleString()})`}
                          </Typography>
                        </Grid>
                      )}
                      {crop.plantingWindow && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">{t('cropRecommendation.plantingWindow', 'Planting Window')}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                            {crop.plantingWindow}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      </LoadingState>
    </Container>
  );
}
