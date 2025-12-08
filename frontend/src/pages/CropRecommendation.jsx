import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Autocomplete,
  Tabs,
  Tab
} from '@mui/material';
import {
  LocationOn,
  Thermostat,
  WaterDrop,
  Grass,
  Cloud,
  Agriculture,
  CheckCircle,
  Warning,
  Info,
  MyLocation,
  Refresh,
  Search,
  MonetizationOn,
  BugReport
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../services/api';

// Import Leaflet components
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default icons - Use inline SVG to avoid 404 errors
const createDefaultIcon = () => {
  return L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
        <path fill="#3388ff" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.8 12.5 28.5 12.5 28.5S25 21.3 25 12.5C25 5.6 19.4 0 12.5 0z"/>
        <circle fill="white" cx="12.5" cy="12.5" r="6"/>
      </svg>
    `),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -41],
    shadowUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="41" height="41" viewBox="0 0 41 41">
        <circle fill="black" opacity="0.3" cx="20.5" cy="20.5" r="18"/>
      </svg>
    `),
    shadowSize: [41, 41],
    shadowAnchor: [12, 41]
  });
};

// Set default icon
L.Icon.Default = createDefaultIcon();

export default function CropRecommendation() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center
  const [mapZoom, setMapZoom] = useState(5);
  const [mapReady, setMapReady] = useState(false);
  const [marketPrices, setMarketPrices] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  // Auto-detect location and get recommendations
  const autoDetectLocationAndRecommend = async () => {
    try {
      setLocationLoading(true);
      setError(null);
      setAutoDetected(false);

      // Starting GPS location detection

      // Step 1: Get user's current location using browser geolocation (with IP fallback)
      const position = await getCurrentLocation();
      
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;
      const source = position.source || 'gps';

      // Location coordinates received
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        accuracy: accuracy ? `${accuracy.toFixed(0)} meters` : 'unknown',
        source: source === 'gps' ? 'GPS' : 'IP-based'
      });

      // Validate coordinates before proceeding
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        throw new Error('Invalid location coordinates received');
      }
      
      // Update location state with source information
      setLocation({
        latitude: lat,
        longitude: lng,
        accuracy: accuracy,
        timestamp: position.timestamp,
        source: source
      });
      
      // Update map center to show location
      setMapCenter([lat, lng]);
      setMapZoom(source === 'gps' ? 14 : 10);
      setMapReady(true);

      // Step 2: Get complete environmental data and recommendations
      // Fetching environmental data for location
      await fetchCompleteData(lat, lng);
      
      setAutoDetected(true);
      // Location auto-detection completed successfully
    } catch (err) {
      console.error('❌ Auto-detection error:', err);
      
      // Provide user-friendly error messages
      let errorMessage = '';
      if (err.code === 1 || err.message.includes('PERMISSION_DENIED') || err.message.includes('allow location')) {
        errorMessage = t('cropRecommendation.permissionDenied') || 
          'Location access denied. Please allow location access in your browser settings and try again.';
      } else if (err.message.includes('timeout') || err.message.includes('TIMEOUT')) {
        errorMessage = t('cropRecommendation.locationTimeout') || 
          'Location request timed out. Please ensure GPS is enabled on your device and try again.';
      } else if (err.message.includes('UNAVAILABLE') || err.message.includes('unavailable')) {
        errorMessage = t('cropRecommendation.locationUnavailable') || 
          'Location information is unavailable. Please check your device GPS settings.';
      } else {
        errorMessage = t('cropRecommendation.autoDetectError') || 
          `Could not automatically detect your location: ${err.message}. Please use the buttons below to set your location manually.`;
      }
      
      setError(errorMessage);
    } finally {
      setLocationLoading(false);
    }
  };

  // Get IP-based location as fallback (with Apple-style accuracy reporting)
  const getIPLocation = async () => {
    try {
      // Attempting IP-based location detection (Apple-style fallback)
      
      // Try multiple IP geolocation services for better accuracy
      const services = [
        'https://ipapi.co/json/',
        'https://ip-api.com/json/',
        'https://api.ipgeolocation.io/ipgeo?apiKey=free'
      ];
      
      for (const serviceUrl of services) {
        try {
          const response = await fetch(serviceUrl, {
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (!response.ok) continue;
          
          const data = await response.json();
          
          // Handle different response formats
          const lat = data.latitude || data.lat;
          const lng = data.longitude || data.lon || data.lng;
          
          if (lat && lng) {
            // IP-based location obtained (Apple-style)
              latitude: parseFloat(lat).toFixed(6),
              longitude: parseFloat(lng).toFixed(6),
              city: data.city || data.city_name,
              region: data.region || data.region_name || data.state,
              country: data.country_name || data.country,
              service: serviceUrl.includes('ipapi') ? 'ipapi.co' : serviceUrl.includes('ip-api') ? 'ip-api.com' : 'ipgeolocation.io'
            });
            
            return {
              coords: {
                latitude: parseFloat(lat),
                longitude: parseFloat(lng),
                accuracy: 5000 // IP-based location is less accurate (~5km)
              },
              timestamp: Date.now(),
              source: 'ip'
            };
          }
        } catch (serviceError) {
          console.warn(`⚠️ Service ${serviceUrl} failed, trying next...`);
          continue;
        }
      }
      
      throw new Error('All IP location services failed');
    } catch (err) {
      console.error('❌ IP location failed:', err);
      throw new Error('Could not determine location from IP address');
    }
  };

  // Get user's current location with high accuracy GPS (Apple-style precision), with IP fallback
  const getCurrentLocation = async () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        // Geolocation not supported, trying IP-based location
        getIPLocation()
          .then(resolve)
          .catch(reject);
        return;
      }

        // Requesting GPS location with Apple-style high accuracy

      let watchId;
      let timeoutId;
      let startTime = Date.now();

      // Set timeout for the entire operation
      timeoutId = setTimeout(() => {
        if (watchId !== undefined) {
          navigator.geolocation.clearWatch(watchId);
        }
        // GPS timeout, trying IP-based location as fallback
        getIPLocation()
          .then(resolve)
          .catch(() => {
            reject(new Error('Location request timed out. Please ensure GPS is enabled and try again.'));
          });
      }, 25000); // 25 second timeout

      // Try getCurrentPosition first (faster)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = position.coords;
          
          // Validate coordinates
          if (!coords.latitude || !coords.longitude || 
              isNaN(coords.latitude) || isNaN(coords.longitude) ||
              coords.latitude < -90 || coords.latitude > 90 ||
              coords.longitude < -180 || coords.longitude > 180) {
            // Invalid GPS coordinates, trying IP-based location
            clearTimeout(timeoutId);
            getIPLocation()
              .then(resolve)
              .catch(() => reject(new Error('Invalid GPS coordinates received.')));
            return;
          }

          // Check accuracy - if accuracy is poor (>500m), use watchPosition for better reading
          if (coords.accuracy && coords.accuracy > 500) {
            // Initial GPS accuracy is poor, using watchPosition for better accuracy
            // Don't clear timeout, let watchPosition handle it
            // Continue to watchPosition fallback
          } else {
            clearTimeout(timeoutId);
            console.log('✅ GPS Location obtained (high accuracy):', {
              latitude: coords.latitude.toFixed(6),
              longitude: coords.longitude.toFixed(6),
              accuracy: coords.accuracy ? `${coords.accuracy.toFixed(0)}m` : 'unknown',
              altitude: coords.altitude ? `${coords.altitude.toFixed(0)}m` : 'unknown',
              heading: coords.heading || 'unknown',
              speed: coords.speed ? `${coords.speed.toFixed(2)} m/s` : 'unknown'
            });

            // Set location state
            setLocation({
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              timestamp: position.timestamp,
              source: 'gps'
            });

            resolve(position);
            return; // Exit early if we have good accuracy
          }
        },
        (error) => {
          console.log('⚠️ getCurrentPosition failed, trying watchPosition for better accuracy...');
          
          watchId = navigator.geolocation.watchPosition(
            (position) => {
              const coords = position.coords;
              const elapsed = Date.now() - startTime;
              
              // Validate coordinates first
              if (!coords.latitude || !coords.longitude || 
                  isNaN(coords.latitude) || isNaN(coords.longitude) ||
                  coords.latitude < -90 || coords.latitude > 90 ||
                  coords.longitude < -180 || coords.longitude > 180) {
                return; // Skip invalid coordinates
              }
              
              // Accept if accuracy is good (less than 50m) or if we've waited 12 seconds
              // Prefer better accuracy but don't wait forever
              const hasGoodAccuracy = coords.accuracy && coords.accuracy < 50;
              const hasAcceptableAccuracy = coords.accuracy && coords.accuracy < 200;
              const hasWaitedLongEnough = elapsed > 12000;
              
              if (hasGoodAccuracy || (hasAcceptableAccuracy && elapsed > 8000) || hasWaitedLongEnough) {
                clearTimeout(timeoutId);
                navigator.geolocation.clearWatch(watchId);
                
                console.log('✅ GPS location obtained:', {
                  latitude: coords.latitude.toFixed(6),
                  longitude: coords.longitude.toFixed(6),
                  accuracy: coords.accuracy ? `${coords.accuracy.toFixed(0)}m` : 'unknown',
                  method: hasGoodAccuracy ? 'high accuracy' : hasAcceptableAccuracy ? 'acceptable accuracy' : 'best available',
                  waitTime: `${(elapsed / 1000).toFixed(1)}s`
                });

                setLocation({
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  accuracy: coords.accuracy,
                  timestamp: position.timestamp,
                  source: 'gps'
                });

                resolve(position);
              }
            },
            (watchError) => {
              clearTimeout(timeoutId);
              if (watchId !== undefined) {
                navigator.geolocation.clearWatch(watchId);
              }
              
              console.log('⚠️ GPS watchPosition failed, trying IP-based location as fallback...');
              getIPLocation()
                .then(resolve)
                .catch(() => {
                  let errorMessage = 'Unable to get your location. ';
                  switch (watchError.code) {
                    case watchError.PERMISSION_DENIED:
                      errorMessage += 'Please allow location access in your browser settings.';
                      break;
                    case watchError.POSITION_UNAVAILABLE:
                      errorMessage += 'Location information is unavailable. Please check your GPS settings.';
                      break;
                    case watchError.TIMEOUT:
                      errorMessage += 'Location request timed out. Please ensure GPS is enabled.';
                      break;
                    default:
                      errorMessage += watchError.message || 'Unknown error occurred.';
                      break;
                  }
                  
                  console.error('❌ Geolocation error:', watchError);
                  reject(new Error(errorMessage));
                });
            },
            {
              enableHighAccuracy: true, // Use GPS if available
              timeout: 30000, // 30 second timeout per attempt - give more time for better accuracy
              maximumAge: 0 // Don't use cached position - always get fresh GPS reading
            }
          );
        },
        {
          enableHighAccuracy: true, // Request GPS-level accuracy (Apple-style precision)
          timeout: 20000, // 20 second timeout - give more time for better accuracy
          maximumAge: 0, // Don't use cached position - get fresh GPS reading
          // Additional options for better accuracy (similar to Apple's Core Location)
          // These are handled by the browser's geolocation API
        }
      );
    });
  };

  // Search for location
  const handleLocationSearch = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      // Use backend API for forward geocoding to avoid CORS issues
      const response = await api.get('/map/geocode', {
        params: {
          query: query,
          language: 'en'
        }
      });
      
      if (response.data && response.data.success && response.data.results.length > 0) {
        const results = response.data.results.map(result => ({
          display_name: result.display_name,
          lat: result.latitude,
          lon: result.longitude,
          address: result.address
        }));
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle location selection from search
  const handleLocationSelect = async (selectedLocation) => {
    if (selectedLocation) {
      setLocation({ 
        latitude: selectedLocation.lat, 
        longitude: selectedLocation.lon,
        source: 'search'
      });
      setSearchQuery(selectedLocation.display_name);
      setSearchResults([]);
      setMapCenter([selectedLocation.lat, selectedLocation.lon]);
      setMapZoom(14);
      setMapReady(true);
      await fetchCompleteData(selectedLocation.lat, selectedLocation.lon);
    }
  };

  // Fetch complete location data (latitude, longitude, weather, temperature, rainfall, pH, soilType)
  // Optionally accepts pre-fetched locationInfo to avoid duplicate API calls
  const fetchCompleteData = async (latitude, longitude, preFetchedLocationInfo = null) => {
    setLoading(true);
    setError(null);

    try {
      // Ensure latitude and longitude are numbers
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Invalid GPS coordinates');
      }
      
      console.log('📡 Fetching environmental data for GPS coordinates:', { 
        latitude: lat.toFixed(6), 
        longitude: lng.toFixed(6) 
      });
      
      // Ensure location state is set
      if (!location || location.latitude !== lat || location.longitude !== lng) {
        setLocation({
          latitude: lat,
          longitude: lng,
          accuracy: location?.accuracy,
          source: location?.source || 'manual'
        });
      }
      
      // Update map center
      setMapCenter([lat, lng]);
      setMapZoom(14);
      setMapReady(true);
      
      // Fetch complete location data including all required fields
      const [locationResponse, recommendationsResponse] = await Promise.all([
        api.get('/gps/complete', {
          params: { 
            latitude: lat.toFixed(6), 
            longitude: lng.toFixed(6) 
          }
        }),
        api.get('/crops/recommend', {
          params: { 
            latitude: lat.toFixed(6), 
            longitude: lng.toFixed(6) 
          }
        })
      ]);

      console.log('✅ Location data received:', locationResponse.data);
      console.log('✅ Crop recommendations received:', recommendationsResponse.data);

      // Always fetch real-time address from GPS coordinates using Nominatim
      // This ensures we get accurate location data matching the actual GPS coordinates
      // Use pre-fetched locationInfo if provided (e.g., from map click)
      let locationInfo = preFetchedLocationInfo || {
        address: '',
        city: '',
        state: '',
        district: '',
        country: 'India',
        pincode: ''
      };
      
      // If not pre-fetched, fetch from Nominatim
      if (!preFetchedLocationInfo) {
        console.log('🌍 Fetching real-time address for GPS coordinates:', { lat, lng });
        
        try {
          // Use backend API for reverse geocoding to avoid CORS issues
          const nominatimResponse = await api.get('/map/reverse-geocode', {
            params: {
              latitude: lat,
              longitude: lng,
              language: 'en'
            }
          });
          
          // Response is already parsed by axios
          const nominatimData = nominatimResponse.data.address ? {
            display_name: nominatimResponse.data.address.display_name || nominatimResponse.data.address.formatted,
            address: nominatimResponse.data.address
          } : null;
          
          if (!nominatimData) {
            throw new Error('Failed to get address from API');
          }
          
          if (nominatimData && nominatimData.display_name) {
            console.log('✅ Real-time address fetched from Nominatim:', nominatimData.display_name);
            console.log('📍 Complete address details:', {
              address: nominatimData.display_name,
              city: nominatimData.address?.city || nominatimData.address?.town || nominatimData.address?.village,
              state: nominatimData.address?.state,
              district: nominatimData.address?.district || nominatimData.address?.county,
              country: nominatimData.address?.country
            });
            
            locationInfo = {
              address: nominatimData.display_name,
              city: nominatimData.address?.city || nominatimData.address?.town || nominatimData.address?.village || nominatimData.address?.municipality || '',
              state: nominatimData.address?.state || nominatimData.address?.region || '',
              district: nominatimData.address?.district || nominatimData.address?.county || nominatimData.address?.suburb || nominatimData.address?.municipality || '',
              country: nominatimData.address?.country || 'India',
              pincode: nominatimData.address?.postcode || ''
            };
          } else {
            console.warn('⚠️ Nominatim returned no data, using backend data as fallback');
            // Fallback to backend data if Nominatim fails
            if (locationResponse.data.success) {
              const data = locationResponse.data?.data || locationResponse.data;
              locationInfo = {
                address: data.location?.address || data.address || `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                city: data.location?.city || data.city || '',
                state: data.location?.state || data.state || '',
                district: data.location?.district || data.district || '',
                country: data.location?.country || data.country || 'India',
                pincode: data.location?.pincode || ''
              };
            }
          }
        } catch (nominatimError) {
          console.error('❌ Nominatim reverse geocoding failed:', nominatimError);
          // Fallback to backend data if Nominatim fails
          if (locationResponse.data.success) {
            const data = locationResponse.data?.data || locationResponse.data;
            locationInfo = {
              address: data.location?.address || data.address || `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              city: data.location?.city || data.city || '',
              state: data.location?.state || data.state || '',
              district: data.location?.district || data.district || '',
              country: data.location?.country || data.country || 'India',
              pincode: data.location?.pincode || ''
            };
          }
        }
      } else {
        console.log('✅ Using address already fetched from map click');
      }

      try {
        // Use backend API for reverse geocoding to avoid CORS issues
        const nominatimResponse = await api.get('/map/reverse-geocode', {
          params: {
            latitude: lat,
            longitude: lng,
            language: 'en'
          }
        });
        
        if (!nominatimResponse.data || !nominatimResponse.data.success) {
          throw new Error('Failed to get address from API');
        }
        
        const nominatimData = {
          display_name: nominatimResponse.data.address.display_name || nominatimResponse.data.address.formatted,
          address: nominatimResponse.data.address
        };
        
        if (nominatimData && nominatimData.display_name) {
          console.log('✅ Real-time address fetched from Nominatim:', nominatimData.display_name);
          console.log('📍 Complete address details:', {
            address: nominatimData.display_name,
            city: nominatimData.address?.city || nominatimData.address?.town || nominatimData.address?.village,
            state: nominatimData.address?.state,
            district: nominatimData.address?.county || nominatimData.address?.district,
            country: nominatimData.address?.country
          });
          
          locationInfo = {
            address: nominatimData.display_name,
            city: nominatimData.address?.city || nominatimData.address?.town || nominatimData.address?.village || nominatimData.address?.municipality || '',
            state: nominatimData.address?.state || nominatimData.address?.region || '',
            district: nominatimData.address?.district || nominatimData.address?.county || nominatimData.address?.suburb || nominatimData.address?.municipality || '',
            country: nominatimData.address?.country || 'India',
            pincode: nominatimData.address?.postcode || ''
          };
        } else {
          console.warn('⚠️ Nominatim returned no data, using backend data as fallback');
          // Fallback to backend data if Nominatim fails
          const data = locationResponse.data?.data || locationResponse.data;
          locationInfo = {
            address: data.location?.address || data.address || `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            city: data.location?.city || data.city || '',
            state: data.location?.state || data.state || '',
            district: data.location?.district || data.district || '',
            country: data.location?.country || data.country || 'India',
            pincode: data.location?.pincode || ''
          };
        }
      } catch (nominatimError) {
        console.error('❌ Nominatim reverse geocoding failed:', nominatimError);
        // Fallback to backend data if Nominatim fails
        if (locationResponse.data.success) {
          const data = locationResponse.data?.data || locationResponse.data;
          locationInfo = {
            address: data.location?.address || data.address || `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            city: data.location?.city || data.city || '',
            state: data.location?.state || data.state || '',
            district: data.location?.district || data.district || '',
            country: data.location?.country || data.country || 'India',
            pincode: data.location?.pincode || ''
          };
        }
      }
      
      if (locationResponse.data.success) {
        const data = locationResponse.data?.data || locationResponse.data;
        
        // Ensure all required fields are present with GPS coordinates
        const completeData = {
          location: {
            latitude: lat, // Use the GPS coordinates we received
            longitude: lng, // Use the GPS coordinates we received
            address: locationInfo.address,
            city: locationInfo.city,
            state: locationInfo.state,
            district: locationInfo.district,
            country: locationInfo.country,
            pincode: locationInfo.pincode
          },
          weather: {
            temperature: data.temperature || data.weather?.temperature || data.weather?.temp || 'N/A',
            rainfall: data.rainfall || data.weather?.rainfall || data.weather?.precipitation || 0,
            humidity: data.humidity || data.weather?.humidity || 'N/A',
            conditions: data.weather?.conditions || data.weather?.description || 'N/A',
            ...data.weather
          },
          soil: {
            type: data.soilType || data.soil?.type || data.soil?.soilType || 'Unknown',
            ph: data.ph || data.pH || data.soil?.ph || data.soil?.pH || 'N/A',
            organicMatter: data.soil?.organicMatter || data.soil?.organic_matter || 'N/A',
            drainage: data.soil?.drainage || 'N/A',
            ...data.soil
          }
        };

        console.log('✅ Complete location data prepared:', {
          coordinates: `${completeData.location.latitude.toFixed(6)}, ${completeData.location.longitude.toFixed(6)}`,
          address: completeData.location.address,
          city: completeData.location.city,
          state: completeData.location.state,
          district: completeData.location.district,
          location: `${completeData.location.city || ''} ${completeData.location.state || ''}`.trim() || 'Unknown',
          temperature: completeData.weather.temperature,
          rainfall: completeData.weather.rainfall,
          soilType: completeData.soil.type,
          pH: completeData.soil.ph
        });

        setLocationData(completeData);
      }

      if (recommendationsResponse.data.success) {
        const recData = recommendationsResponse.data?.data || recommendationsResponse.data;
        // Handle both old and new response formats
        let cropsToSet = [];
        if (recData?.recommendations) {
          cropsToSet = recData.recommendations;
        } else if (Array.isArray(recData)) {
          cropsToSet = recData;
        } else if (Array.isArray(recommendationsResponse.data.data)) {
          cropsToSet = recommendationsResponse.data.data;
        }
        
        // Format crops to ensure they have required fields
        const formattedCrops = cropsToSet.map(crop => ({
          ...crop,
          score: crop.suitability || crop.score || 70,
          yield: crop.estimatedYield || crop.yield || crop.expectedYield,
          name: crop.name || 'Unknown Crop',
          season: crop.season || 'Various',
          duration: crop.duration || '90-120 days'
        }));
        
        setRecommendations(formattedCrops);
        
        // Set market prices and diseases from response if available
        if (recData.marketPrices) {
          setMarketPrices(recData.marketPrices);
        }
        if (recData.diseases) {
          setDiseases(recData.diseases);
        }
      } else {
        // If API fails, use fallback recommendations based on location
        console.log('⚠️ Using fallback crop recommendations');
        const fallbackCrops = getFallbackCropsForLocation(lat, lng);
        setRecommendations(fallbackCrops);
      }
      
      // Fetch market prices and diseases separately if not in response
      try {
        const [marketResponse, diseasesResponse] = await Promise.all([
          api.get('/crops/market-prices', {
            params: { state: locationData?.location?.state, limit: 10 }
          }).catch(() => ({ data: { success: false } })),
          api.get('/crops/diseases', {
            params: { state: locationData?.location?.state, limit: 5 }
          }).catch(() => ({ data: { success: false } }))
        ]);
        
        if (marketResponse.data.success && marketResponse.data.prices) {
          setMarketPrices(marketResponse.data.prices);
        }
        if (diseasesResponse.data.success && diseasesResponse.data.diseases) {
          setDiseases(diseasesResponse.data.diseases);
        }
      } catch (err) {
        console.warn('Error fetching market prices or diseases:', err);
        // Continue without them
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      
      // Try emergency API as fallback
      try {
        console.log('🆘 Trying emergency API fallback...');
        const emergencyResponse = await api.post('/crops/emergency-recommend', {
          latitude: latitude,
          longitude: longitude
        });
        
        if (emergencyResponse.data.success) {
          console.log('✅ Emergency API succeeded');
          const recData = emergencyResponse.data;
          if (recData.recommendations) {
            // Format emergency API response to match expected structure
            const formattedRecs = recData.recommendations.map(crop => ({
              ...crop,
              score: crop.suitability || crop.score || 70,
              yield: crop.estimatedYield || crop.yield,
              name: crop.name || 'Unknown Crop'
            }));
            setRecommendations(formattedRecs);
          }
          if (recData.environmentalData) {
            setLocationData({
              location: {
                latitude: recData.environmentalData.latitude,
                longitude: recData.environmentalData.longitude,
                address: recData.environmentalData.location?.state || 'Unknown',
                state: recData.environmentalData.location?.state || 'Unknown',
                district: recData.environmentalData.location?.district || 'Unknown'
              },
              weather: {
                temperature: recData.environmentalData.temperature,
                rainfall: recData.environmentalData.rainfall,
                humidity: 'N/A'
              },
              soil: {
                ph: recData.environmentalData.ph,
                type: recData.environmentalData.soilType
              }
            });
          }
          setError(null); // Clear error since fallback worked
          return; // Exit early since fallback succeeded
        }
      } catch (emergencyErr) {
        console.error('Emergency API also failed:', emergencyErr);
      }
      
      setError(err.response?.data?.error || err.message || t('cropRecommendation.fetchError') || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Manual location input
  const handleManualLocation = async () => {
    const lat = parseFloat(prompt(t('cropRecommendation.enterLatitude') || 'Enter Latitude:'));
    const lon = parseFloat(prompt(t('cropRecommendation.enterLongitude') || 'Enter Longitude:'));

    if (isNaN(lat) || isNaN(lon)) {
      setError(t('cropRecommendation.invalidCoordinates') || 'Invalid coordinates');
      return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setError(t('cropRecommendation.invalidRange') || 'Coordinates out of valid range');
      return;
    }

    setLocation({ latitude: lat, longitude: lon });
    await fetchCompleteData(lat, lon);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getSoilTypeColor = (type) => {
    const colors = {
      alluvial: 'primary',
      black: 'default',
      red: 'error',
      laterite: 'warning',
      desert: 'secondary',
      mountain: 'info'
    };
    return colors[type?.toLowerCase()] || 'default';
  };

  // Get fallback crop recommendations based on location
  const getFallbackCropsForLocation = (lat, lng) => {
    // Basic fallback crops for India
    const fallbackCrops = [
      {
        name: 'Rice',
        score: 75,
        suitability: 75,
        season: 'Kharif',
        duration: '120-150 days',
        yield: '4-6 tons/hectare',
        estimatedYield: '4-6 tons/hectare'
      },
      {
        name: 'Wheat',
        score: 70,
        suitability: 70,
        season: 'Rabi',
        duration: '100-120 days',
        yield: '3-5 tons/hectare',
        estimatedYield: '3-5 tons/hectare'
      },
      {
        name: 'Maize',
        score: 68,
        suitability: 68,
        season: 'Kharif',
        duration: '90-100 days',
        yield: '2-4 tons/hectare',
        estimatedYield: '2-4 tons/hectare'
      },
      {
        name: 'Cotton',
        score: 65,
        suitability: 65,
        season: 'Kharif',
        duration: '150-180 days',
        yield: '400-600 kg/hectare',
        estimatedYield: '400-600 kg/hectare'
      },
      {
        name: 'Sugarcane',
        score: 72,
        suitability: 72,
        season: 'Year-round',
        duration: '10-12 months',
        yield: '60-80 tons/hectare',
        estimatedYield: '60-80 tons/hectare'
      }
    ];
    return fallbackCrops;
  };

  // Map click handler component
  const MapClickHandler = ({ onMapClick }) => {
    useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        onMapClick(lat, lng);
      },
    });
    return null;
  };

  // Location marker component
  const LocationMarker = ({ location, accuracy }) => {
    if (!location || !location.latitude || !location.longitude) return null;

    const customIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2e7d32" width="40" height="40">
          <circle cx="12" cy="12" r="10" fill="#2e7d32" opacity="0.3"/>
          <circle cx="12" cy="12" r="6" fill="#2e7d32"/>
          <circle cx="12" cy="12" r="2" fill="white"/>
        </svg>
      `),
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });

    return (
      <>
        <Marker
          position={[location.latitude, location.longitude]}
          icon={customIcon}
        >
          <Popup>
            <div>
              <strong>Your Location</strong>
              <br />
              <small>
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </small>
              {accuracy && (
                <>
                  <br />
                  <small>Accuracy: ±{accuracy.toFixed(0)}m</small>
                </>
              )}
              {location.source && (
                <>
                  <br />
                  <small>Source: {location.source === 'gps' ? 'GPS' : location.source === 'ip' ? 'IP-based' : location.source === 'map' ? 'Map' : 'Search'}</small>
                </>
              )}
            </div>
          </Popup>
        </Marker>
        {accuracy && accuracy < 5000 && (
          <Circle
            center={[location.latitude, location.longitude]}
            radius={accuracy}
            pathOptions={{
              color: location.source === 'gps' ? '#2e7d32' : '#ff6f00',
              fillColor: location.source === 'gps' ? '#2e7d32' : '#ff6f00',
              fillOpacity: 0.1,
              weight: 2
            }}
          />
        )}
      </>
    );
  };

  // Handle map click to select location - fetch address from map coordinates
  const handleMapClick = async (lat, lng) => {
    try {
      setLocationLoading(true);
      setError(null);
      setAutoDetected(false);
      
      console.log('🗺️ Map location clicked:', { lat, lng });
      
      // First, fetch address from Nominatim based on map coordinates
      let locationInfo = {
        address: '',
        city: '',
        state: '',
        district: '',
        country: 'India',
        pincode: ''
      };

      try {
        console.log('🌍 Fetching address for map coordinates from backend API...');
        const nominatimResponse = await api.get('/map/reverse-geocode', {
          params: {
            latitude: lat,
            longitude: lng,
            language: 'en'
          }
        });
        
        if (nominatimResponse.data && nominatimResponse.data.success) {
            const nominatimData = {
              display_name: nominatimResponse.data.address.display_name || nominatimResponse.data.address.formatted,
              address: nominatimResponse.data.address
            };
          
          if (nominatimData && nominatimData.display_name) {
            console.log('✅ Address fetched from map coordinates:', nominatimData.display_name);
            console.log('📍 Address details:', {
              address: nominatimData.display_name,
              city: nominatimData.address?.city || nominatimData.address?.town || nominatimData.address?.village,
              state: nominatimData.address?.state,
              district: nominatimData.address?.county || nominatimData.address?.district
            });
            
            locationInfo = {
              address: nominatimData.display_name,
              city: nominatimData.address?.city || nominatimData.address?.town || nominatimData.address?.village || nominatimData.address?.municipality || '',
              state: nominatimData.address?.state || nominatimData.address?.region || '',
              district: nominatimData.address?.district || nominatimData.address?.county || nominatimData.address?.suburb || nominatimData.address?.municipality || '',
              country: nominatimData.address?.country || 'India',
              pincode: nominatimData.address?.postcode || ''
            };
          }
        }
      } catch (nominatimError) {
        console.error('❌ Nominatim reverse geocoding failed:', nominatimError);
      }
      
      // Update location state with map coordinates
      setLocation({
        latitude: lat,
        longitude: lng,
        accuracy: null,
        source: 'map'
      });
      
      setMapCenter([lat, lng]);
      setMapZoom(14);
      
      // Fetch complete data (weather, soil, recommendations)
      // Pass the locationInfo so it can be used in fetchCompleteData to avoid duplicate API calls
      await fetchCompleteData(lat, lng, locationInfo);
      
      setAutoDetected(true);
      console.log('✅ Map location selected and address fetched successfully:', {
        address: locationInfo.address,
        city: locationInfo.city,
        state: locationInfo.state,
        district: locationInfo.district
      });
    } catch (err) {
      console.error('Map click error:', err);
      setError(err.message || 'Failed to fetch data for selected location');
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
          {t('cropRecommendation.title') || 'Crop Recommendation'}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t('cropRecommendation.description') || 'Get personalized crop recommendations based on your location, weather, and soil conditions'}
        </Typography>

        {/* Location Search Bar and Action Buttons */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={8}>
              <Autocomplete
                freeSolo
                options={searchResults}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.display_name}
                loading={searchLoading}
                onInputChange={(event, newInputValue) => {
                  setSearchQuery(newInputValue);
                  handleLocationSearch(newInputValue);
                }}
                onChange={(event, newValue) => {
                  if (newValue && typeof newValue !== 'string') {
                    handleLocationSelect(newValue);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('cropRecommendation.searchLocation') || 'Search Location'}
                    placeholder={t('cropRecommendation.searchPlaceholder') || 'Enter city, state, or address...'}
                    variant="outlined"
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography>{option.display_name}</Typography>
                  </Box>
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={locationLoading ? <CircularProgress size={20} color="inherit" /> : <MyLocation />}
                  onClick={async () => {
                    try {
                      setLocationLoading(true);
                      setError(null);
                      setAutoDetected(false);
                      const position = await getCurrentLocation();
                      const lat = position.coords.latitude;
                      const lng = position.coords.longitude;
                      await fetchCompleteData(lat, lng);
                      setAutoDetected(true);
                    } catch (err) {
                      console.error('Location detection error:', err);
                      setError(err.message || 'Failed to detect location');
                    } finally {
                      setLocationLoading(false);
                    }
                  }}
                  disabled={locationLoading || loading}
                  fullWidth
                  sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
                >
                  {locationLoading
                    ? (t('cropRecommendation.gettingLocation') || 'Getting Location...')
                    : (t('cropRecommendation.useCurrentLocation') || 'Use Current Location')}
                </Button>
              </Box>
            </Grid>
          </Grid>

          {location && (
            <Box mt={2} p={2} sx={{ bgcolor: 'background.default', borderRadius: 1 }}>
              <Box display="flex" alignItems="center" mb={1}>
                <MyLocation color="primary" sx={{ mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                  {autoDetected 
                    ? (location.source === 'gps' 
                        ? (t('cropRecommendation.gpsDetected') || '📍 GPS Location Detected')
                        : location.source === 'ip'
                        ? (t('cropRecommendation.ipLocationDetected') || '🌐 IP Location Detected')
                        : (t('cropRecommendation.mapLocationSelected') || '🗺️ Map Location Selected'))
                    : (t('cropRecommendation.currentLocation') || 'Current Location')}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Typography variant="body2" color="text.secondary" component="span">
                  <strong>{t('cropRecommendation.coordinates') || 'Coordinates'}:</strong>{' '}
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Typography>
                {location.source && (
                  <Chip 
                    label={location.source === 'gps' ? 'GPS' : location.source === 'ip' ? 'IP-based' : 'Map'} 
                    size="small" 
                    color={location.source === 'gps' ? 'success' : location.source === 'ip' ? 'warning' : 'info'}
                    sx={{ height: 20 }}
                  />
                )}
              </Box>
              {location.accuracy && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  <strong>{t('cropRecommendation.accuracy') || 'Accuracy'}:</strong>{' '}
                  ±{location.accuracy.toFixed(0)} {t('cropRecommendation.meters') || 'meters'}
                  {location.source === 'ip' && (
                    <Typography component="span" variant="caption" sx={{ ml: 1, color: 'warning.main' }}>
                      (IP-based, less accurate)
                    </Typography>
                  )}
                </Typography>
              )}
              {locationData?.location?.address && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  <strong>{t('cropRecommendation.address') || 'Address'}:</strong>{' '}
                  {locationData.location.address}
                </Typography>
              )}
              {locationData?.location?.city && locationData?.location?.state && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {locationData.location.city}, {locationData.location.state}
                  {locationData.location.district && `, ${locationData.location.district}`}
                </Typography>
              )}
            </Box>
          )}
        </Paper>

        {/* Interactive Map */}
        {mapReady && location && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <MyLocation color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">
                {t('cropRecommendation.interactiveMap') || 'Interactive Map'}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="body2" color="text.secondary">
                {t('cropRecommendation.mapInstructions') || 'Click on the map to select a location, or use the detected location marker'}
              </Typography>
              {location && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<MyLocation />}
                  onClick={async () => {
                    try {
                      setLocationLoading(true);
                      setError(null);
                      setAutoDetected(false);
                      const position = await getCurrentLocation();
                      const lat = position.coords.latitude;
                      const lng = position.coords.longitude;
                      await fetchCompleteData(lat, lng);
                      setAutoDetected(true);
                    } catch (err) {
                      console.error('Location refresh error:', err);
                      setError(err.message || 'Failed to refresh location');
                    } finally {
                      setLocationLoading(false);
                    }
                  }}
                  disabled={locationLoading}
                  sx={{ ml: 2 }}
                >
                  {locationLoading ? 'Refreshing...' : 'Refresh Location'}
                </Button>
              )}
            </Box>
            <Box sx={{ height: '400px', width: '100%', borderRadius: 2, overflow: 'hidden' }}>
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                zoomControl={true}
                key={`map-${mapCenter[0]}-${mapCenter[1]}-${location.latitude}-${location.longitude}`}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Map data &copy; Apple'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Map click handler */}
                <MapClickHandler onMapClick={handleMapClick} />
                
                {/* Location marker */}
                <LocationMarker location={location} accuracy={location.accuracy} />
              </MapContainer>
            </Box>
          </Paper>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress />
            <Typography variant="body2" align="center" sx={{ mt: 2 }}>
              {t('cropRecommendation.analyzing') || 'Analyzing location data and generating recommendations...'}
            </Typography>
          </Box>
        )}

        {/* Complete Location Data Display */}
        {locationData && !loading && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Location Info */}
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: 'background.paper', height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <LocationOn color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      {t('cropRecommendation.location') || 'Location'}
                    </Typography>
                  </Box>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <MyLocation color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('cropRecommendation.gpsCoordinates') || 'GPS Coordinates'}
                        secondary={`${(locationData.location?.latitude || location?.latitude || 0).toFixed(6)}, ${(locationData.location?.longitude || location?.longitude || 0).toFixed(6)}`}
                      />
                    </ListItem>
                    {location?.accuracy && (
                      <ListItem>
                        <ListItemIcon>
                          <Info color="action" />
                        </ListItemIcon>
                        <ListItemText
                          primary={t('cropRecommendation.gpsAccuracy') || 'GPS Accuracy'}
                          secondary={`±${location.accuracy.toFixed(0)} ${t('cropRecommendation.meters') || 'meters'}`}
                        />
                      </ListItem>
                    )}
                    <ListItem>
                      <ListItemText
                        primary={t('cropRecommendation.latitude') || 'Latitude'}
                        secondary={locationData.location?.latitude?.toFixed(6) || location.latitude?.toFixed(6) || 'N/A'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={t('cropRecommendation.longitude') || 'Longitude'}
                        secondary={locationData.location?.longitude?.toFixed(6) || location.longitude?.toFixed(6) || 'N/A'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={t('cropRecommendation.address') || 'Address'}
                        secondary={locationData.location?.address || t('cropRecommendation.notAvailable') || 'N/A'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={t('cropRecommendation.city') || 'City'}
                        secondary={locationData.location?.city || t('cropRecommendation.notAvailable') || 'N/A'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={t('cropRecommendation.state') || 'State'}
                        secondary={locationData.location?.state || t('cropRecommendation.notAvailable') || 'N/A'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={t('cropRecommendation.district') || 'District'}
                        secondary={locationData.location?.district || t('cropRecommendation.notAvailable') || 'N/A'}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Weather Info */}
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: 'background.paper', height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Cloud color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      {t('cropRecommendation.weather') || 'Weather'}
                    </Typography>
                  </Box>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Thermostat color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('cropRecommendation.temperature') || 'Temperature'}
                        secondary={`${locationData.weather?.temperature || 'N/A'}°C`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <WaterDrop color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('cropRecommendation.rainfall') || 'Rainfall'}
                        secondary={`${locationData.weather?.rainfall || 0} mm`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <WaterDrop color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('cropRecommendation.humidity') || 'Humidity'}
                        secondary={`${locationData.weather?.humidity || 'N/A'}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={t('cropRecommendation.conditions') || 'Conditions'}
                        secondary={locationData.weather?.conditions || t('cropRecommendation.notAvailable') || 'N/A'}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Soil Info */}
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: 'background.paper', height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Grass color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      {t('cropRecommendation.soil') || 'Soil'}
                    </Typography>
                  </Box>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary={t('cropRecommendation.soilType') || 'Soil Type'}
                        secondary={
                          <Chip
                            label={locationData.soil?.type || t('cropRecommendation.notAvailable') || 'N/A'}
                            size="small"
                            color={getSoilTypeColor(locationData.soil?.type)}
                          />
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={t('cropRecommendation.pH') || 'pH Level'}
                        secondary={locationData.soil?.ph || t('cropRecommendation.notAvailable') || 'N/A'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={t('cropRecommendation.organicMatter') || 'Organic Matter'}
                        secondary={locationData.soil?.organicMatter || t('cropRecommendation.notAvailable') || 'N/A'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={t('cropRecommendation.drainage') || 'Drainage'}
                        secondary={locationData.soil?.drainage || t('cropRecommendation.notAvailable') || 'N/A'}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Crop Recommendations with Tabs */}
        {(recommendations || locationData || marketPrices.length > 0 || diseases.length > 0) && !loading && (
          <Paper sx={{ p: 3, bgcolor: 'background.paper' }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab 
                icon={<Agriculture />} 
                iconPosition="start"
                label={t('cropRecommendation.recommendedCrops') || 'Recommended Crops'} 
              />
              <Tab 
                icon={<MonetizationOn />} 
                iconPosition="start"
                label={t('cropRecommendation.marketPrices') || 'Market Prices'} 
              />
              <Tab 
                icon={<BugReport />} 
                iconPosition="start"
                label={t('cropRecommendation.commonDiseases') || 'Common Diseases'} 
              />
            </Tabs>

            {/* Tab Panel: Crop Recommendations */}
            {activeTab === 0 && (
              <>
                <Box display="flex" alignItems="center" mb={3}>
                  <Agriculture color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h5">
                    {t('cropRecommendation.recommendedCrops') || 'Recommended Crops'}
                  </Typography>
                </Box>

            {(() => {
              // Handle both array and nested object formats
              let cropsList = [];
              if (recommendations) {
                cropsList = Array.isArray(recommendations) 
                  ? recommendations 
                  : (recommendations?.recommendations || []);
              }
              
              // If no recommendations but we have location, use fallback
              if (cropsList.length === 0 && location && location.latitude && location.longitude) {
                cropsList = getFallbackCropsForLocation(location.latitude, location.longitude);
              }
              
              if (cropsList.length > 0) {
                return (
                  <Grid container spacing={3}>
                  {cropsList.map((crop, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card
                        sx={{
                          height: '100%',
                          cursor: 'pointer',
                          bgcolor: 'background.paper',
                          '&:hover': { boxShadow: 6, transform: 'translateY(-4px)', transition: 'all 0.3s' },
                          borderLeft: `4px solid ${
                            (crop.score || crop.suitability || 70) >= 80 ? '#4caf50' : (crop.score || crop.suitability || 70) >= 60 ? '#ff9800' : '#f44336'
                          }`
                        }}
                        onClick={() => {
                          setSelectedCrop(crop);
                          setDialogOpen(true);
                        }}
                      >
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                            <Typography variant="h6" component="div">
                              {crop.name}
                            </Typography>
                            <Chip
                              label={`${crop.score || crop.suitability || 70}%`}
                              color={getScoreColor(crop.score || crop.suitability || 70)}
                              size="small"
                            />
                          </Box>

                          <Box mb={2}>
                            <LinearProgress
                              variant="determinate"
                              value={crop.score || crop.suitability || 70}
                              color={getScoreColor(crop.score || crop.suitability || 70)}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>

                          <List dense>
                            {crop.season && (
                              <ListItem>
                                <ListItemIcon>
                                  <Info color="action" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={t('cropRecommendation.season') || 'Season'}
                                  secondary={Array.isArray(crop.season) ? crop.season.join(', ') : crop.season}
                                />
                              </ListItem>
                            )}
                            {crop.duration && (
                              <ListItem>
                                <ListItemIcon>
                                  <Info color="action" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={t('cropRecommendation.duration') || 'Duration'}
                                  secondary={`${crop.duration} ${t('cropRecommendation.days') || 'days'}`}
                                />
                              </ListItem>
                            )}
                            {(crop.yield || crop.estimatedYield) && (
                              <ListItem>
                                <ListItemIcon>
                                  <Info color="action" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={t('cropRecommendation.expectedYield') || 'Expected Yield'}
                                  secondary={crop.yield || crop.estimatedYield}
                                />
                              </ListItem>
                            )}
                          </List>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                );
              } else {
                return (
                  <Alert severity="info">
                    {t('cropRecommendation.noRecommendations') || 'No crop recommendations available for this location.'}
                  </Alert>
                );
              }
            })()}
              </>
            )}

            {/* Tab Panel: Market Prices */}
            {activeTab === 1 && (
              <>
                <Box display="flex" alignItems="center" mb={3}>
                  <MonetizationOn color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h5">
                    {t('cropRecommendation.marketPrices') || 'Market Prices'}
                  </Typography>
                </Box>
                {marketPrices.length === 0 ? (
                  <Alert severity="info">
                    {t('cropRecommendation.noMarketPrices') || 'No market prices available for your location.'}
                  </Alert>
                ) : (
                  <Grid container spacing={2}>
                    {marketPrices.map((price, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card sx={{ height: '100%' }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {price.commodity}
                            </Typography>
                            <Typography variant="h5" color="primary" gutterBottom>
                              {price.price}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {price.market}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {price.date}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </>
            )}

            {/* Tab Panel: Common Diseases */}
            {activeTab === 2 && (
              <>
                <Box display="flex" alignItems="center" mb={3}>
                  <BugReport color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h5">
                    {t('cropRecommendation.commonDiseases') || 'Common Diseases'}
                  </Typography>
                </Box>
                {diseases.length === 0 ? (
                  <Alert severity="info">
                    {t('cropRecommendation.noDiseases') || 'No disease information available for your region.'}
                  </Alert>
                ) : (
                  <Grid container spacing={2}>
                    {diseases.map((disease, index) => (
                      <Grid item xs={12} sm={6} key={index}>
                        <Card sx={{ bgcolor: '#fff8e1' }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {disease.name}
                            </Typography>
                            <Chip 
                              label={disease.crop} 
                              size="small" 
                              sx={{ mb: 1 }}
                            />
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Symptoms:</strong> {disease.symptoms}
                            </Typography>
                            <Typography variant="body2" color="success.main">
                              <strong>Treatment:</strong> {disease.treatment}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </>
            )}
          </Paper>
        )}

        {/* Crop Details Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          {selectedCrop && (
            <>
              <DialogTitle sx={{ bgcolor: 'background.paper' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h5">{selectedCrop.name}</Typography>
                  <Chip
                    label={`${t('cropRecommendation.suitability') || 'Suitability'}: ${selectedCrop.score}%`}
                    color={getScoreColor(selectedCrop.score)}
                  />
                </Box>
              </DialogTitle>
              <DialogContent sx={{ bgcolor: 'background.default' }}>
                <Box mb={2}>
                  <LinearProgress
                    variant="determinate"
                    value={selectedCrop.score}
                    color={getScoreColor(selectedCrop.score)}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Grid container spacing={2}>
                  {selectedCrop.season && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {t('cropRecommendation.season') || 'Season'}
                      </Typography>
                      <Typography variant="body1">
                        {Array.isArray(selectedCrop.season) ? selectedCrop.season.join(', ') : selectedCrop.season}
                      </Typography>
                    </Grid>
                  )}
                  {selectedCrop.duration && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {t('cropRecommendation.duration') || 'Duration'}
                      </Typography>
                      <Typography variant="body1">
                        {selectedCrop.duration} {t('cropRecommendation.days') || 'days'}
                      </Typography>
                    </Grid>
                  )}
                  {selectedCrop.yield && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {t('cropRecommendation.expectedYield') || 'Expected Yield'}
                      </Typography>
                      <Typography variant="body1">{selectedCrop.yield}</Typography>
                    </Grid>
                  )}
                </Grid>
              </DialogContent>
              <DialogActions sx={{ bgcolor: 'background.paper' }}>
                <Button onClick={() => setDialogOpen(false)}>
                  {t('common.close') || 'Close'}
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* Instructions */}
        {!location && !loading && (
          <Paper sx={{ p: 3, mt: 3, bgcolor: 'background.paper' }}>
            <Box display="flex" alignItems="start">
              <Info color="primary" sx={{ mr: 2, mt: 0.5 }} />
              <Box>
                <Typography variant="h6" gutterBottom>
                  {t('cropRecommendation.howItWorks') || 'How It Works'}
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={t('cropRecommendation.step1') || 'Click "Use Current Location" to automatically detect your location'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={t('cropRecommendation.step2') || 'We analyze your location to determine weather and soil conditions'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={t('cropRecommendation.step3') || 'Get personalized crop recommendations based on your specific conditions'}
                    />
                  </ListItem>
                </List>
              </Box>
            </Box>
          </Paper>
        )}
      </Container>
    );
  }
