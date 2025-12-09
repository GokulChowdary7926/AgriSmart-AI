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
  CircularProgress,
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
  Agriculture as CropIcon,
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
import { useTheme } from '@mui/material/styles';

export default function CropRecommendation() {
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });
  const [useManual, setUseManual] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);

  // Get coordinates from URL params if available
  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    if (lat && lng) {
      setLocation({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        source: 'url'
      });
      setUseManual(false);
    }
  }, [searchParams]);

  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    setLocationLoading(true);
    setLocationError(null);
    setUseManual(false);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
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
        setLocationLoading(false);
      },
      (error) => {
        console.error('Location error:', error);
        // Fallback to IP-based location
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
            setLocationLoading(false);
          })
          .catch(() => {
            setLocationError('Unable to get your location. Please enter coordinates manually.');
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

  // Load location on mount if not in URL
  useEffect(() => {
    if (!location && !searchParams.get('lat')) {
      getCurrentLocation();
    }
  }, [location, searchParams, getCurrentLocation]);

  // Location search function
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
      console.error('Location search error:', error);
      setLocationSearchResults([]);
    } finally {
      setLocationSearchLoading(false);
    }
  }, []);

  // Handle location selection from search
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
      setLocationSearchQuery('');
      setLocationSearchResults([]);
    }
  };

  // Fetch crop recommendations
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

  // Handle manual coordinate submission
  const handleManualSubmit = () => {
    const lat = parseFloat(manualCoords.lat);
    const lng = parseFloat(manualCoords.lng);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setLocationError('Invalid coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.');
      return;
    }

    setLocation({ lat, lng, source: 'manual' });
    setUseManual(false);
    setLocationError(null);
  };

  const recommendationData = recommendations?.data || recommendations;
  const crops = recommendationData?.recommendations || recommendationData?.crops || [];
  const locationInfo = recommendationData?.location || {};
  const weatherInfo = recommendationData?.weather || recommendationData?.conditions || {};
  const soilInfo = recommendationData?.soil || {};

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Crop Recommendation
      </Typography>

      {/* Location Section */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Location</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<MyLocationIcon />}
              onClick={getCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? 'Getting Location...' : 'Use Current Location'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              disabled={!location || recommendationsLoading}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Location Search Bar */}
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
                label="Search Location (City, State, District)"
                placeholder="Type to search for a location..."
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
                      District: {option.district}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
            noOptionsText="No locations found. Try searching for a city, state, or district."
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
                  Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
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
                  District: {location.district}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  icon={<InfoIcon />}
                  label={`Source: ${location.source?.toUpperCase() || 'GPS'}`}
                  size="small"
                  variant="outlined"
                />
                {location.accuracy && (
                  <Chip
                    label={`Accuracy: ±${Math.round(location.accuracy)}m`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info">
            Getting your location...
          </Alert>
        )}

        {/* Manual Coordinate Input */}
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            Or Enter Coordinates Manually
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label="Latitude"
                type="number"
                value={manualCoords.lat}
                onChange={(e) => setManualCoords({ ...manualCoords, lat: e.target.value })}
                placeholder="e.g., 28.6139"
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label="Longitude"
                type="number"
                value={manualCoords.lng}
                onChange={(e) => setManualCoords({ ...manualCoords, lng: e.target.value })}
                placeholder="e.g., 77.2090"
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
                Submit
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Weather & Soil Info */}
      {(weatherInfo.temperature || soilInfo.soilType) && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {weatherInfo.temperature && (
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <WeatherIcon color="primary" />
                  <Typography variant="h6">Weather Conditions</Typography>
                </Box>
                <Grid container spacing={2}>
                  {weatherInfo.temperature && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Temperature</Typography>
                      <Typography variant="h6">{weatherInfo.temperature}°C</Typography>
                    </Grid>
                  )}
                  {weatherInfo.rainfall && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Rainfall</Typography>
                      <Typography variant="h6">{weatherInfo.rainfall}mm</Typography>
                    </Grid>
                  )}
                  {weatherInfo.humidity && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Humidity</Typography>
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
                <Typography variant="h6">Soil Information</Typography>
              </Box>
              <Grid container spacing={2}>
                {soilInfo.soilType ? (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Soil Type</Typography>
                    <Chip
                      label={soilInfo.soilType}
                      color="primary"
                      sx={{ mt: 0.5, fontWeight: 600, fontSize: '1rem', py: 2.5 }}
                    />
                  </Grid>
                ) : (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Soil Type</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, fontStyle: 'italic' }} color="text.secondary">
                      Not available for this location
                    </Typography>
                  </Grid>
                )}
                {soilInfo.ph && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">pH Level</Typography>
                    <Typography variant="h6">{soilInfo.ph}</Typography>
                  </Grid>
                )}
                {soilInfo.organicMatter && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Organic Matter</Typography>
                    <Typography variant="h6">{soilInfo.organicMatter}</Typography>
                  </Grid>
                )}
                {soilInfo.organic_carbon && !soilInfo.organicMatter && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Organic Carbon</Typography>
                    <Typography variant="h6">{soilInfo.organic_carbon}</Typography>
                  </Grid>
                )}
                {soilInfo.drainage && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Drainage</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {soilInfo.drainage}
                    </Typography>
                  </Grid>
                )}
                {soilInfo.ph_range && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">pH Range</Typography>
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

      {/* Recommendations */}
      {recommendationsLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {recommendationsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {recommendationsError.message || 'Failed to fetch crop recommendations. Please try again.'}
        </Alert>
      )}

      {!recommendationsLoading && !recommendationsError && crops.length > 0 && (
        <Paper sx={{ p: 3, bgcolor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Recommended Crops
          </Typography>
          <Grid container spacing={3}>
            {crops.map((crop, index) => (
              <Grid item xs={12} md={6} lg={4} key={crop.id || crop.name || index}>
                <Card sx={{ height: '100%', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {crop.name || crop.label || crop.crop || 'Unknown Crop'}
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

                    {/* Detailed Scoring Breakdown */}
                    {crop.scoringBreakdown && (
                      <Accordion sx={{ mb: 2, bgcolor: 'background.default' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckIcon color="success" fontSize="small" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              📊 Detailed Reasons for Recommendation
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                            {/* Soil Compatibility */}
                            {crop.scoringBreakdown.soilCompatibility && (
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    Soil Compatibility
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
                                {crop.scoringBreakdown.soilCompatibility.details?.details && (
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

                            {/* Weather Alignment */}
                            {crop.scoringBreakdown.weatherAlignment && (
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    Weather Alignment
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
                                {crop.scoringBreakdown.weatherAlignment.details?.details && (
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

                            {/* Economic Viability */}
                            {crop.scoringBreakdown.economicViability && (
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    Economic Viability
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
                                {crop.scoringBreakdown.economicViability.details?.details && (
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

                            {/* Risk Factor */}
                            {crop.scoringBreakdown.riskFactor && (
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    Risk Factor
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
                                {crop.scoringBreakdown.riskFactor.details?.details && (
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

                    {/* Reasons for Recommendation (Fallback) */}
                    {!crop.scoringBreakdown && crop.reasons && (Array.isArray(crop.reasons) ? crop.reasons : [crop.reasons]).length > 0 && (
                      <Accordion sx={{ mb: 2, bgcolor: 'background.default' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckIcon color="success" fontSize="small" />
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              Why Recommended
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
                                  primary={typeof reason === 'string' ? reason : reason.description || reason}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    )}

                    {/* Advantages */}
                    {crop.advantages && crop.advantages.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <TrendingUpIcon fontSize="small" color="primary" />
                          Advantages
                        </Typography>
                        <List dense>
                          {crop.advantages.map((advantage, idx) => (
                            <ListItem key={idx} sx={{ py: 0.5, px: 0 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <StarIcon fontSize="small" color="warning" />
                              </ListItemIcon>
                              <ListItemText
                                primary={advantage}
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
                          <Typography variant="caption" color="text.secondary">Season</Typography>
                          <Chip
                            label={crop.season}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        </Grid>
                      )}
                      {crop.duration && (
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Duration</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                            {crop.duration} {crop.durationUnit || 'days'}
                          </Typography>
                        </Grid>
                      )}
                      {crop.expectedYield && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">Expected Yield</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', mt: 0.5 }}>
                            {crop.expectedYield} {crop.yieldUnit || 'kg/hectare'}
                          </Typography>
                        </Grid>
                      )}
                      {crop.marketPrice && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">Market Price</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                            {crop.marketPrice}
                          </Typography>
                          {crop.priceTrend && (
                            <Chip
                              label={`Price Trend: ${crop.priceTrend}`}
                              size="small"
                              color={crop.priceTrend === 'increasing' ? 'success' : crop.priceTrend === 'stable' ? 'default' : 'error'}
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Grid>
                      )}
                      {crop.potentialRevenue && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">Potential Revenue (per hectare)</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main', mt: 0.5 }}>
                            ₹{crop.potentialRevenue.min?.toLocaleString()} - ₹{crop.potentialRevenue.max?.toLocaleString()}
                          </Typography>
                        </Grid>
                      )}
                      {crop.profitMargin && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">Estimated Profit Margin</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                            {crop.profitMargin.percentage || crop.profitMargin}
                            {crop.profitMargin.min && ` (₹${crop.profitMargin.min.toLocaleString()} - ₹${crop.profitMargin.max.toLocaleString()})`}
                          </Typography>
                        </Grid>
                      )}
                      {crop.plantingWindow && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">Planting Window</Typography>
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

      {!recommendationsLoading && !recommendationsError && crops.length === 0 && location && (
        <Alert severity="info">
          No crop recommendations available for this location. Please try a different location.
        </Alert>
      )}
    </Container>
  );
}
