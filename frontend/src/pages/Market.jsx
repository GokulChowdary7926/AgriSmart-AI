import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Collapse,
  Autocomplete
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Store as StoreIcon,
  Update as UpdateIcon,
  FilterList as FilterIcon,
  CompareArrows as CompareIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import logger from '../services/logger';
import DataQualityIndicator from '../components/common/DataQualityIndicator';
import LoadingState from '../components/common/LoadingState';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { getBestAvailableLocation } from '../services/realtimeLocation';

export const getWindowStartDate = (days, referenceDate = new Date()) => {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
};

export const getCurrentRange = ({ selectedDate, timePeriod, customStartDate, customEndDate }) => {
  if (selectedDate) {
    const day = new Date(selectedDate);
    if (Number.isNaN(day.getTime())) return null;
    day.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);
    return { start: day, end };
  }

  if (timePeriod === '7days') {
    return { start: getWindowStartDate(7), end: new Date() };
  }

  if (timePeriod === '30days') {
    return { start: getWindowStartDate(30), end: new Date() };
  }

  if (timePeriod === 'custom' && customStartDate && customEndDate) {
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    if (start > end) return null;
    return { start, end };
  }

  return null;
};

export const getCompareRange = ({ comparePeriod, currentRange }) => {
  const compareDaysMap = { '7days': 7, '30days': 30, '60days': 60 };
  const compareDays = compareDaysMap[comparePeriod] || 7;

  if (currentRange) {
    const compareEnd = new Date(currentRange.start);
    compareEnd.setMilliseconds(-1);

    const compareStart = new Date(compareEnd);
    compareStart.setDate(compareStart.getDate() - (compareDays - 1));
    compareStart.setHours(0, 0, 0, 0);

    return { start: compareStart, end: compareEnd };
  }

  return { start: getWindowStartDate(compareDays), end: new Date() };
};

export const filterByDateRange = (items, range) => {
  if (!range?.start || !range?.end) return items;
  return items.filter(item => {
    const itemDate = new Date(item.date || item.recordedAt || item.timestamp);
    if (Number.isNaN(itemDate.getTime())) return false;
    return itemDate >= range.start && itemDate <= range.end;
  });
};

export default function Market() {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [commodity, setCommodity] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [expandedUpdates, setExpandedUpdates] = useState({});
  
  const [selectedState, setSelectedState] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [timePeriod, setTimePeriod] = useState('all'); // 'all', '7days', '30days', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [comparePeriod, setComparePeriod] = useState('7days'); // Period to compare with
  const [showFilters, setShowFilters] = useState(false);
  const locale = language === 'ta' ? 'ta-IN' : 'en-IN';

  useEffect(() => {
    const commodityParam = searchParams.get('commodity');
    if (commodityParam) {
      setCommodity(commodityParam);
      setSelectedCommodity(commodityParam);
    }
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    const initializeLocationState = async () => {
      if (selectedState) return;
      try {
        const resolved = await getBestAvailableLocation(api, language);
        if (isMounted && resolved?.state) {
          setSelectedState(resolved.state);
        }
      } catch (error) {
        logger.debug('Market location bootstrap skipped', error);
      }
    };
    initializeLocationState();
    return () => {
      isMounted = false;
    };
  }, [language, selectedState]);

  const { data: commodities } = useQuery({
    queryKey: ['market', 'commodities'],
    queryFn: async () => {
      const response = await api.get('/market/commodities');
      return response.data.data || [];
    }
  });

  const { data: allPricesData } = useQuery({
    queryKey: ['market', 'prices', 'all'],
    queryFn: async () => {
      try {
        const response = await api.get('/market/prices', { params: { limit: 200 } });
        const data = response.data.data || [];
        return data.filter(item => item.price || (item.commodity && item.market));
      } catch {
        return [];
      }
    },
    enabled: true,
    staleTime: 10 * 60 * 1000 // Cache for 10 minutes
  });

  const allIndianStates = [
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
    'Andaman and Nicobar Islands',
    'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi',
    'Jammu and Kashmir',
    'Ladakh',
    'Lakshadweep',
    'Puducherry'
  ];

  const normalizeStateName = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const compact = raw
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '')
      .trim();
    const aliasMap = {
      தமிழ்நாடு: 'Tamil Nadu',
      tamilnadu: 'Tamil Nadu',
      tamilnaduindia: 'Tamil Nadu',
      tn: 'Tamil Nadu',
      கேரளா: 'Kerala',
      kerala: 'Kerala',
      கர்நாடகா: 'Karnataka',
      karnataka: 'Karnataka',
      ஆந்திரப்பிரதேசம்: 'Andhra Pradesh',
      andhrapradesh: 'Andhra Pradesh',
      தெலுங்கானா: 'Telangana',
      telangana: 'Telangana',
      மகாராஷ்டிரா: 'Maharashtra',
      maharashtra: 'Maharashtra',
      குஜராத்: 'Gujarat',
      gujarat: 'Gujarat',
      டெல்லி: 'Delhi',
      delhi: 'Delhi'
    };
    return aliasMap[compact] || raw;
  };

  const normalizedSelectedState = useMemo(
    () => normalizeStateName(selectedState),
    [selectedState]
  );

  const availableStates = useMemo(() => {
    const statesFromData = new Set();
    if (allPricesData) {
      allPricesData.forEach(item => {
        const state = item.state || item.market?.state || item.market?.location || '';
        if (state && state !== '-') {
          statesFromData.add(state);
        }
      });
    }
    
    const combinedStates = new Set([...allIndianStates, ...statesFromData]);
    return Array.from(combinedStates).sort();
  }, [allPricesData]);

  const { data: prices, isLoading: pricesLoading, error: pricesError } = useQuery({
    queryKey: ['market', 'prices', commodity, selectedState, normalizedSelectedState, selectedDate, timePeriod, customStartDate, customEndDate],
    queryFn: async () => {
      const params = { limit: 5000 };
      if (commodity) {
        params.commodity = commodity;
        if (normalizedSelectedState) params.state = normalizedSelectedState;
      } else if (normalizedSelectedState) {
        params.state = normalizedSelectedState;
      }
      if (selectedDate) params.date = selectedDate;

      const response = await api.get('/market/prices', { params });
      const data = response.data.data || [];
      const actualPrices = data.filter(item => {
        if (item.price) return true;
        if (item.commodity && item.market) return true;
        return false;
      });

      const currentRange = getCurrentRange({ selectedDate, timePeriod, customStartDate, customEndDate });
      let filteredPrices = filterByDateRange(actualPrices, currentRange);

      if (normalizedSelectedState) {
        const stateFilteredPrices = filteredPrices.filter(item => {
          const itemState = normalizeStateName(item.state || item.market?.state || item.market?.location || '');
          const stateLower = normalizedSelectedState.toLowerCase();
          const itemStateLower = String(itemState || '').toLowerCase();
          return itemStateLower === stateLower ||
                 itemStateLower.includes(stateLower) ||
                 stateLower.includes(itemStateLower);
        });

        // Avoid blank market tables when provider state names differ slightly.
        if (stateFilteredPrices.length > 0) {
          filteredPrices = stateFilteredPrices;
        } else {
          logger.warn('State filter yielded no rows; returning unfiltered commodity set', {
            requestedState: normalizedSelectedState,
            totalBeforeFilter: filteredPrices.length
          });
        }
      }

      logger.info('Market prices fetched', {
        total: actualPrices.length,
        filtered: filteredPrices.length,
        state: normalizedSelectedState || selectedState
      });
      return filteredPrices;
    },
    enabled: true,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000
  });

  const aggregatedPrices = useMemo(() => {
    if (!prices || prices.length === 0) return [];
    
    if (selectedState || commodity) {
      return [];
    }
    
    const commodityMap = new Map();
    
    prices.forEach(price => {
      const commodityName = price.commodity || price.name || 'Unknown';
      const priceValue = typeof price.price === 'object' ? price.price.value : price.price;
      
      if (!priceValue || isNaN(priceValue)) return;
      
      if (!commodityMap.has(commodityName)) {
        commodityMap.set(commodityName, {
          commodity: commodityName,
          prices: [],
          markets: new Set(),
          states: new Set(),
          priceChanges: []
        });
      }
      
      const commodityData = commodityMap.get(commodityName);
      commodityData.prices.push(priceValue);
      if (price.market?.name) commodityData.markets.add(price.market.name);
      if (price.state) commodityData.states.add(price.state);
      if (price.priceChange) {
        const change = typeof price.priceChange === 'object' 
          ? (price.priceChange.daily || price.priceChange.weekly || 0)
          : price.priceChange;
        if (typeof change === 'number' && !isNaN(change)) {
          commodityData.priceChanges.push(change);
        }
      }
    });
    
    return Array.from(commodityMap.values()).map(data => {
      const avgPrice = data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length;
      const avgChange = data.priceChanges.length > 0
        ? data.priceChanges.reduce((sum, c) => sum + c, 0) / data.priceChanges.length
        : 0;
      
      return {
        commodity: data.commodity,
        averagePrice: avgPrice,
        priceRange: {
          min: Math.min(...data.prices),
          max: Math.max(...data.prices)
        },
        marketCount: data.markets.size,
        stateCount: data.states.size,
        averageChange: avgChange,
        sampleCount: data.prices.length
      };
    }).sort((a, b) => a.commodity.localeCompare(b.commodity));
  }, [prices, selectedState]);

  const { data: comparePrices } = useQuery({
    queryKey: ['market', 'prices', 'compare', commodity, selectedState, normalizedSelectedState, comparePeriod, selectedDate, timePeriod, customStartDate, customEndDate],
    queryFn: async () => {
      if (!compareMode) return null;
      
      try {
        const params = { limit: 5000 };
        if (commodity) params.commodity = commodity;
        if (normalizedSelectedState) params.state = normalizedSelectedState;
        
      const response = await api.get('/market/prices', { params });
        const data = response.data.data || [];
        const actualPrices = data.filter(item => item.price || (item.commodity && item.market));
        const compareRange = getCompareRange({
          comparePeriod,
          currentRange: getCurrentRange({ selectedDate, timePeriod, customStartDate, customEndDate })
        });
        return filterByDateRange(actualPrices, compareRange);
      } catch (error) {
        logger.error('Error fetching compare prices', error, { 
          commodity,
          state: normalizedSelectedState || selectedState,
          period: comparePeriod
        });
        return [];
      }
    },
    enabled: compareMode,
    staleTime: 5 * 60 * 1000
  });

  const aggregatedComparePrices = useMemo(() => {
    if (!comparePrices || !Array.isArray(comparePrices) || comparePrices.length === 0) {
      return new Map();
    }
    
    const commodityMap = new Map();
    
    comparePrices.forEach(price => {
      const commodityName = price.commodity || price.name || 'Unknown';
      const priceValue = typeof price.price === 'object' ? price.price.value : price.price;
      
      if (!priceValue || isNaN(priceValue)) return;
      
      let normalizedPrice = priceValue;
      if (typeof price.price === 'object' && price.price.unit === 'quintal') {
        normalizedPrice = priceValue / 100;
      }
      
      if (!commodityMap.has(commodityName)) {
        commodityMap.set(commodityName, {
          commodity: commodityName,
          prices: []
        });
      }
      
      const commodityData = commodityMap.get(commodityName);
      commodityData.prices.push(normalizedPrice);
    });
    
    const aggregatedMap = new Map();
    commodityMap.forEach((data, commodityName) => {
      const avgPrice = data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length;
      aggregatedMap.set(commodityName, avgPrice);
    });
    
    return aggregatedMap;
  }, [comparePrices]);

  const { data: trends } = useQuery({
    queryKey: ['market', 'trends', selectedCommodity],
    queryFn: async () => {
      if (!selectedCommodity) return null;
      const response = await api.get('/market/trends', {
        params: { commodity: selectedCommodity, days: 30 }
      });
      return response.data.data || [];
    },
    enabled: !!selectedCommodity
  });

  const { data: marketUpdates, isLoading: marketUpdatesLoading } = useQuery({
    queryKey: ['market', 'updates'],
    queryFn: async () => {
      try {
        const response = await api.get('/alerts');
        const allAlerts = response.data.data || [];
        const marketAlerts = allAlerts.filter(alert => {
          const type = (alert.type || '').toLowerCase();
          const title = (alert.title || alert.message || '').toLowerCase();
          const message = (alert.message || '').toLowerCase();
          
          const marketKeywords = ['market', 'price', 'commodity', 'mandi', 'trading', 'export', 'import', 'demand', 'supply', 'harvest', 'procurement', 'msp', 'minimum support price'];
          
          return type === 'market' || 
                 marketKeywords.some(keyword => 
                   title.includes(keyword) || 
                   message.includes(keyword)
                 );
        });
        
        const mockUpdates = getMockMarketUpdates();
        
        if (marketAlerts.length > 0) {
          return [...marketAlerts, ...mockUpdates].slice(0, 10); // Limit to 10 updates
        }
        
        return mockUpdates;
      } catch (error) {
        logger.error('Error fetching market updates', error);
        return getMockMarketUpdates();
      }
    },
    enabled: true, // Always enabled
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000 // Consider data stale after 2 minutes
  });

  const getMockMarketUpdates = () => {
    return [
      {
        id: 'update_1',
        title: 'Wheat Prices Surge 5%',
        message: 'Wheat prices have increased by 5% in major mandis due to increased demand and lower supply. Farmers are advised to monitor market trends.',
        type: 'market',
        severity: 'info',
        timestamp: new Date(),
        commodity: 'Wheat',
        impact: 'positive',
        source: 'Market Intelligence'
      },
      {
        id: 'update_2',
        title: 'Rice Procurement Season Begins',
        message: 'Government procurement of rice has started in major states. MSP rates are ₹2,040 per quintal for common paddy and ₹2,060 for Grade A.',
        type: 'market',
        severity: 'info',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        commodity: 'Rice',
        impact: 'positive',
        source: 'FCI Updates'
      },
      {
        id: 'update_3',
        title: 'Cotton Export Demand Increases',
        message: 'International demand for Indian cotton has increased. Export prices are favorable. Farmers with quality cotton can expect better returns.',
        type: 'market',
        severity: 'info',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        commodity: 'Cotton',
        impact: 'positive',
        source: 'Export Market Intelligence'
      },
      {
        id: 'update_4',
        title: 'Sugarcane MSP Announced',
        message: 'New MSP for sugarcane has been announced at ₹315 per quintal. Sugar mills are expected to start procurement soon.',
        type: 'market',
        severity: 'info',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        commodity: 'Sugarcane',
        impact: 'positive',
        source: 'Government Announcement'
      }
    ];
  };

  const handleCommoditySelect = (comm) => {
    setCommodity(comm);
    setSelectedCommodity(comm);
    if (comm) {
      setSearchParams({ commodity: comm });
    } else {
      setSearchParams({});
    }
  };

  const getTrendIcon = (change) => {
    if (change > 0) return <TrendingUpIcon color="success" />;
    if (change < 0) return <TrendingDownIcon color="error" />;
    return <TrendingFlatIcon color="disabled" />;
  };

  const getTrendColor = (change) => {
    if (change > 0) return 'success';
    if (change < 0) return 'error';
    return 'default';
  };

  const toggleUpdateExpand = (updateId) => {
    setExpandedUpdates(prev => ({
      ...prev,
      [updateId]: !prev[updateId]
    }));
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return t('market.justNow', 'Just now');
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('market.justNow', 'Just now');
    if (diffMins < 60) return t('market.minutesAgo', { count: diffMins, defaultValue: '{{count}} minutes ago' });
    if (diffHours < 24) return t('market.hoursAgo', { count: diffHours, defaultValue: '{{count}} hours ago' });
    return t('market.daysAgo', { count: diffDays, defaultValue: '{{count}} days ago' });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('market.pricesAndTrends', 'Market Prices & Trends')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t('market.trackDescription', 'Track commodity prices, market trends, and latest updates')}
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={t('market.pricesAndTrendsTab', 'Prices & Trends')} />
          <Tab label={t('market.marketUpdatesTab', 'Market Updates')} />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
        <>
      <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{t('market.filtersComparison', 'Filters & Comparison')}</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={compareMode ? 'contained' : 'outlined'}
                  startIcon={<CompareIcon />}
                  onClick={() => setCompareMode(!compareMode)}
                  size="small"
                >
                  {t('market.compare', 'Compare')}
                </Button>
                <IconButton
                  onClick={() => setShowFilters(!showFilters)}
                  color={showFilters ? 'primary' : 'default'}
                >
                  <FilterIcon />
                </IconButton>
              </Box>
            </Box>

        <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <Autocomplete
                  fullWidth
                  options={commodities || []}
                  getOptionLabel={(option) => typeof option === 'string' ? option : (option.name || option)}
                  value={commodity ? (commodities?.find(c => (typeof c === 'string' ? c : c.name) === commodity) || commodity) : null}
                  onChange={(event, newValue) => {
                    const value = typeof newValue === 'string' ? newValue : (newValue?.name || '');
                    handleCommoditySelect(value);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('market.searchCommodity', 'Search Commodity')}
                      placeholder={t('market.typeSearchCommodities', 'Type to search commodities...')}
                    />
                  )}
                  renderOption={(props, option) => {
                    const commName = typeof option === 'string' ? option : (option.name || option);
                    return (
                      <Box component="li" {...props} key={commName}>
                        <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }} />
                        {commName}
                      </Box>
                    );
                  }}
                  noOptionsText={t('market.noCommoditiesFound', 'No commodities found')}
                  clearOnEscape
                  selectOnFocus
                  handleHomeEndKeys
                  filterOptions={(options, { inputValue }) => {
                    return options.filter(option => {
                      const label = typeof option === 'string' ? option : (option.name || option);
                      return label.toLowerCase().includes(inputValue.toLowerCase());
                    });
                  }}
                />
              </Grid>
              
              {showFilters && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
                      <InputLabel>{t('market.state', 'State')}</InputLabel>
              <Select
                        value={selectedState}
                        label={t('market.state', 'State')}
                        onChange={(e) => setSelectedState(e.target.value)}
                      >
                        <MenuItem value="">
                          <em>{t('market.allStates', 'All States')}</em>
                        </MenuItem>
                        {availableStates.map((state) => (
                          <MenuItem key={state} value={state}>
                            {state}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
              fullWidth
                      label={t('market.date', 'Date')}
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>{t('market.timePeriod', 'Time Period')}</InputLabel>
                      <Select
                        value={timePeriod}
                        label={t('market.timePeriod', 'Time Period')}
                        onChange={(e) => setTimePeriod(e.target.value)}
                      >
                        <MenuItem value="all">{t('market.allTime', 'All Time')}</MenuItem>
                        <MenuItem value="7days">{t('market.last7Days', 'Last 7 Days')}</MenuItem>
                        <MenuItem value="30days">{t('market.last30Days', 'Last 30 Days')}</MenuItem>
                        <MenuItem value="custom">{t('market.customRange', 'Custom Range')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {timePeriod === 'custom' && (
                    <>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label={t('market.startDate', 'Start Date')}
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField
                          fullWidth
                          label={t('market.endDate', 'End Date')}
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                    </>
                  )}
                </>
              )}
              
              {compareMode && (
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>{t('market.compareWith', 'Compare With')}</InputLabel>
                    <Select
                      value={comparePeriod}
                      label={t('market.compareWith', 'Compare With')}
                      onChange={(e) => setComparePeriod(e.target.value)}
                    >
                      <MenuItem value="7days">{t('market.last7Days', 'Last 7 Days')}</MenuItem>
                      <MenuItem value="30days">{t('market.last30Days', 'Last 30 Days')}</MenuItem>
                      <MenuItem value="60days">{t('market.last60Days', 'Last 60 Days')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              
              <Grid item xs={12} sm={6} md={showFilters ? 12 : 3}>
                <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={() => {
                      setCommodity('');
                      setSelectedCommodity('');
                      setSelectedState('');
                      setSelectedDate('');
                      setTimePeriod('all');
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    disabled={!commodity && !selectedState && !selectedDate && timePeriod === 'all' && !customStartDate && !customEndDate}
                  >
                    {t('market.clearAll', 'Clear All')}
            </Button>
                </Box>
          </Grid>
        </Grid>
            
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {commodity ? t('market.showingPricesFor', { commodity, defaultValue: 'Showing prices for: {{commodity}}' }) : t('market.showingAllCropPrices', 'Showing all crop prices')}
              </Typography>
              {selectedState && (
                <Chip 
                  label={t('market.stateChip', { state: selectedState, defaultValue: 'State: {{state}}' })}
                  size="small"
                  color="primary"
                  onDelete={() => setSelectedState('')}
                />
              )}
              {selectedDate && (
                <Chip 
                  label={t('market.dateChip', { date: new Date(selectedDate).toLocaleDateString(locale), defaultValue: 'Date: {{date}}' })}
                  size="small"
                  color="primary"
                  onDelete={() => setSelectedDate('')}
                />
              )}
              {timePeriod !== 'all' && (
                <Chip 
                  label={t('market.periodChip', { period: timePeriod, defaultValue: 'Period: {{period}}' })}
                  size="small"
                  color="primary"
                  onDelete={() => setTimePeriod('all')}
                />
              )}
              {timePeriod === 'custom' && customStartDate && customEndDate && (
                <Chip
                  label={t('market.rangeChip', {
                    start: new Date(customStartDate).toLocaleDateString(locale),
                    end: new Date(customEndDate).toLocaleDateString(locale),
                    defaultValue: 'Range: {{start}} - {{end}}'
                  })}
                  size="small"
                  color="primary"
                  onDelete={() => {
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }}
                />
              )}
            </Box>
            
            {/* Data Quality Indicator */}
            {prices && prices._quality && (
              <Box sx={{ mt: 2 }}>
                <DataQualityIndicator 
                  data={prices}
                  showDetails={true}
                  onRefresh={() => window.location.reload()}
                />
              </Box>
            )}
      </Paper>

      {selectedCommodity && trends && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('market.priceTrendsFor', { commodity: selectedCommodity, defaultValue: 'Price Trends - {{commodity}}' })}
          </Typography>
          {trends.statistics && (
            <Box mb={2}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        {t('market.currentPrice', 'Current Price')}
                      </Typography>
                      <Typography variant="h6">
                        ₹{trends.statistics.latest?.toFixed(2) || t('common.notAvailable')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        {t('market.average', 'Average')}
                      </Typography>
                      <Typography variant="h6">
                        ₹{trends.statistics.average?.toFixed(2) || t('common.notAvailable')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        {t('market.high', 'High')}
                      </Typography>
                      <Typography variant="h6">
                        ₹{trends.statistics.max?.toFixed(2) || t('common.notAvailable')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        {t('market.low', 'Low')}
                      </Typography>
                      <Typography variant="h6">
                        ₹{trends.statistics.min?.toFixed(2) || t('common.notAvailable')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
          {trends.data && trends.data.length > 0 && (
            <Box sx={{ height: 300, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="average"
                    stroke="#4caf50"
                    strokeWidth={2}
                    name={t('market.averagePriceLegend', 'Average Price')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Paper>
      )}

      <LoadingState
        isLoading={pricesLoading}
        error={pricesError}
        retry={() => window.location.reload()}
        dataLength={((selectedState || commodity) ? prices : aggregatedPrices)?.length || 0}
        type="table"
        emptyMessage={t('market.noPricesForFilters', 'No market prices available for the selected filters')}
      >
      {((selectedState || commodity) ? prices : aggregatedPrices) && ((selectedState || commodity) ? prices.length > 0 : aggregatedPrices.length > 0) ? (
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h6">
                    {selectedState 
                      ? t('market.allCropPricesInState', {
                          state: selectedState,
                          count: prices.length,
                          entryText: prices.length === 1 ? t('market.entry', 'entry') : t('market.entries', 'entries'),
                          defaultValue: 'All Crop Prices in {{state}} ({{count}} {{entryText}})'
                        })
                      : commodity
                      ? t('market.commodityAllStatesHeader', {
                          commodity,
                          count: prices.length,
                          entryText: prices.length === 1 ? t('market.entry', 'entry') : t('market.entries', 'entries'),
                          defaultValue: '{{commodity}} Prices - All States ({{count}} {{entryText}})'
                        })
                      : t('market.allCropAverageHeader', {
                          count: aggregatedPrices.length,
                          commodityText: aggregatedPrices.length === 1 ? t('market.commodityOne', 'commodity') : t('market.commoditiesMany', 'commodities'),
                          defaultValue: 'All Crop Prices - Average Market Prices ({{count}} {{commodityText}})'
                        })
                    }
                    {compareMode && comparePrices && (
                      <Chip 
                        label={t('market.compareChip', {
                          count: comparePrices.length,
                          period: comparePeriod,
                          defaultValue: 'vs {{count}} in {{period}}'
                        })}
                        size="small"
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                  {selectedState ? (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {t('market.showingStateSpecificPrices', {
                        state: selectedState,
                        defaultValue: 'Showing state-specific prices for {{state}}'
                      })}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {t('market.averageAcrossMarketsHelp', 'Average prices across all markets and states. Filter by state to see detailed prices.')}
                    </Typography>
                  )}
                </Box>
                <Chip 
                  label={t('market.lastUpdatedChip', {
                    time: new Date().toLocaleTimeString(locale),
                    defaultValue: 'Last updated: {{time}}'
                  })}
                  size="small"
                  variant="outlined"
                />
              </Box>
              
              {compareMode && comparePrices && prices && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                    {t('market.priceComparisonSummary', 'Price Comparison Summary')}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">{t('market.currentPeriodAvg', 'Current Period Avg')}</Typography>
                        <Typography variant="h6">
                          ₹{prices.length > 0 ? (prices.reduce((sum, p) => {
                            const price = typeof p.price === 'object' ? p.price.value : p.price;
                            return sum + (price || 0);
                          }, 0) / prices.length).toFixed(2) : '0.00'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">{t('market.comparePeriodAvg', 'Compare Period Avg')}</Typography>
                        <Typography variant="h6">
                          ₹{comparePrices.length > 0 ? (comparePrices.reduce((sum, p) => {
                            const price = typeof p.price === 'object' ? p.price.value : p.price;
                            return sum + (price || 0);
                          }, 0) / comparePrices.length).toFixed(2) : '0.00'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">{t('market.priceDifference', 'Price Difference')}</Typography>
                        <Typography variant="h6" color="primary">
                          {(() => {
                            const currentAvg = prices.length > 0 ? prices.reduce((sum, p) => {
                              const price = typeof p.price === 'object' ? p.price.value : p.price;
                              return sum + (price || 0);
                            }, 0) / prices.length : 0;
                            const compareAvg = comparePrices.length > 0 ? comparePrices.reduce((sum, p) => {
                              const price = typeof p.price === 'object' ? p.price.value : p.price;
                              return sum + (price || 0);
                            }, 0) / comparePrices.length : 0;
                            const diff = currentAvg - compareAvg;
                            return `${diff >= 0 ? '+' : ''}₹${diff.toFixed(2)}`;
                          })()}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">{t('market.changePercent', 'Change %')}</Typography>
                        <Typography variant="h6" color="primary">
                          {(() => {
                            const currentAvg = prices.length > 0 ? prices.reduce((sum, p) => {
                              const price = typeof p.price === 'object' ? p.price.value : p.price;
                              return sum + (price || 0);
                            }, 0) / prices.length : 0;
                            const compareAvg = comparePrices.length > 0 ? comparePrices.reduce((sum, p) => {
                              const price = typeof p.price === 'object' ? p.price.value : p.price;
                              return sum + (price || 0);
                            }, 0) / comparePrices.length : 0;
                            if (compareAvg === 0) return '0.00%';
                            const change = ((currentAvg - compareAvg) / compareAvg) * 100;
                            return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                          })()}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              )}
              
              <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
                <Table stickyHeader>
            <TableHead>
              <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>{t('market.commodity', 'Commodity')}</TableCell>
                      {(selectedState || commodity) && (
                        <TableCell sx={{ fontWeight: 600 }}>{t('market.marketLabel', 'Market')}</TableCell>
                      )}
                      <TableCell sx={{ fontWeight: 600 }}>
                        {(selectedState || commodity) ? t('market.pricePerKg', 'Price (₹/kg)') : t('market.averagePricePerKg', 'Average Price (₹/kg)')}
                      </TableCell>
                      {!(selectedState || commodity) && (
                        <TableCell sx={{ fontWeight: 600 }}>{t('market.priceRange', 'Price Range')}</TableCell>
                      )}
                      {!(selectedState || commodity) && (
                        <TableCell sx={{ fontWeight: 600 }}>{t('market.markets', 'Markets')}</TableCell>
                      )}
                      {compareMode && (
                        <TableCell sx={{ fontWeight: 600 }}>{t('market.comparePrice', 'Compare Price')}</TableCell>
                      )}
                      {(selectedState || commodity) && (
                        <TableCell sx={{ fontWeight: 600 }}>{t('market.quality', 'Quality')}</TableCell>
                      )}
                      <TableCell sx={{ fontWeight: 600 }}>{t('market.priceChange', 'Price Change')}</TableCell>
                      {compareMode && (
                        <TableCell sx={{ fontWeight: 600 }}>{t('market.difference', 'Difference')}</TableCell>
                      )}
                      {(selectedState || commodity) && (
                        <TableCell sx={{ fontWeight: 600 }}>{t('market.state', 'State')}</TableCell>
                      )}
                      {(selectedState || commodity) && (
                        <TableCell sx={{ fontWeight: 600 }}>{t('market.date', 'Date')}</TableCell>
                      )}
              </TableRow>
            </TableHead>
            <TableBody>
                    {(() => {
                      const dataToShow = (selectedState || commodity) ? (prices || []) : (aggregatedPrices || []);
                      
                      if (!dataToShow || dataToShow.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                              <Typography variant="body2" color="text.secondary">
                                {t('market.noPricesForSelectedFilters', 'No prices available for the selected filters.')}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      let filteredData = dataToShow.filter(item => {
                        if (!item || (!item.commodity && !item.name)) return false;
                        if (commodity && !selectedState) {
                          const itemCommodity = item.commodity || item.name || '';
                          if (!itemCommodity) return false;
                          const itemCommodityLower = itemCommodity.toLowerCase().trim();
                          const commodityLower = commodity.toLowerCase().trim();
                          return itemCommodityLower === commodityLower || 
                                 itemCommodityLower.includes(commodityLower) ||
                                 commodityLower.includes(itemCommodityLower);
                        }
                        return true;
                      });
                      
                      if (commodity && !selectedState && filteredData.length > 0) {
                        filteredData.sort((a, b) => {
                          const stateA = (a.state || a.market?.state || '').toLowerCase();
                          const stateB = (b.state || b.market?.state || '').toLowerCase();
                          if (stateA !== stateB) return stateA.localeCompare(stateB);
                          const marketA = (a.market?.name || a.market || '').toLowerCase();
                          const marketB = (b.market?.name || b.market || '').toLowerCase();
                          return marketA.localeCompare(marketB);
                        });
                      }
                      
                      if (filteredData.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                              <Typography variant="body2" color="text.secondary">
                                {t('market.noPricesForCommodityAnyState', {
                                  commodity,
                                  defaultValue: 'No prices found for {{commodity}} in any state.'
                                })}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      return filteredData.map((item, index) => {
                        if (selectedState || commodity) {
                          const price = item;
                          const itemCommodity = price.commodity || price.name || 'Unknown';
                          const marketName = price.market?.name || price.market || price.location?.name || '-';
                          const marketLocation = price.market?.location || price.location?.city || price.state || '-';
                          
                          let priceValue = null;
                          let priceUnit = 'kg';
                          let pricePerKg = null;
                          let pricePerTon = null;
                          
                          if (price.price) {
                            if (typeof price.price === 'object') {
                              pricePerKg = price.price.perKg || price.price.value || price.price;
                              pricePerTon = price.price.perTon || (pricePerKg ? pricePerKg * 1000 : null);
                              priceValue = pricePerKg;
                              priceUnit = price.price.unit || 'kg';
                            } else {
                              priceValue = price.price;
                              pricePerKg = priceValue;
                              pricePerTon = priceValue * 1000;
                            }
                          }
                          
                          if (priceUnit === 'quintal' && priceValue) {
                            priceValue = priceValue / 100;
                            pricePerKg = priceValue;
                            pricePerTon = priceValue * 1000;
                            priceUnit = 'kg';
                          }
                          
                          if (pricePerKg && !pricePerTon) {
                            pricePerTon = pricePerKg * 1000;
                          }
                          if (pricePerTon && !pricePerKg) {
                            pricePerKg = pricePerTon / 1000;
                          }
                          
                          let comparePriceValue = null;
                          if (compareMode && comparePrices) {
                            const match = comparePrices.find(cp => 
                              (cp.commodity || cp.name) === itemCommodity &&
                              (cp.market?.name || cp.market) === marketName
                            );
                            if (match && match.price) {
                              let comparePrice = null;
                              if (typeof match.price === 'object') {
                                comparePrice = match.price.value || match.price;
                                if (match.price.unit === 'quintal' && comparePrice) {
                                  comparePrice = comparePrice / 100;
                                }
                              } else {
                                comparePrice = match.price;
                              }
                              comparePriceValue = comparePrice;
                            }
                          }
                          
                          const priceDifference = (priceValue && comparePriceValue !== null) 
                            ? priceValue - comparePriceValue 
                            : null;
                          const priceDifferencePercent = (priceValue && comparePriceValue !== null && comparePriceValue > 0)
                            ? ((priceDifference / comparePriceValue) * 100)
                            : null;
                          
                          let priceChange = 0;
                          if (price.priceChange) {
                            if (typeof price.priceChange === 'object') {
                              priceChange = price.priceChange.daily || price.priceChange.weekly || 0;
                            } else if (typeof price.priceChange === 'number') {
                              priceChange = price.priceChange;
                            }
                          }
                          priceChange = typeof priceChange === 'number' ? priceChange : 0;
                          
                          const dateStr = price.date || price.recordedAt || price.timestamp || new Date().toISOString();
                          const displayDate = new Date(dateStr).toLocaleDateString(locale);
                          
                          return (
                            <TableRow 
                              key={price.id || `price_${index}_${itemCommodity}`}
                              sx={{
                                '&:hover': {
                                  backgroundColor: 'action.hover',
                                  cursor: 'pointer'
                                }
                              }}
                              onClick={() => {
                                if (itemCommodity && itemCommodity !== 'Unknown') {
                                  setCommodity(itemCommodity);
                                  setSelectedCommodity(itemCommodity);
                                }
                              }}
                            >
                              <TableCell>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {itemCommodity}
                                </Typography>
                                {price.variety && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {price.variety}
                                  </Typography>
                                )}
                              </TableCell>
                            <TableCell>{marketName}</TableCell>
                  <TableCell>
                              {pricePerKg && typeof pricePerKg === 'number' && !isNaN(pricePerKg) ? (
                                <>
                                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                    ₹{pricePerKg.toFixed(2)} / kg
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.main', mt: 0.5 }}>
                                    ₹{pricePerTon ? pricePerTon.toLocaleString(locale, { maximumFractionDigits: 2 }) : (pricePerKg * 1000).toLocaleString(locale, { maximumFractionDigits: 2 })} / ton
                                  </Typography>
                                  {price.price?.originalValue && price.price?.originalUnit && price.price?.originalUnit !== 'kg' && (
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                                      (Original: ₹{typeof price.price.originalValue === 'number' ? price.price.originalValue.toFixed(2) : price.price.originalValue} / {price.price.originalUnit})
                                    </Typography>
                                  )}
                                </>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  {t('common.notAvailable')}
                                </Typography>
                              )}
                  </TableCell>
                            {compareMode && (
                              <TableCell>
                                {comparePriceValue && typeof comparePriceValue === 'number' && !isNaN(comparePriceValue) ? (
                                  <Typography variant="body2" color="text.secondary">
                                    ₹{comparePriceValue.toFixed(2)} / kg
                                  </Typography>
                                ) : (
                                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                    {t('common.noData', 'No data')}
                      </Typography>
                    )}
                  </TableCell>
                            )}
                  <TableCell>
                    <Chip
                      label={price.quality || t('market.standard', 'Standard')}
                      size="small"
                      variant="outlined"
                                color={price.quality === 'Grade A' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                                {getTrendIcon(priceChange)}
                      <Chip
                                  label={`${typeof priceChange === 'number' && !isNaN(priceChange) ? priceChange.toFixed(2) : '0.00'}%`}
                                  color={getTrendColor(priceChange)}
                        size="small"
                      />
                    </Box>
                  </TableCell>
                            {compareMode && (
                  <TableCell>
                                {priceDifference !== null && typeof priceDifference === 'number' ? (
                                  <Box>
                                    <Typography 
                                      variant="body2" 
                                      sx={{ 
                                        fontWeight: 600,
                                        color: priceDifference >= 0 ? 'success.main' : 'error.main'
                                      }}
                                    >
                                      {priceDifference >= 0 ? '+' : ''}₹{priceDifference.toFixed(2)}
                                    </Typography>
                                    {priceDifferencePercent !== null && (
                                      <Typography 
                                        variant="caption" 
                                        sx={{ 
                                          color: priceDifferencePercent >= 0 ? 'success.main' : 'error.main'
                                        }}
                                      >
                                        ({priceDifferencePercent >= 0 ? '+' : ''}{priceDifferencePercent.toFixed(2)}%)
                                      </Typography>
                                    )}
                                  </Box>
                                ) : (
                                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                            )}
                            <TableCell>
                              {marketLocation}
                            </TableCell>
                  <TableCell>
                              {displayDate}
                  </TableCell>
                </TableRow>
                        );
                        } else {
                          const aggregated = item;
                          
                          const comparePriceValue = compareMode && aggregatedComparePrices.has(aggregated.commodity)
                            ? aggregatedComparePrices.get(aggregated.commodity)
                            : null;
                          
                          const priceDifference = (aggregated.averagePrice && comparePriceValue !== null) 
                            ? aggregated.averagePrice - comparePriceValue 
                            : null;
                          const priceDifferencePercent = (aggregated.averagePrice && comparePriceValue !== null && comparePriceValue > 0)
                            ? ((priceDifference / comparePriceValue) * 100)
                            : null;
                          
                          return (
                            <TableRow 
                              key={aggregated.commodity || index}
                              sx={{
                                '&:hover': {
                                  backgroundColor: 'action.hover',
                                  cursor: 'pointer'
                                }
                              }}
                              onClick={() => {
                                if (aggregated.commodity && aggregated.commodity !== 'Unknown') {
                                  setCommodity(aggregated.commodity);
                                  setSelectedCommodity(aggregated.commodity);
                                }
                              }}
                            >
                              <TableCell>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {aggregated.commodity}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                  ₹{aggregated.averagePrice.toFixed(2)} / kg
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  ₹{aggregated.priceRange.min.toFixed(2)} - ₹{aggregated.priceRange.max.toFixed(2)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={t('market.marketCountChip', {
                                    count: aggregated.marketCount,
                                    suffix: aggregated.marketCount !== 1 ? 's' : '',
                                    defaultValue: '{{count}} market{{suffix}}'
                                  })}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              {compareMode && (
                                <TableCell>
                                  {comparePriceValue && typeof comparePriceValue === 'number' && !isNaN(comparePriceValue) ? (
                                    <Typography variant="body2" color="text.secondary">
                                      ₹{comparePriceValue.toFixed(2)} / kg
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                      {t('common.noData', 'No data')}
                                    </Typography>
                                  )}
                                </TableCell>
                              )}
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                  {getTrendIcon(aggregated.averageChange)}
                                  <Chip
                                    label={`${typeof aggregated.averageChange === 'number' && !isNaN(aggregated.averageChange) ? aggregated.averageChange.toFixed(2) : '0.00'}%`}
                                    color={getTrendColor(aggregated.averageChange)}
                                    size="small"
                                  />
                                </Box>
                              </TableCell>
                              {compareMode && (
                                <TableCell>
                                  {priceDifference !== null && typeof priceDifference === 'number' ? (
                                    <Box>
                                      <Typography 
                                        variant="body2" 
                                        sx={{ 
                                          fontWeight: 600,
                                          color: priceDifference >= 0 ? 'success.main' : 'error.main'
                                        }}
                                      >
                                        {priceDifference >= 0 ? '+' : ''}₹{priceDifference.toFixed(2)}
                                      </Typography>
                                      {priceDifferencePercent !== null && (
                                        <Typography 
                                          variant="caption" 
                                          sx={{ 
                                            color: priceDifferencePercent >= 0 ? 'success.main' : 'error.main'
                                          }}
                                        >
                                          ({priceDifferencePercent >= 0 ? '+' : ''}{priceDifferencePercent.toFixed(2)}%)
                                        </Typography>
                                      )}
                                    </Box>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                      -
                                    </Typography>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        }
                      });
                    })()}
            </TableBody>
          </Table>
        </TableContainer>
            </>
      ) : null}
      </LoadingState>
        </>
      )}

      {tabValue === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <UpdateIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                {t('market.marketUpdatesTab', 'Market Updates')}
              </Typography>
              {marketUpdates && marketUpdates.length > 0 && (
                <Chip 
                  label={marketUpdates.length} 
                  size="small" 
                  color="primary"
                />
              )}
            </Box>

            {marketUpdatesLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : !marketUpdates || marketUpdates.length === 0 ? (
              <Alert severity="info">
                {t('market.noUpdatesNow', 'No market updates available at the moment. Check back later for the latest market news.')}
        </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <AnimatePresence>
                  {marketUpdates.map((update, index) => (
                    <motion.div
                      key={update.id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card 
                        sx={{ 
                          borderLeft: `4px solid ${update.impact === 'positive' ? '#4caf50' : update.impact === 'negative' ? '#f44336' : '#2196f3'}`,
                          transition: 'transform 0.2s',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: 4
                          }
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <StoreIcon color="primary" sx={{ fontSize: 20 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                  {update.title}
                                </Typography>
                                {update.commodity && (
                                  <Chip 
                                    label={update.commodity} 
                                    size="small" 
                                    color="primary"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {update.message}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                <Chip 
                                  icon={<UpdateIcon />}
                                  label={formatTimeAgo(update.timestamp)}
                                  size="small"
                                  variant="outlined"
                                />
                                {update.source && (
                                  <Chip 
                                    label={t('market.sourceChip', { source: update.source, defaultValue: 'Source: {{source}}' })}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                                {update.impact && (
                                  <Chip 
                                    label={update.impact === 'positive' ? t('market.positiveImpact', 'Positive Impact') : update.impact === 'negative' ? t('market.negativeImpact', 'Negative Impact') : t('market.neutral', 'Neutral')}
                                    size="small"
                                    color={update.impact === 'positive' ? 'success' : update.impact === 'negative' ? 'error' : 'default'}
                                  />
                                )}
                              </Box>
                            </Box>
                            <IconButton 
                              size="small"
                              onClick={() => toggleUpdateExpand(update.id || index)}
                            >
                              {expandedUpdates[update.id || index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </Box>
                          
                          <Collapse in={expandedUpdates[update.id || index]}>
                            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                {t('market.additionalInformation', 'Additional Information')}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {update.details || t('market.noAdditionalDetails', 'No additional details available for this update.')}
                              </Typography>
                              {update.commodity && (
                                <Box sx={{ mt: 2 }}>
                                  <Button 
                                    variant="outlined" 
                                    size="small"
                                    onClick={() => {
                                      setTabValue(0);
                                      handleCommoditySelect(update.commodity);
                                    }}
                                  >
                                    {t('market.viewCommodityPrices', { commodity: update.commodity, defaultValue: 'View {{commodity}} Prices' })}
                                  </Button>
                                </Box>
                              )}
                            </Box>
                          </Collapse>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </Box>
            )}
          </Paper>
        </motion.div>
      )}
    </Container>
  );
}
