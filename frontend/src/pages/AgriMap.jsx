import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  FormControlLabel,
  Switch,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  Tooltip,
  Fade
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Map as MapIcon,
  Agriculture as CropIcon,
  LocalFlorist as FarmIcon,
  WaterDrop as WaterIcon,
  Thermostat as TempIcon,
  Opacity as RainIcon,
  MyLocation as MyLocationIcon,
  Search as SearchIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  GpsFixed as GpsFixedIcon,
  Satellite as SatelliteIcon,
  Terrain as TerrainIcon,
  Info as InfoIcon,
  LegendToggle as LegendIcon,
  LocationSearching as LocationSearchingIcon,
  Place as PlaceIcon,
  PinDrop as PinDropIcon,
  CheckCircle as CheckCircleIcon,
  History as HistoryIcon,
  Room as RoomIcon,
  Business as BusinessIcon,
  MapOutlined as MapOutlinedIcon,
  Flag as FlagIcon,
  Landscape as LandscapeIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import logger from '../services/logger';

import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip as LeafletTooltip, ZoomControl, ScaleControl, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

L.Icon.Default = createDefaultIcon();


const AgriMap = () => {
  const { t, language } = useLanguage();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center
  const [mapZoom, setMapZoom] = useState(5);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState('streets');
  const [showSatellite, setShowSatellite] = useState(false);
  const [showSoil, setShowSoil] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showCrops, setShowCrops] = useState(true);
  const [showFarms, setShowFarms] = useState(true);
  
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [addressInfo, setAddressInfo] = useState(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [clickedLocation, setClickedLocation] = useState(null);
  const [recentAddresses, setRecentAddresses] = useState([]);
  
  const [cropData, setCropData] = useState([]);
  const [farmData, setFarmData] = useState([]);
  const [soilData, setSoilData] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [legendAnchor, setLegendAnchor] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  
  const mapRef = useRef();

  const getMockFarmData = useCallback((lat, lng) => {
    const farms = [];
    for (let i = 0; i < 20; i++) {
      const offsetLat = (Math.random() - 0.5) * 0.2;
      const offsetLng = (Math.random() - 0.5) * 0.2;
      
      farms.push({
        id: `farm-${i}`,
        name: `Farm ${i + 1}`,
        type: ['organic', 'conventional', 'mixed', 'dairy', 'poultry'][i % 5],
        size: Math.floor(Math.random() * 100) + 10,
        location: [lat + offsetLat, lng + offsetLng],
        crops: ['Wheat', 'Rice', 'Maize', 'Vegetables', 'Fruits'][i % 5],
        owner: `Farmer ${String.fromCharCode(65 + i)}`,
        status: ['active', 'inactive', 'expanding'][i % 3],
        soilHealth: Math.floor(Math.random() * 100),
        irrigation: ['well', 'canal', 'rainfed', 'drip'][i % 4]
      });
    }
    return farms;
  }, []);

  const getMockSoilData = useCallback((lat, lng) => {
    const soilPoints = [];
    for (let i = 0; i < 15; i++) {
      const offsetLat = (Math.random() - 0.5) * 0.3;
      const offsetLng = (Math.random() - 0.5) * 0.3;
      
      soilPoints.push({
        id: `soil-${i}`,
        location: [lat + offsetLat, lng + offsetLng],
        type: ['alluvial', 'black', 'red', 'laterite', 'sandy'][i % 5],
        ph: 6 + Math.random() * 2,
        moisture: Math.floor(Math.random() * 100),
        nutrients: {
          nitrogen: Math.floor(Math.random() * 100),
          phosphorus: Math.floor(Math.random() * 100),
          potassium: Math.floor(Math.random() * 100)
        },
        organicMatter: Math.floor(Math.random() * 100)
      });
    }
    return soilPoints;
  }, []);

  const getMockCropData = useCallback(() => {
    return [
      {
        id: 'wheat-zone',
        name: 'Wheat',
        location: [30.7333, 76.7794],
        area: '5000 hectares',
        season: 'Rabi',
        suitability: 90,
        color: '#FFD700'
      },
      {
        id: 'rice-zone',
        name: 'Rice',
        location: [26.8467, 80.9462],
        area: '8000 hectares',
        season: 'Kharif',
        suitability: 85,
        color: '#228B22'
      }
    ];
  }, []);

  const getWeatherData = useCallback(async (lat, lng) => {
    try {
      const response = await api.get('/gps/complete', {
        params: { 
          latitude: lat.toString(), 
          longitude: lng.toString() 
        }
      });
      
      if (response.data && response.data.success && (response.data.data || response.data)) {
        const data = response.data.data || response.data;
        return {
          temperature: data.temperature || data.weather?.temperature || 25,
          humidity: data.humidity || data.weather?.humidity || 60,
          precipitation: data.rainfall || data.weather?.rainfall || 0,
          windSpeed: data.weather?.windSpeed || 10,
          condition: data.weather?.conditions || data.weather?.description || 'Clear',
          lastUpdated: new Date().toISOString()
        };
      }
    } catch (error) {
    }
    
    return {
      temperature: 25 + Math.random() * 10,
      humidity: 60 + Math.random() * 30,
      precipitation: Math.random() * 100,
      windSpeed: 5 + Math.random() * 15,
      condition: ['Clear', 'Partly Cloudy', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 4)],
      lastUpdated: new Date().toISOString()
    };
  }, []);

  const loadMapData = useCallback(async (latitude, longitude) => {
    try {
      setMapLoading(true);
      
      const [weatherRes, cropRes, soilRes] = await Promise.allSettled([
        api.get('/weather/current', {
          params: { lat: latitude, lng: longitude }
        }).catch(() => getWeatherData(latitude, longitude)),
        
        api.get('/crops/recommend', {
          params: { latitude, longitude }
        }).catch(() => ({ data: { recommendations: getMockCropData() } })),
        
        api.get('/gps/complete', {
          params: { latitude: latitude.toString(), longitude: longitude.toString() }
        }).catch(() => ({ data: { soil: getMockSoilData(latitude, longitude)[0] } }))
      ]);
      
      if (weatherRes.status === 'fulfilled') {
        const weather = weatherRes.value?.data?.data || weatherRes.value;
        setWeatherData({
          temperature: weather.temperature || weather.temp || 25,
          humidity: weather.humidity || 60,
          precipitation: weather.rainfall || weather.precipitation || 0,
          windSpeed: weather.windSpeed || 10,
          condition: weather.condition || weather.weather || 'Clear',
          lastUpdated: new Date().toISOString()
        });
      } else {
        const weatherResponse = await getWeatherData(latitude, longitude);
        setWeatherData(weatherResponse);
      }
      
      if (cropRes.status === 'fulfilled' && cropRes.value?.data?.recommendations) {
        const recommendations = cropRes.value.data.recommendations;
        const realCropData = recommendations.slice(0, 10).map((rec, idx) => ({
          id: `crop-${idx}`,
          name: rec.crop_name || rec.name || rec.crop || 'Unknown',
          location: [latitude + (Math.random() - 0.5) * 0.1, longitude + (Math.random() - 0.5) * 0.1],
          area: `${Math.round(Math.random() * 5000 + 1000)} hectares`,
          season: rec.season || 'Kharif',
          suitability: rec.suitability || rec.score || 75,
          color: '#4CAF50'
        }));
        setCropData(realCropData.length > 0 ? realCropData : getMockCropData());
      } else {
        setCropData(getMockCropData());
      }
      
      if (soilRes.status === 'fulfilled' && soilRes.value?.data?.soil) {
        const soil = soilRes.value.data.soil;
        setSoilData([{
          location: [latitude, longitude],
          ph: soil.ph || 6.5,
          type: soil.type || soil.soil_type || 'Loam',
          nitrogen: soil.nitrogen || 50,
          phosphorus: soil.phosphorus || 40,
          potassium: soil.potassium || 50
        }]);
      } else {
        setSoilData(getMockSoilData(latitude, longitude));
      }
      
      setFarmData(getMockFarmData(latitude, longitude));
      
    } catch (error) {
      console.error('Error loading map data:', error);
      
      setCropData(getMockCropData());
      setFarmData(getMockFarmData(latitude, longitude));
      setSoilData(getMockSoilData(latitude, longitude));
      
      try {
        const weatherResponse = await getWeatherData(latitude, longitude);
        setWeatherData(weatherResponse);
      } catch (weatherError) {
        logger.error('Weather data error', weatherError);
      }
      
    } finally {
      setMapLoading(false);
    }
  }, [getMockCropData, getMockFarmData, getMockSoilData, getWeatherData]);

  const getIPLocation = useCallback(async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: 'medium',
        source: 'ip',
        city: data.city,
        state: data.region,
        country: data.country_name
      };
    } catch (error) {
      throw new Error('IP location failed');
    }
  }, []);

  const getUserLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(),
            source: 'gps'
          };
          
          resolve(location);
        },
        (error) => {
          logger.warn('Location error', error);
          
          getIPLocation()
            .then(resolve)
            .catch(() => {
              resolve({
                latitude: 20.5937,
                longitude: 78.9629,
                accuracy: 'low',
                source: 'fallback',
                city: 'India Center',
                state: 'India'
              });
            });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }, [getIPLocation]);

  const formatAddressString = useCallback((address) => {
    const parts = [];
    
    if (address.house_number) parts.push(address.house_number);
    if (address.road) parts.push(address.road);
    if (address.village) parts.push(address.village);
    if (address.town && address.town !== address.village) parts.push(address.town);
    if (address.city && address.city !== address.town) parts.push(address.city);
    if (address.district) parts.push(address.district);
    if (address.state) parts.push(address.state);
    if (address.country) parts.push(address.country);
    
    return parts.join(', ');
  }, []);

  const formatOSMAddress = useCallback((address, displayName, latitude, longitude) => {
    return {
      display_name: displayName,
      house_number: address.house_number || '',
      road: address.road || '',
      village: address.village || '',
      town: address.town || '',
      city: address.city || address.town || address.village || '',
      district: address.district || address.county || '',
      state: address.state || '',
      state_district: address.state_district || '',
      country: address.country || '',
      country_code: address.country_code || '',
      postcode: address.postcode || '',
      latitude: latitude,
      longitude: longitude,
      formatted: formatAddressString(address),
      type: address.type || 'unknown',
      timestamp: new Date().toISOString()
    };
  }, [formatAddressString]);

  const addToRecentAddresses = useCallback((addressData) => {
    const newAddress = {
      ...addressData,
      id: Date.now(),
      timestamp: new Date().toISOString()
    };
    
    setRecentAddresses(prev => {
      const updatedAddresses = [
        newAddress,
        ...prev.filter(addr => 
          addr.latitude !== addressData.latitude || 
          addr.longitude !== addressData.longitude
        )
      ].slice(0, 10); // Keep only 10 most recent
      
      localStorage.setItem('recentAddresses', JSON.stringify(updatedAddresses));
      
      return updatedAddresses;
    });
  }, []);

  const getAddressFromOSM = useCallback(async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=${language || 'en'}`
      );
      
      const data = await response.json();
      
      if (data && data.address) {
        const formattedAddress = formatOSMAddress(data.address, data.display_name, latitude, longitude);
        
        addToRecentAddresses(formattedAddress);
        
        setAddressInfo(formattedAddress);
        return formattedAddress;
      }
      
      return null;
    } catch (error) {
      logger.error('OSM reverse geocode error', error);
      enqueueSnackbar(t('map.addressLookupFailed') || 'Failed to get address', { variant: 'error' });
      return null;
    }
  }, [language, t, enqueueSnackbar, formatOSMAddress, addToRecentAddresses]);

  const getAddressFromCoordinates = useCallback(async (latitude, longitude) => {
    try {
      setAddressLoading(true);
      
      const response = await api.get('/map/reverse-geocode', {
        params: {
          latitude,
          longitude,
          language: language || 'en'
        }
      });
      
      if (response.data.success) {
        const addressData = response.data.address;
        setAddressInfo(addressData);
        
        addToRecentAddresses(addressData);
        
        return addressData;
      }
      
      return null;
    } catch (error) {
      logger.error('Reverse geocode error', error);
      
      return getAddressFromOSM(latitude, longitude);
    } finally {
      setAddressLoading(false);
    }
  }, [language, addToRecentAddresses, getAddressFromOSM]);

  const initializeMap = useCallback(async () => {
    try {
      setLoading(true);
      
      const location = await getUserLocation();
      setUserLocation(location);
      
      if (location.latitude && location.longitude) {
        setMapCenter([location.latitude, location.longitude]);
        setMapZoom(12);
        
        getAddressFromCoordinates(location.latitude, location.longitude);
      }
      
      await loadMapData(location.latitude, location.longitude);
      
    } catch (err) {
      logger.error('Map initialization error', err);
      setError('Failed to initialize map');
      
      await loadMapData(20.5937, 78.9629);
      
    } finally {
      setLoading(false);
    }
  }, [loadMapData, getUserLocation, getAddressFromCoordinates]);

  const handleMapClick = useCallback(async (latlng) => {
    const { lat, lng } = latlng;
    setClickedLocation({ latitude: lat, longitude: lng });
    
    setAddressDialogOpen(true);
    setAddressLoading(true);
    
    const address = await getAddressFromCoordinates(lat, lng);
    
    if (address) {
      enqueueSnackbar(t('map.addressFound') || 'Address found successfully', { variant: 'success' });
    }
  }, [getAddressFromCoordinates, t, enqueueSnackbar]);

  const handleUseThisLocation = useCallback(() => {
    if (addressInfo) {
      setMapCenter([addressInfo.latitude, addressInfo.longitude]);
      setMapZoom(15);
      
      setSelectedLocation({
        latitude: addressInfo.latitude,
        longitude: addressInfo.longitude,
        address: addressInfo
      });
      
      enqueueSnackbar(t('map.locationSet') || 'Location set successfully', { variant: 'success' });
      setAddressDialogOpen(false);
    }
  }, [addressInfo, t, enqueueSnackbar]);

  const handleSearchAddress = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setAddressLoading(true);
      
      const response = await api.get('/map/geocode', {
        params: {
          query: searchQuery,
          language: language || 'en'
        }
      });
      
      if (response.data.success && response.data.results.length > 0) {
        const result = response.data.results[0];
        
        setMapCenter([result.latitude, result.longitude]);
        setMapZoom(14);
        
        const address = await getAddressFromCoordinates(result.latitude, result.longitude);
        
        enqueueSnackbar(t('map.locationFound') || 'Location found', { variant: 'success' });
      } else {
        enqueueSnackbar(t('map.searchFailed') || 'No results found', { variant: 'warning' });
      }
    } catch (error) {
      console.error('Geocode error:', error);
      enqueueSnackbar(t('map.searchFailed') || 'Search failed', { variant: 'error' });
    } finally {
      setAddressLoading(false);
    }
  }, [searchQuery, language, getAddressFromCoordinates, t, enqueueSnackbar]);

  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        handleMapClick(e.latlng);
      },
    });
    
    return null;
  };

  useEffect(() => {
    let mounted = true;
    
    const savedAddresses = localStorage.getItem('recentAddresses');
    if (savedAddresses) {
      try {
        setRecentAddresses(JSON.parse(savedAddresses));
      } catch (e) {
        logger.error('Error loading recent addresses', e);
      }
    }
    
    const init = async () => {
      try {
        await initializeMap();
        if (mounted) {
          setMapReady(true);
        }
      } catch (err) {
        logger.error('Map initialization error', err);
        if (mounted) {
          setError('Failed to initialize map. Please refresh the page.');
          setLoading(false);
        }
      }
    };
    
    init();
    
    return () => {
      mounted = false;
    };
  }, [initializeMap]);

  const handleMapTypeChange = (event, newMapType) => {
    if (newMapType !== null) {
      setMapType(newMapType);
    }
  };

  const handleGoToMyLocation = () => {
    if (userLocation) {
      setMapCenter([userLocation.latitude, userLocation.longitude]);
      setMapZoom(14);
    }
  };

  const handleLegendClick = (event) => {
    setLegendAnchor(event.currentTarget);
  };

  const handleLegendClose = () => {
    setLegendAnchor(null);
  };

  const MapControls = () => {
    const map = useMap();
    
    useEffect(() => {
      mapRef.current = map;
    }, [map]);
    
    return null;
  };

  const LocationMarker = ({ userLocation }) => {
    if (!userLocation || !userLocation.latitude || !userLocation.longitude) return null;

    const customIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2196F3" width="48" height="48">
          <circle cx="12" cy="12" r="10" fill="#2196F3" opacity="0.3"/>
          <circle cx="12" cy="12" r="6" fill="#2196F3"/>
          <circle cx="12" cy="12" r="2" fill="white"/>
        </svg>
      `),
      iconSize: [48, 48],
      iconAnchor: [24, 48],
      popupAnchor: [0, -48]
    });

    return (
      <>
        <Marker
          position={[userLocation.latitude, userLocation.longitude]}
          icon={customIcon}
        >
          <Popup>
            <div style={{ minWidth: '200px' }}>
              <strong>📍 Your Location</strong>
              <br />
              {userLocation.city ? `${userLocation.city}, ${userLocation.state}` : 'GPS Location'}
              <br />
              <small style={{ color: '#666' }}>
                Coordinates: {userLocation.latitude?.toFixed(6)}, {userLocation.longitude?.toFixed(6)}
              </small>
              {userLocation.accuracy && (
                <>
                  <br />
                  <small style={{ color: '#666' }}>
                    Accuracy: ±{Math.round(userLocation.accuracy)}m
                  </small>
                </>
              )}
            </div>
          </Popup>
        </Marker>
        {userLocation.accuracy && userLocation.accuracy < 1000 && (
          <Circle
            center={[userLocation.latitude, userLocation.longitude]}
            radius={userLocation.accuracy}
            pathOptions={{
              fillColor: '#2196F3',
              color: '#2196F3',
              fillOpacity: 0.2,
              weight: 2
            }}
          />
        )}
      </>
    );
  };

  const renderSoilMoistureLayers = () => {
    if (!showSoil || !soilData.length) return null;
    
    return soilData.map((soilPoint) => {
      const radius = soilPoint.moisture * 10;
      const color = getSoilMoistureColor(soilPoint.moisture);
      
      return (
        <Circle
          key={soilPoint.id}
          center={soilPoint.location}
          radius={radius}
          pathOptions={{
            fillColor: color,
            color: color,
            fillOpacity: 0.3,
            weight: 2
          }}
        >
          <LeafletTooltip permanent direction="top" opacity={0.8}>
            <div style={{ fontSize: '12px', color: '#333' }}>
              Soil Moisture: {soilPoint.moisture}%
            </div>
          </LeafletTooltip>
        </Circle>
      );
    });
  };

  const renderCropZones = () => {
    if (!showCrops || !cropData.length) return null;
    
    return cropData.map((crop) => (
      <Circle
        key={crop.id}
        center={crop.location}
        radius={5000}
        pathOptions={{
          fillColor: crop.color || '#4CAF50',
          color: crop.color || '#4CAF50',
          fillOpacity: 0.2,
          weight: 2
        }}
      >
        <Popup>
          <div style={{ minWidth: '200px', padding: '8px' }}>
            <strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>{crop.name}</strong>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>Area: {crop.area}</div>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>Season: {crop.season}</div>
            <div style={{ fontSize: '14px' }}>Suitability: {crop.suitability}%</div>
          </div>
        </Popup>
      </Circle>
    ));
  };

  const renderFarmMarkers = () => {
    if (!showFarms || !farmData.length) return null;
    
    return farmData.map((farm) => (
      <Marker
        key={farm.id}
        position={farm.location}
        icon={L.icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${getFarmColor(farm.type)}" width="32" height="32">
              <path d="M12 2L4 7v13h16V7l-8-5zm-2 18H6v-5h4v5zm6 0h-4v-5h4v5zm0-7H6v-3h12v3z" opacity="0.9"/>
            </svg>
          `),
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        })}
        eventHandlers={{
          click: () => setSelectedMarker(farm)
        }}
      >
        <Popup>
          <div style={{ minWidth: '200px', padding: '8px' }}>
            <strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>{farm.name}</strong>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>Type: {farm.type}</div>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>Size: {farm.size} acres</div>
            <div style={{ fontSize: '14px' }}>Crops: {farm.crops}</div>
          </div>
        </Popup>
      </Marker>
    ));
  };

  const getSoilMoistureColor = (moisture) => {
    if (moisture < 30) return '#FF5722';
    if (moisture < 60) return '#FF9800';
    if (moisture < 80) return '#4CAF50';
    return '#2196F3';
  };

  const getFarmColor = (type) => {
    const colors = {
      organic: '#4CAF50',
      conventional: '#FF9800',
      mixed: '#9C27B0',
      dairy: '#2196F3',
      poultry: '#FF5722'
    };
    return colors[type] || '#757575';
  };

  const getMapTileUrl = () => {
    const tileProviders = {
      streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    };
    
    return showSatellite ? tileProviders.satellite : tileProviders[mapType];
  };

  const renderAddressDialog = () => (
    <Dialog 
      open={addressDialogOpen} 
      onClose={() => setAddressDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocationSearchingIcon color="primary" />
        {t('map.addressLookup') || 'Address Lookup'}
      </DialogTitle>
      
      <DialogContent>
        {addressLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : addressInfo ? (
          <Box>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PlaceIcon color="primary" />
                  {t('map.foundAddress') || 'Found Address'}
                </Typography>
                
                <Divider sx={{ my: 1 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('map.fullAddress') || 'Full Address'}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {addressInfo.formatted || addressInfo.display_name || 'N/A'}
                    </Typography>
                  </Grid>
                  
                  {addressInfo.city && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        {t('map.city') || 'City'}
                      </Typography>
                      <Typography variant="body1">{addressInfo.city}</Typography>
                    </Grid>
                  )}
                  
                  {addressInfo.district && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        {t('map.district') || 'District'}
                      </Typography>
                      <Typography variant="body1">{addressInfo.district}</Typography>
                    </Grid>
                  )}
                  
                  {addressInfo.state && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        {t('map.state') || 'State'}
                      </Typography>
                      <Typography variant="body1">{addressInfo.state}</Typography>
                    </Grid>
                  )}
                  
                  {addressInfo.postcode && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        {t('map.postcode') || 'Postal Code'}
                      </Typography>
                      <Typography variant="body1">{addressInfo.postcode}</Typography>
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      {t('map.coordinates') || 'Coordinates'}
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace">
                      {addressInfo.latitude?.toFixed(6)}, {addressInfo.longitude?.toFixed(6)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            {recentAddresses.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HistoryIcon fontSize="small" />
                  {t('map.recentAddresses') || 'Recent Addresses'}
                </Typography>
                <List dense>
                  {recentAddresses.slice(0, 5).map((addr) => (
                    <ListItem
                      key={addr.id}
                      button
                      onClick={() => {
                        setAddressInfo(addr);
                        setMapCenter([addr.latitude, addr.longitude]);
                        setMapZoom(14);
                        enqueueSnackbar(t('map.locationRestored') || 'Location restored', { variant: 'success' });
                      }}
                      sx={{ borderRadius: 1, mb: 0.5 }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          <RoomIcon fontSize="small" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={addr.formatted || addr.display_name || 'Unknown'}
                        secondary={addr.city ? `${addr.city}, ${addr.state || ''}` : addr.state || ''}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        ) : clickedLocation ? (
          <Box sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('map.clickedLocation') || 'Clicked Location'}
            </Typography>
            <Typography variant="body2" fontFamily="monospace" sx={{ mt: 1 }}>
              {clickedLocation.latitude?.toFixed(6)}, {clickedLocation.longitude?.toFixed(6)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {t('map.fetchingAddress') || 'Fetching address...'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <LocationSearchingIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              {t('map.clickMapForAddress') || 'Click on the map to get address information'}
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setAddressDialogOpen(false)}>
          {t('map.close') || 'Close'}
        </Button>
        {addressInfo && (
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={handleUseThisLocation}
          >
            {t('map.useThisLocation') || 'Use This Location'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            {t('nav.agriMap') || 'Loading Map...'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Initializing map and loading your location
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
      <Container maxWidth={false} sx={{ p: 0, height: 'calc(100vh - 64px)' }}>
        <Paper sx={{ p: 2, borderRadius: 0, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item>
              <MapIcon color="primary" />
            </Grid>
            <Grid item xs>
              <Typography variant="h5" component="h1">
                {t('nav.agriMap') || 'Map'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('map.subtitle') || 'Interactive agricultural map with real-time data'} • {t('map.clickForAddress') || 'Click on map to get address'}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={t('map.searchAddress') || 'Search address, city, district...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchAddress()}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ bgcolor: 'background.default' }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleSearchAddress}
                  disabled={addressLoading || !searchQuery.trim()}
                >
                  {addressLoading ? <CircularProgress size={20} /> : t('map.search') || 'Search'}
                </Button>
              </Box>
            </Grid>
            
            <Grid item>
              <Tooltip title={t('map.findAddress') || 'Click on map to get address'}>
                <Button
                  variant="outlined"
                  startIcon={<LocationSearchingIcon />}
                  onClick={() => setAddressDialogOpen(true)}
                  size="small"
                >
                  {t('map.addressLookup') || 'Address Lookup'}
                </Button>
              </Tooltip>
            </Grid>
            
            <Grid item>
              <Button
                variant="contained"
                startIcon={<MyLocationIcon />}
                onClick={handleGoToMyLocation}
                disabled={!userLocation}
              >
                My Location
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Box sx={{ display: 'flex', height: 'calc(100% - 80px)' }}>
          <Paper sx={{ width: 300, m: 2, p: 2, bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" gutterBottom>
              Map Controls & Analysis
            </Typography>
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Map Type
              </Typography>
              <ToggleButtonGroup
                value={mapType}
                exclusive
                onChange={handleMapTypeChange}
                size="small"
                fullWidth
              >
                <ToggleButton value="streets">
                  <MapIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="terrain">
                  <TerrainIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="dark">
                  <MapIcon fontSize="small" />
                </ToggleButton>
              </ToggleButtonGroup>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={showSatellite}
                    onChange={(e) => setShowSatellite(e.target.checked)}
                    size="small"
                  />
                }
                label="Satellite View"
                sx={{ mt: 1 }}
              />
            </Box>
            
            <Divider />
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Layers
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={showCrops}
                    onChange={(e) => setShowCrops(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CropIcon fontSize="small" />
                    Crop Zones
                  </Box>
                }
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={showFarms}
                    onChange={(e) => setShowFarms(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FarmIcon fontSize="small" />
                    Farms
                  </Box>
                }
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={showSoil}
                    onChange={(e) => setShowSoil(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WaterIcon fontSize="small" />
                    Soil Moisture
                  </Box>
                }
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={showWeather}
                    onChange={(e) => setShowWeather(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TempIcon fontSize="small" />
                    Weather
                  </Box>
                }
              />
            </Box>
            
            {weatherData && showWeather && (
              <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Weather
                  </Typography>
                  <Typography variant="h4">
                    {weatherData ? Math.round(weatherData.temperature) : '--'}°C
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {weatherData?.condition || 'N/A'}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Paper>

          <Box sx={{ flexGrow: 1, position: 'relative', m: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {mapLoading && (
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                borderRadius: 2
              }}>
                <CircularProgress />
              </Box>
            )}
            
            {mapReady ? (
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%', borderRadius: 8, zIndex: 0 }}
                zoomControl={false}
                key={`map-${mapCenter[0]}-${mapCenter[1]}`}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url={getMapTileUrl()}
                />
                
                <MapControls />
                <ZoomControl position="bottomright" />
                <ScaleControl position="bottomleft" />
                
                <MapClickHandler />
                
                <LocationMarker userLocation={userLocation} />
                
                {selectedLocation && (
                  <Marker
                    position={[selectedLocation.latitude, selectedLocation.longitude]}
                    icon={L.icon({
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
                    })}
                  >
                    <Popup>
                      <div>
                        <strong>📍 Selected Location</strong>
                        <br />
                        {selectedLocation.address?.formatted || 
                         `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`}
                      </div>
                    </Popup>
                  </Marker>
                )}
                
                {renderCropZones()}
                
                {renderFarmMarkers()}
                
                {renderSoilMoistureLayers()}
                
              </MapContainer>
            ) : (
              <Box sx={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'background.default',
                borderRadius: 2
              }}>
                <CircularProgress />
              </Box>
            )}
            
            <Paper sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              p: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              zIndex: 1000,
              bgcolor: 'background.paper'
            }}>
              <IconButton size="small" onClick={() => {
                if (mapRef.current) mapRef.current.setZoom(mapRef.current.getZoom() + 1);
              }}>
                <ZoomInIcon />
              </IconButton>
              <IconButton size="small" onClick={() => {
                if (mapRef.current) mapRef.current.setZoom(mapRef.current.getZoom() - 1);
              }}>
                <ZoomOutIcon />
              </IconButton>
              <Divider />
              <IconButton size="small" onClick={handleGoToMyLocation}>
                <GpsFixedIcon />
              </IconButton>
            </Paper>
          </Box>
        </Box>
        
        {renderAddressDialog()}
        
        {selectedLocation && (
          <Fade in={!!selectedLocation}>
            <Paper sx={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              p: 2,
              zIndex: 1000,
              maxWidth: 400,
              bgcolor: 'background.paper',
              boxShadow: 3
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PinDropIcon color="primary" />
                    {t('map.selectedLocation') || 'Selected Location'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedLocation.address?.formatted || 
                     `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setSelectedLocation(null)}>
                  <CancelIcon />
                </IconButton>
              </Box>
              
              {selectedLocation.address && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Grid container spacing={1}>
                    {selectedLocation.address.city && (
                      <Grid item xs={6}>
                        <Chip 
                          size="small" 
                          icon={<BusinessIcon />} 
                          label={`City: ${selectedLocation.address.city}`} 
                        />
                      </Grid>
                    )}
                    {selectedLocation.address.district && (
                      <Grid item xs={6}>
                        <Chip 
                          size="small" 
                          icon={<MapOutlinedIcon />} 
                          label={`District: ${selectedLocation.address.district}`} 
                        />
                      </Grid>
                    )}
                    {selectedLocation.address.state && (
                      <Grid item xs={6}>
                        <Chip 
                          size="small" 
                          icon={<FlagIcon />} 
                          label={`State: ${selectedLocation.address.state}`} 
                        />
                      </Grid>
                    )}
                    {selectedLocation.address.country && (
                      <Grid item xs={6}>
                        <Chip 
                          size="small" 
                          icon={<LandscapeIcon />} 
                          label={`Country: ${selectedLocation.address.country}`} 
                        />
                      </Grid>
                    )}
                  </Grid>
                  
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CropIcon />}
                      onClick={() => {
                        navigate(`/crop-recommendation?lat=${selectedLocation.latitude}&lng=${selectedLocation.longitude}`);
                      }}
                    >
                      {t('map.findCrops') || 'Find Crops'}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<FarmIcon />}
                      onClick={() => {
                        loadMapData(selectedLocation.latitude, selectedLocation.longitude);
                      }}
                    >
                      {t('map.findFarms') || 'Find Farms'}
                    </Button>
                  </Box>
                </>
              )}
            </Paper>
          </Fade>
        )}
      </Container>
    );
};

export default AgriMap;
