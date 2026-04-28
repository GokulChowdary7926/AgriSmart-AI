import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Agriculture as CropIcon,
  BugReport as DiseaseIcon,
  Warning as AlertIcon,
  TrendingUp as TrendingIcon,
  LocalOffer as MarketIcon,
  Cloud as WeatherIcon,
  AccountBalance as SchemeIcon,
  Chat as ChatIcon,
  Analytics as AnalyticsIcon,
  ArrowForward as ArrowIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../services/api';
import logger from '../services/logger';
import { getBestAvailableLocation } from '../services/realtimeLocation';

const extractApiPayload = (responseData) => {
  const dataPayload = responseData?.data && typeof responseData.data === 'object' ? responseData.data : {};
  return {
    ...dataPayload,
    ...responseData
  };
};

export default function Dashboard() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const { data: dashboardLocation } = useQuery({
    queryKey: ['dashboard', 'location'],
    queryFn: async () => {
      try {
        return await getBestAvailableLocation(api, localStorage.getItem('language') || 'en');
      } catch {
        return null;
      }
    },
    staleTime: 10 * 60 * 1000
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: async () => {
      try {
        const response = await api.get('/analytics/dashboard');
        return extractApiPayload(response.data);
      } catch (error) {
        logger.error('Failed to fetch analytics', error);
        return {};
      }
    },
    refetchInterval: 30000,
    retry: 1,
    staleTime: 60000
  });

  const { data: cropsData, isLoading: cropsLoading } = useQuery({
    queryKey: ['crops', 'analytics'],
    queryFn: async () => {
      try {
        const response = await api.get('/crops/analytics');
        return extractApiPayload(response.data);
      } catch (error) {
        logger.error('Failed to fetch crops', error);
        return {};
      }
    },
    retry: 1,
    staleTime: 60000
  });

  const { data: weatherAlerts } = useQuery({
    queryKey: ['weather', 'alerts', dashboardLocation?.lat, dashboardLocation?.lng],
    queryFn: async () => {
      try {
        if (dashboardLocation?.lat && dashboardLocation?.lng) {
          const response = await api.get('/weather/alerts', {
            params: {
              lat: dashboardLocation.lat,
              lng: dashboardLocation.lng
            }
          });
          const payload = extractApiPayload(response.data);
          return payload.alerts || payload.data || [];
        }

        // Fallback to general alerts when location coordinates are not available.
        const alertsResponse = await api.get('/alerts');
        const payload = extractApiPayload(alertsResponse.data);
        return payload.alerts || payload.data || [];
      } catch (error) {
        try {
          const alertsResponse = await api.get('/alerts');
          const payload = extractApiPayload(alertsResponse.data);
          return payload.alerts || payload.data || [];
        } catch {
          return [];
        }
      }
    }
  });

  const { data: marketData } = useQuery({
    queryKey: ['market', 'dashboard', 'all-commodities'],
    queryFn: async () => {
      try {
        const response = await api.get('/market/prices', { params: { limit: 500 } });
        const payload = extractApiPayload(response.data);
        const data = payload.data || [];
        return data.filter(item => item.price || (item.commodity && item.market));
      } catch (error) {
        logger.error('Failed to fetch market prices', error);
        return [];
      }
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 1,
    staleTime: 2 * 60 * 1000 // Consider stale after 2 minutes
  });

  const { data: schemesData } = useQuery({
    queryKey: ['schemes', 'summary', dashboardLocation?.state, dashboardLocation?.district],
    queryFn: async () => {
      try {
        const profileLocation = user?.farmerProfile?.location || {};
        const farmerProfile = {
          location: {
            state: profileLocation.state || dashboardLocation?.state || '',
            district: profileLocation.district || dashboardLocation?.district || dashboardLocation?.city || ''
          },
          farmDetails: {
            landSize: user?.farmerProfile?.landDetails?.totalArea || 2.5,
            landOwnership: true
          },
          annualIncome: user?.farmerProfile?.annualIncome || 80000,
          cropsGrown: user?.farmerProfile?.landDetails?.crops?.map(c => c.name) || ['wheat', 'rice']
        };
        const response = await api.post('/government-schemes/recommend', {
          farmerProfile,
          filters: { showOnlyEligible: false }
        });
        return extractApiPayload(response.data);
      } catch {
        return {};
      }
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  useQuery({
    queryKey: ['diseases', 'recent'],
    queryFn: async () => {
      try {
        const response = await api.get('/diseases?limit=5');
        const payload = extractApiPayload(response.data);
        return payload.data || [];
      } catch {
        return [];
      }
    }
  });

  const stats = [
    {
      title: t('dashboard.activeCrops'),
      value: cropsData?.summary?.totalCrops || cropsData?.summary?.activeCrops || analytics?.cropStats?.topCrops?.length || 0,
      icon: <CropIcon sx={{ fontSize: 40 }} />,
      color: '#4caf50',
      link: '/crops'
    },
    {
      title: t('dashboard.diseaseDetections', 'Disease Detections'),
      value: analytics?.userStats?.diseaseDetections || analytics?.diseaseStats?.commonDiseases?.length || 0,
      icon: <DiseaseIcon sx={{ fontSize: 40 }} />,
      color: '#f44336',
      link: '/diseases'
    },
    {
      title: t('dashboard.weatherAlerts'),
      value: weatherAlerts?.length || analytics?.weatherStats?.alertStatus?.active || 0,
      icon: <AlertIcon sx={{ fontSize: 40 }} />,
      color: '#ff9800',
      link: '/weather'
    },
    {
      title: t('dashboard.eligibleSchemes', 'Eligible Schemes'),
      value: schemesData?.eligibleSchemes || schemesData?.totalSchemesFound || 0,
      icon: <SchemeIcon sx={{ fontSize: 40 }} />,
      color: '#2196f3',
      link: '/government-schemes'
    }
  ];

  const quickActions = [
    { title: t('nav.cropRecommendation'), icon: <CropIcon />, path: '/crop-recommendation', color: '#4caf50' },
    { title: t('dashboard.diseaseDetection', 'Disease Detection'), icon: <DiseaseIcon />, path: '/diseases', color: '#f44336' },
    { title: t('dashboard.marketPrices', 'Market Prices'), icon: <MarketIcon />, path: '/market', color: '#ff9800' },
    { title: t('dashboard.weatherForecast', 'Weather Forecast'), icon: <WeatherIcon />, path: '/weather', color: '#2196f3' },
    { title: t('nav.governmentSchemes'), icon: <SchemeIcon />, path: '/government-schemes', color: '#9c27b0' },
    { title: t('nav.agriChat'), icon: <ChatIcon />, path: '/agri-chat', color: '#00bcd4' },
    { title: t('nav.analytics'), icon: <AnalyticsIcon />, path: '/analytics', color: '#607d8b' }
  ];

  const marketTrendsData = React.useMemo(() => {
    if (!marketData || !Array.isArray(marketData) || marketData.length === 0) {
      if (analytics?.marketStats?.priceTrends && Array.isArray(analytics.marketStats.priceTrends)) {
        return analytics.marketStats.priceTrends.slice(0, 12).map(trend => ({
          commodity: trend.commodity || 'Unknown',
          price: trend.avgPrice || 0,
          change: trend.priceChange || 0
        }));
      }
      return [];
    }
    
    const commodityMap = new Map();
    
    marketData.forEach(price => {
      const commodityName = price.commodity || price.name || 'Unknown';
      const priceValue = typeof price.price === 'object' ? price.price.value : price.price;
      
      if (!priceValue || isNaN(priceValue)) return;
      
      if (!commodityMap.has(commodityName)) {
        commodityMap.set(commodityName, {
          commodity: commodityName,
          prices: [],
          priceChanges: []
        });
      }
      
      const commodityData = commodityMap.get(commodityName);
      commodityData.prices.push(priceValue);
      
      if (price.priceChange) {
        const change = typeof price.priceChange === 'object' 
          ? (price.priceChange.daily || price.priceChange.weekly || 0)
          : price.priceChange;
        if (typeof change === 'number' && !isNaN(change)) {
          commodityData.priceChanges.push(change);
        }
      }
    });
    
    const aggregated = Array.from(commodityMap.values()).map(data => {
      const avgPrice = data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length;
      const avgChange = data.priceChanges.length > 0
        ? data.priceChanges.reduce((sum, c) => sum + c, 0) / data.priceChanges.length
        : 0;
      
      return {
        commodity: data.commodity,
        price: avgPrice,
        change: avgChange,
        priceRange: {
          min: Math.min(...data.prices),
          max: Math.max(...data.prices)
        },
        sampleCount: data.prices.length
      };
    }).sort((a, b) => a.commodity.localeCompare(b.commodity));
    
    return aggregated.slice(0, 12);
  }, [marketData, analytics]);

  const localizeCommodityName = React.useCallback((value) => {
    const text = String(value || '').trim();
    if (!text || language !== 'ta') return text;
    const map = {
      groundnut: 'நிலக்கடலை',
      maize: 'மக்காச்சோளம்',
      'moong dal': 'பாசிப்பருப்பு',
      mustard: 'கடுகு',
      onion: 'வெங்காயம்',
      potato: 'உருளைக்கிழங்கு',
      rice: 'அரிசி',
      tomato: 'தக்காளி',
      'toor dal': 'துவரம் பருப்பு',
      wheat: 'கோதுமை'
    };
    return map[text.toLowerCase()] || text;
  }, [language]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {(analyticsLoading || cropsLoading) && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
        </Box>
      )}

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('dashboard.welcomeBack', { name: user?.name || t('dashboard.farmer', 'Farmer'), defaultValue: 'Welcome back, {{name}}! 👋' })}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {t('dashboard.overviewText', "Here's your comprehensive agricultural overview")}
        </Typography>
        {analytics?.userStats && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<CheckIcon />}
              label={t('dashboard.engagementScore', { score: analytics.userStats.engagementScore || 0, defaultValue: 'Engagement Score: {{score}}/100' })}
              color="primary"
              variant="outlined"
            />
            <Chip
              icon={<ScheduleIcon />}
              label={t('dashboard.totalQueries', { count: analytics.userStats.totalQueries || 0, defaultValue: 'Total Queries: {{count}}' })}
              color="secondary"
              variant="outlined"
            />
          </Box>
        )}
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${stat.color}15 0%, ${stat.color}05 100%)`,
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' }
              }}
              onClick={() => stat.link && navigate(stat.link)}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ color: stat.color }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: stat.color }}>
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('dashboard.quickActions', 'Quick Actions')}
        </Typography>
        <Grid container spacing={2}>
          {quickActions.map((action, index) => (
            <Grid item xs={6} sm={4} md={3} key={index}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={action.icon}
                endIcon={<ArrowIcon />}
                onClick={() => navigate(action.path)}
                sx={{
                  py: 2,
                  borderColor: action.color,
                  color: action.color,
                  '&:hover': {
                    borderColor: action.color,
                    bgcolor: `${action.color}10`
                  }
                }}
              >
                {action.title}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6">{t('dashboard.marketPriceTrends', 'Market Price Trends')}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard.marketPriceCaption', 'Average prices across all markets and states')}
                </Typography>
              </Box>
              <Button size="small" variant="outlined" onClick={() => navigate('/market')} endIcon={<ArrowIcon />}>
                {t('common.viewAll', 'View All')}
              </Button>
            </Box>
            {marketTrendsData.length > 0 ? (
              <List>
                {marketTrendsData.map((item, index) => (
                  <React.Fragment key={item.commodity || index}>
                    <ListItem
                      sx={{
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          cursor: 'pointer'
                        }
                      }}
                      onClick={() => navigate(`/market?commodity=${encodeURIComponent(item.commodity)}`)}
                    >
                      <ListItemIcon>
                        <MarketIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography component="span" variant="body1" sx={{ fontWeight: 500, display: 'inline-block' }}>
                            {localizeCommodityName(item.commodity)}
                            {item.priceRange && (
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                (₹{item.priceRange.min.toFixed(2)} - ₹{item.priceRange.max.toFixed(2)})
                              </Typography>
                            )}
                          </Typography>
                        }
                        secondary={
                          <Typography component="span" variant="body2" sx={{ fontWeight: 600, color: 'primary.main', display: 'inline-block' }}>
                            ₹{item.price?.toFixed(2) || item.price || 0}/kg
                            {item.sampleCount && (
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                • {item.sampleCount} {item.sampleCount === 1 ? t('market.marketLabel', 'market') : t('market.markets', 'markets')}
                              </Typography>
                            )}
                          </Typography>
                        }
                      />
                      <Chip
                        label={typeof item.change === 'number' && !isNaN(item.change) 
                          ? (item.change > 0 ? `+${item.change.toFixed(2)}%` : `${item.change.toFixed(2)}%`)
                          : '0.00%'
                        }
                        color={item.change > 0 ? 'success' : item.change < 0 ? 'error' : 'default'}
                        size="small"
                        icon={item.change > 0 ? <TrendingIcon /> : item.change < 0 ? <TrendingIcon sx={{ transform: 'rotate(180deg)' }} /> : null}
                      />
                    </ListItem>
                    {index < marketTrendsData.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Alert severity="info">{t('dashboard.noMarketData', 'No market data available. Check back later!')}</Alert>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboard.recentActivity', 'Recent Activity')}
            </Typography>
            {analytics?.userStats?.recentActivity && analytics.userStats.recentActivity.length > 0 ? (
              <List>
                {analytics.userStats.recentActivity.map((activity, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckIcon color="success" />
                    </ListItemIcon>
                    <ListItemText>
                      <Typography component="span">{activity}</Typography>
                    </ListItemText>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">{t('dashboard.noRecentActivity', 'No recent activity. Start using the platform to see your activity here!')}</Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{t('dashboard.recentCrops', 'Recent Crops')}</Typography>
              <Button size="small" onClick={() => navigate('/crops')}>
                {t('common.viewAll', 'View All')}
              </Button>
            </Box>
            {cropsData?.recentCrops && Array.isArray(cropsData.recentCrops) && cropsData.recentCrops.length > 0 ? (
              <List>
                {cropsData.recentCrops.slice(0, 5).map((crop, index) => (
                  <React.Fragment key={crop._id || crop.id || index}>
                    <ListItem>
                      <ListItemIcon>
                        <CropIcon color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary={crop.name || t('dashboard.unknownCrop', 'Unknown Crop')}
                        secondary={t('dashboard.cropStatusHealth', {
                          status: crop.status || t('dashboard.active', 'Active'),
                          health: crop.healthScore || t('common.notAvailable'),
                          defaultValue: 'Status: {{status}} | Health: {{health}}%'
                        })}
                      />
                    </ListItem>
                    {index < cropsData.recentCrops.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Alert severity="info">{t('dashboard.noCropsFound', 'No crops found. Add your first crop to get started!')}</Alert>
            )}
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{t('dashboard.weatherAlerts')}</Typography>
              <Button size="small" onClick={() => navigate('/weather')}>
                {t('common.viewAll', 'View All')}
              </Button>
            </Box>
            {weatherAlerts && Array.isArray(weatherAlerts) && weatherAlerts.length > 0 ? (
              <Box>
                {weatherAlerts.slice(0, 3).map((alert, index) => (
                  <Alert
                    key={index}
                    severity={alert.severity === 'warning' ? 'warning' : 'info'}
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="subtitle2">{alert.event || alert.title || t('dashboard.alert', 'Alert')}</Typography>
                    <Typography variant="body2">{alert.description || alert.message || ''}</Typography>
                  </Alert>
                ))}
              </Box>
            ) : (
              <Alert severity="success">{t('dashboard.noWeatherAlertsNow', 'No weather alerts at this time.')}</Alert>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{t('dashboard.recommendedSchemes', 'Recommended Schemes')}</Typography>
              <Button size="small" onClick={() => navigate('/government-schemes')}>
                {t('common.viewAll', 'View All')}
              </Button>
            </Box>
            {schemesData?.topRecommendations && Array.isArray(schemesData.topRecommendations) && schemesData.topRecommendations.length > 0 ? (
              <List>
                {schemesData.topRecommendations.slice(0, 3).map((scheme, index) => (
                  <React.Fragment key={scheme._id || scheme.id || index}>
                    <ListItem>
                      <ListItemIcon>
                        <SchemeIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={scheme.name || scheme.title || t('dashboard.unknownScheme', 'Unknown Scheme')}
                        secondary={scheme.category || scheme.description || t('governmentSchemes.general')}
                      />
                    </ListItem>
                    {index < schemesData.topRecommendations.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : schemesData?.allSchemes && Array.isArray(schemesData.allSchemes) && schemesData.allSchemes.length > 0 ? (
              <List>
                {schemesData.allSchemes.slice(0, 3).map((scheme, index) => (
                  <React.Fragment key={scheme._id || scheme.id || index}>
                    <ListItem>
                      <ListItemIcon>
                        <SchemeIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={scheme.name || scheme.title || t('dashboard.unknownScheme', 'Unknown Scheme')}
                        secondary={scheme.category || scheme.description || t('governmentSchemes.general')}
                      />
                    </ListItem>
                    {index < 2 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Alert severity="info">{t('dashboard.noSchemesNow', 'No schemes available. Check back later!')}</Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {analytics?.systemStats && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('dashboard.systemOverview', 'System Overview')}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">{t('dashboard.totalUsers', 'Total Users')}</Typography>
              <Typography variant="h6">{analytics.systemStats.totalUsers || 0}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">{t('dashboard.activeToday', 'Active Today')}</Typography>
              <Typography variant="h6">{analytics.systemStats.activeUsers || 0}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">{t('dashboard.cropRecommendations', 'Crop Recommendations')}</Typography>
              <Typography variant="h6">{analytics.systemStats.totalCropRecommendations || 0}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">{t('dashboard.diseaseDetections', 'Disease Detections')}</Typography>
              <Typography variant="h6">{analytics.systemStats.totalDiseaseDetections || 0}</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Container>
  );
}
