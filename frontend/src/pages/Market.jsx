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
  Divider,
  IconButton,
  Collapse,
  Autocomplete
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AttachMoney as MoneyIcon,
  Store as StoreIcon,
  Update as UpdateIcon,
  FilterList as FilterIcon,
  CompareArrows as CompareIcon,
  Clear as ClearIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

export default function Market() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [commodity, setCommodity] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [expandedUpdates, setExpandedUpdates] = useState({});
  
  // Filter states
  const [selectedState, setSelectedState] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [timePeriod, setTimePeriod] = useState('all'); // 'all', '7days', '30days', 'custom'
  const [compareMode, setCompareMode] = useState(false);
  const [comparePeriod, setComparePeriod] = useState('7days'); // Period to compare with
  const [showFilters, setShowFilters] = useState(false);

  // Read commodity from URL params on mount
  useEffect(() => {
    const commodityParam = searchParams.get('commodity');
    if (commodityParam) {
      setCommodity(commodityParam);
      setSelectedCommodity(commodityParam);
    }
  }, [searchParams]);

  const { data: commodities } = useQuery({
    queryKey: ['market', 'commodities'],
    queryFn: async () => {
      const response = await api.get('/market/commodities');
      return response.data.data || [];
    }
  });

  // Get unique states from prices for filter dropdown
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

  // All Indian States and Union Territories
  const allIndianStates = [
    // States
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
    // Union Territories
    'Andaman and Nicobar Islands',
    'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi',
    'Jammu and Kashmir',
    'Ladakh',
    'Lakshadweep',
    'Puducherry'
  ];

  // Extract unique states from price data and combine with all Indian states
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
    
    // Combine states from data with all Indian states, prioritizing data states
    const combinedStates = new Set([...allIndianStates, ...statesFromData]);
    return Array.from(combinedStates).sort();
  }, [allPricesData]);

  // Fetch prices with filters
  const { data: prices, isLoading: pricesLoading } = useQuery({
    queryKey: ['market', 'prices', commodity, selectedState, selectedDate, timePeriod],
    queryFn: async () => {
      try {
        // Use a high limit to ensure we get prices for all daily-use commodities
        // With 70+ commodities and multiple markets per commodity, we need at least 5000 entries
        const params = { limit: 5000 };
        if (commodity) {
          params.commodity = commodity;
          // When commodity is selected without state, show prices from all states
          // Only filter by state if explicitly selected
          if (selectedState) params.state = selectedState;
        } else if (selectedState) {
          params.state = selectedState;
        }
        if (selectedDate) params.date = selectedDate;
        
      const response = await api.get('/market/prices', { params });
        
        const data = response.data.data || [];
        const actualPrices = data.filter(item => {
          if (item.price) return true;
          if (item.commodity && item.market) return true;
          return false;
        });

        // Apply time period filter
        let filteredPrices = actualPrices;
        if (timePeriod !== 'all') {
          const now = new Date();
          const periodDays = timePeriod === '7days' ? 7 : timePeriod === '30days' ? 30 : 0;
          
          if (periodDays > 0) {
            const cutoffDate = new Date(now);
            cutoffDate.setDate(cutoffDate.getDate() - periodDays);
            
            filteredPrices = actualPrices.filter(item => {
              const itemDate = new Date(item.date || item.recordedAt || item.timestamp);
              return itemDate >= cutoffDate;
            });
          }
        }

        // Apply state filter on frontend (always apply as backup, even if API filtered)
        if (selectedState) {
          filteredPrices = filteredPrices.filter(item => {
            const itemState = item.state || item.market?.state || item.market?.location || '';
            // Match exact state name or partial match
            const stateLower = selectedState.toLowerCase();
            const itemStateLower = itemState.toLowerCase();
            return itemStateLower === stateLower || 
                   itemStateLower.includes(stateLower) ||
                   stateLower.includes(itemStateLower);
          });
        }

        console.log(`Fetched ${filteredPrices.length} prices (filtered from ${actualPrices.length})`);
        return filteredPrices;
      } catch (error) {
        console.error('Error fetching prices:', error);
        return [];
      }
    },
    enabled: true,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000
  });

  // Aggregate prices by commodity when no state filter is applied
  const aggregatedPrices = useMemo(() => {
    if (!prices || prices.length === 0) return [];
    
    // If state filter is applied, return empty (we'll use prices directly)
    // If commodity is selected but no state, show detailed prices from all states (don't aggregate)
    if (selectedState || commodity) {
      return [];
    }
    
    // Aggregate by commodity: calculate average price per commodity
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
    
    // Convert to array with calculated averages
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

  // Fetch comparison data if compare mode is enabled (must be defined before aggregatedComparePrices)
  const { data: comparePrices } = useQuery({
    queryKey: ['market', 'prices', 'compare', commodity, selectedState, comparePeriod],
    queryFn: async () => {
      if (!compareMode) return null;
      
      try {
        // Use a high limit to ensure we get prices for all commodities
        const params = { limit: 5000 };
        if (commodity) params.commodity = commodity;
        // Don't filter by state when commodity is selected - show all states
        // Only filter by state if explicitly selected
        if (selectedState) params.state = selectedState;
        
      const response = await api.get('/market/prices', { params });
        const data = response.data.data || [];
        const actualPrices = data.filter(item => item.price || (item.commodity && item.market));

        // For comparison, we'll use all available prices and aggregate by commodity
        // The date filtering is less strict since we're comparing averages
        // If period is specified, we can optionally filter, but for now use all data
        // This ensures we have comparison data even if exact date matching fails
        return actualPrices;
      } catch (error) {
        console.error('Error fetching compare prices:', error);
        return [];
      }
    },
    enabled: compareMode,
    staleTime: 5 * 60 * 1000
  });

  // Aggregate compare prices by commodity (same logic as aggregatedPrices)
  const aggregatedComparePrices = useMemo(() => {
    if (!comparePrices || !Array.isArray(comparePrices) || comparePrices.length === 0) {
      return new Map();
    }
    
    // Aggregate by commodity: calculate average price per commodity
    const commodityMap = new Map();
    
    comparePrices.forEach(price => {
      const commodityName = price.commodity || price.name || 'Unknown';
      const priceValue = typeof price.price === 'object' ? price.price.value : price.price;
      
      if (!priceValue || isNaN(priceValue)) return;
      
      // Convert from quintal to kg if needed
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
    
    // Convert to Map with calculated averages
    const aggregatedMap = new Map();
    commodityMap.forEach((data, commodityName) => {
      const avgPrice = data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length;
      aggregatedMap.set(commodityName, avgPrice);
    });
    
    return aggregatedMap;
  }, [comparePrices]);

  const { data: trends, isLoading: trendsLoading } = useQuery({
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

  // Fetch market updates
  const { data: marketUpdates, isLoading: marketUpdatesLoading } = useQuery({
    queryKey: ['market', 'updates'],
    queryFn: async () => {
      try {
        // Try to get market-specific alerts/updates
        const response = await api.get('/alerts');
        const allAlerts = response.data.data || [];
        // Filter for market-related updates
        const marketAlerts = allAlerts.filter(alert => {
          const type = (alert.type || '').toLowerCase();
          const title = (alert.title || alert.message || '').toLowerCase();
          const message = (alert.message || '').toLowerCase();
          
          // Market-related keywords
          const marketKeywords = ['market', 'price', 'commodity', 'mandi', 'trading', 'export', 'import', 'demand', 'supply', 'harvest', 'procurement', 'msp', 'minimum support price'];
          
          return type === 'market' || 
                 marketKeywords.some(keyword => 
                   title.includes(keyword) || 
                   message.includes(keyword)
                 );
        });
        
        // Always return mock updates as fallback/primary source
        const mockUpdates = getMockMarketUpdates();
        
        // Combine real alerts with mock updates if real alerts exist
        if (marketAlerts.length > 0) {
          return [...marketAlerts, ...mockUpdates].slice(0, 10); // Limit to 10 updates
        }
        
        return mockUpdates;
      } catch (error) {
        console.error('Error fetching market updates:', error);
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
    // Update URL params when commodity is selected
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
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Market Prices & Trends
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Track commodity prices, market trends, and latest updates
      </Typography>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Prices & Trends" />
          <Tab label="Market Updates" />
        </Tabs>
      </Paper>

      {/* Prices & Trends Tab */}
      {tabValue === 0 && (
        <>
      <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Filters & Comparison</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={compareMode ? 'contained' : 'outlined'}
                  startIcon={<CompareIcon />}
                  onClick={() => setCompareMode(!compareMode)}
                  size="small"
                >
                  Compare
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
                      label="Search Commodity"
                      placeholder="Type to search commodities..."
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
                  noOptionsText="No commodities found"
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
                      <InputLabel>State</InputLabel>
              <Select
                        value={selectedState}
                        label="State"
                        onChange={(e) => setSelectedState(e.target.value)}
                      >
                        <MenuItem value="">
                          <em>All States</em>
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
                      label="Date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Time Period</InputLabel>
                      <Select
                        value={timePeriod}
                        label="Time Period"
                        onChange={(e) => setTimePeriod(e.target.value)}
                      >
                        <MenuItem value="all">All Time</MenuItem>
                        <MenuItem value="7days">Last 7 Days</MenuItem>
                        <MenuItem value="30days">Last 30 Days</MenuItem>
                        <MenuItem value="custom">Custom Range</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}
              
              {compareMode && (
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Compare With</InputLabel>
                    <Select
                      value={comparePeriod}
                      label="Compare With"
                      onChange={(e) => setComparePeriod(e.target.value)}
                    >
                      <MenuItem value="7days">Last 7 Days</MenuItem>
                      <MenuItem value="30days">Last 30 Days</MenuItem>
                      <MenuItem value="60days">Last 60 Days</MenuItem>
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
                    }}
                    disabled={!commodity && !selectedState && !selectedDate && timePeriod === 'all'}
                  >
                    Clear All
            </Button>
                </Box>
          </Grid>
        </Grid>
            
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {commodity ? `Showing prices for: ${commodity}` : 'Showing all crop prices'}
              </Typography>
              {selectedState && (
                <Chip 
                  label={`State: ${selectedState}`}
                  size="small"
                  color="primary"
                  onDelete={() => setSelectedState('')}
                />
              )}
              {selectedDate && (
                <Chip 
                  label={`Date: ${new Date(selectedDate).toLocaleDateString()}`}
                  size="small"
                  color="primary"
                  onDelete={() => setSelectedDate('')}
                />
              )}
              {timePeriod !== 'all' && (
                <Chip 
                  label={`Period: ${timePeriod}`}
                  size="small"
                  color="primary"
                  onDelete={() => setTimePeriod('all')}
                />
              )}
            </Box>
      </Paper>

      {selectedCommodity && trends && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Price Trends - {selectedCommodity}
          </Typography>
          {trends.statistics && (
            <Box mb={2}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Current Price
                      </Typography>
                      <Typography variant="h6">
                        ₹{trends.statistics.latest?.toFixed(2) || 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Average
                      </Typography>
                      <Typography variant="h6">
                        ₹{trends.statistics.average?.toFixed(2) || 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        High
                      </Typography>
                      <Typography variant="h6">
                        ₹{trends.statistics.max?.toFixed(2) || 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Low
                      </Typography>
                      <Typography variant="h6">
                        ₹{trends.statistics.min?.toFixed(2) || 'N/A'}
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
                    name="Average Price"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Paper>
      )}

      {pricesLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
          ) : ((selectedState || commodity) ? prices : aggregatedPrices) && ((selectedState || commodity) ? prices.length > 0 : aggregatedPrices.length > 0) ? (
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h6">
                    {selectedState 
                      ? `All Crop Prices in ${selectedState} (${prices.length} ${prices.length === 1 ? 'entry' : 'entries'})`
                      : commodity
                      ? `${commodity} Prices - All States (${prices.length} ${prices.length === 1 ? 'entry' : 'entries'})`
                      : `All Crop Prices - Average Market Prices (${aggregatedPrices.length} ${aggregatedPrices.length === 1 ? 'commodity' : 'commodities'})`
                    }
                    {compareMode && comparePrices && (
                      <Chip 
                        label={`vs ${comparePrices.length} in ${comparePeriod}`}
                        size="small"
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                  {selectedState ? (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Showing state-specific prices for {selectedState}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Average prices across all markets and states. Filter by state to see detailed prices.
                    </Typography>
                  )}
                </Box>
                <Chip 
                  label={`Last updated: ${new Date().toLocaleTimeString()}`}
                  size="small"
                  variant="outlined"
                />
              </Box>
              
              {/* Comparison Summary */}
              {compareMode && comparePrices && prices && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                    Price Comparison Summary
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Current Period Avg</Typography>
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
                        <Typography variant="caption" color="text.secondary">Compare Period Avg</Typography>
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
                        <Typography variant="caption" color="text.secondary">Price Difference</Typography>
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
                        <Typography variant="caption" color="text.secondary">Change %</Typography>
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
                      <TableCell sx={{ fontWeight: 600 }}>Commodity</TableCell>
                      {(selectedState || commodity) && (
                        <TableCell sx={{ fontWeight: 600 }}>Market</TableCell>
                      )}
                      <TableCell sx={{ fontWeight: 600 }}>
                        {(selectedState || commodity) ? 'Price (₹/kg)' : 'Average Price (₹/kg)'}
                      </TableCell>
                      {!(selectedState || commodity) && (
                        <TableCell sx={{ fontWeight: 600 }}>Price Range</TableCell>
                      )}
                      {!(selectedState || commodity) && (
                        <TableCell sx={{ fontWeight: 600 }}>Markets</TableCell>
                      )}
                      {compareMode && (
                        <TableCell sx={{ fontWeight: 600 }}>Compare Price</TableCell>
                      )}
                      {(selectedState || commodity) && (
                        <TableCell sx={{ fontWeight: 600 }}>Quality</TableCell>
                      )}
                      <TableCell sx={{ fontWeight: 600 }}>Price Change</TableCell>
                      {compareMode && (
                        <TableCell sx={{ fontWeight: 600 }}>Difference</TableCell>
                      )}
                      {(selectedState || commodity) && (
                        <TableCell sx={{ fontWeight: 600 }}>State</TableCell>
                      )}
                      {(selectedState || commodity) && (
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                      )}
              </TableRow>
            </TableHead>
            <TableBody>
                    {(() => {
                      // Get the data to display
                      const dataToShow = (selectedState || commodity) ? (prices || []) : (aggregatedPrices || []);
                      
                      if (!dataToShow || dataToShow.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                              <Typography variant="body2" color="text.secondary">
                                No prices available for the selected filters.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      // Filter the data
                      let filteredData = dataToShow.filter(item => {
                        // Filter out invalid entries
                        if (!item || (!item.commodity && !item.name)) return false;
                        // If commodity is selected, only show prices for that commodity from all states
                        // Backend already filters by commodity, but we do a case-insensitive check here as backup
                        if (commodity && !selectedState) {
                          const itemCommodity = item.commodity || item.name || '';
                          if (!itemCommodity) return false;
                          // Use case-insensitive matching - backend should have already filtered, but be lenient
                          const itemCommodityLower = itemCommodity.toLowerCase().trim();
                          const commodityLower = commodity.toLowerCase().trim();
                          // Match exact or if commodity name contains the search term
                          return itemCommodityLower === commodityLower || 
                                 itemCommodityLower.includes(commodityLower) ||
                                 commodityLower.includes(itemCommodityLower);
                        }
                        return true;
                      });
                      
                      // Debug: Log filtered data when commodity is selected
                      if (commodity && !selectedState) {
                        console.log(`[Market] Commodity: ${commodity}, Filtered data: ${filteredData.length} items`);
                        if (filteredData.length > 0) {
                          console.log(`[Market] First item:`, filteredData[0]);
                        }
                      }
                      
                      // Sort by state, then by market for better organization
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
                                No prices found for {commodity} in any state.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      return filteredData.map((item, index) => {
                        // If state filter or commodity is selected, show detailed prices from all states
                        if (selectedState || commodity) {
                          const price = item;
                          // Handle different data structures
                          const itemCommodity = price.commodity || price.name || 'Unknown';
                          const marketName = price.market?.name || price.market || price.location?.name || '-';
                          const marketLocation = price.market?.location || price.location?.city || price.state || '-';
                          
                          // Handle price - could be object with value or direct number
                          let priceValue = null;
                          let priceUnit = 'kg';
                          if (price.price) {
                            if (typeof price.price === 'object') {
                              priceValue = price.price.value || price.price;
                              priceUnit = price.price.unit || 'kg';
                            } else {
                              priceValue = price.price;
                            }
                          }
                          
                          // Convert from quintal to kg if needed
                          if (priceUnit === 'quintal' && priceValue) {
                            priceValue = priceValue / 100;
                            priceUnit = 'kg';
                          }
                          
                          // Find matching price in comparison data
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
                          
                          // Calculate price difference
                          const priceDifference = (priceValue && comparePriceValue !== null) 
                            ? priceValue - comparePriceValue 
                            : null;
                          const priceDifferencePercent = (priceValue && comparePriceValue !== null && comparePriceValue > 0)
                            ? ((priceDifference / comparePriceValue) * 100)
                            : null;
                          
                          // Handle price change - ensure it's always a number
                          let priceChange = 0;
                          if (price.priceChange) {
                            if (typeof price.priceChange === 'object') {
                              priceChange = price.priceChange.daily || price.priceChange.weekly || 0;
                            } else if (typeof price.priceChange === 'number') {
                              priceChange = price.priceChange;
                            }
                          }
                          // Ensure it's a number
                          priceChange = typeof priceChange === 'number' ? priceChange : 0;
                          
                          // Handle date
                          const dateStr = price.date || price.recordedAt || price.timestamp || new Date().toISOString();
                          const displayDate = new Date(dateStr).toLocaleDateString();
                          
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
                              {priceValue && typeof priceValue === 'number' && !isNaN(priceValue) ? (
                                <>
                                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                    ₹{priceValue.toFixed(2)} / {priceUnit}
                                  </Typography>
                                  {price.price?.originalValue && price.price?.originalUnit && price.price?.originalUnit !== priceUnit && (
                      <Typography variant="caption" color="text.secondary" display="block">
                                      (₹{typeof price.price.originalValue === 'number' ? price.price.originalValue.toFixed(2) : price.price.originalValue} / {price.price.originalUnit})
                                    </Typography>
                                  )}
                                </>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  N/A
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
                                    No data
                      </Typography>
                    )}
                  </TableCell>
                            )}
                  <TableCell>
                    <Chip
                      label={price.quality || 'Standard'}
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
                          // Show aggregated data (no state filter)
                          const aggregated = item;
                          
                          // Get compare price for this commodity
                          const comparePriceValue = compareMode && aggregatedComparePrices.has(aggregated.commodity)
                            ? aggregatedComparePrices.get(aggregated.commodity)
                            : null;
                          
                          // Calculate price difference
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
                                  label={`${aggregated.marketCount} market${aggregated.marketCount !== 1 ? 's' : ''}`}
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
                                      No data
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
      ) : (
        <Alert severity="info">
              No market prices available at the moment. Please try again later.
        </Alert>
          )}
        </>
      )}

      {/* Market Updates Tab */}
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
                Market Updates
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
                No market updates available at the moment. Check back later for the latest market news.
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
                                    label={`Source: ${update.source}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                                {update.impact && (
                                  <Chip 
                                    label={update.impact === 'positive' ? 'Positive Impact' : update.impact === 'negative' ? 'Negative Impact' : 'Neutral'}
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
                                Additional Information
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {update.details || 'No additional details available for this update.'}
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
                                    View {update.commodity} Prices
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
