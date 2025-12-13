import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Tabs,
  Tab,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../services/api';
import logger from '../services/logger';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';

const Analytics = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [insights, setInsights] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('30days');

  useEffect(() => {
    fetchDashboardData();
    fetchHistoricalData();
    fetchInsights();
  }, []);

  useEffect(() => {
    if (timeRange) {
      fetchHistoricalData();
    }
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      if (response.data.success && response.data.data) {
        setDashboardData(response.data.data);
      } else {
        setDashboardData({
          summary: { metrics: {} },
          marketTrends: [],
          recentActivity: [],
          farmInfo: {}
        });
      }
    } catch (error) {
      logger.error('Error fetching dashboard data', error);
      setDashboardData({
        summary: { metrics: {} },
        marketTrends: [],
        recentActivity: [],
        farmInfo: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async () => {
    try {
      const params = {};
      if (timeRange === '7days') {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        params.startDate = startDate.toISOString().split('T')[0];
        params.endDate = endDate.toISOString().split('T')[0];
      } else if (timeRange === '30days') {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        params.startDate = startDate.toISOString().split('T')[0];
        params.endDate = endDate.toISOString().split('T')[0];
      } else if (timeRange === '90days') {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        params.startDate = startDate.toISOString().split('T')[0];
        params.endDate = endDate.toISOString().split('T')[0];
      }
      const response = await api.get('/analytics/historical', { params });
      if (response.data && response.data.success && response.data.data) {
        const data = Array.isArray(response.data.data) ? response.data.data : [];
        setHistoricalData(data);
      } else {
        setHistoricalData([]);
      }
    } catch (error) {
      logger.error('Error fetching historical data', error);
      setHistoricalData([]);
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await api.get('/analytics/insights');
      if (response.data.success && response.data.data) {
        setInsights(response.data.data);
      } else {
        setInsights([]);
      }
    } catch (error) {
      logger.error('Error fetching insights', error);
      setInsights([]);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchDashboardData();
    fetchHistoricalData();
    fetchInsights();
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4 }}>
        <LinearProgress />
        <Typography variant="body2" align="center" sx={{ mt: 2 }}>
          {t('analytics.loading') || 'Loading analytics data...'}
        </Typography>
      </Container>
    );
  }

  const safeDashboardData = dashboardData || {};
  const safeSummary = (safeDashboardData.summary && typeof safeDashboardData.summary === 'object') 
    ? safeDashboardData.summary 
    : { metrics: {} };
  const safeFarmInfo = (safeDashboardData.farmInfo && typeof safeDashboardData.farmInfo === 'object')
    ? safeDashboardData.farmInfo
    : { size: 0, sizeUnit: 'ha' };
  const recentCrops = Array.isArray(safeDashboardData.recentCrops) ? safeDashboardData.recentCrops : [];
  const marketTrends = Array.isArray(safeDashboardData.marketTrends) ? safeDashboardData.marketTrends : [];

  if (!dashboardData) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography>{t('analytics.noData') || 'No data available'}</Typography>
      </Container>
    );
  }

  const revenueData = Array.isArray(historicalData) && historicalData.length > 0
    ? historicalData.map(item => ({
        date: item.date ? new Date(item.date).toLocaleDateString() : new Date().toLocaleDateString(),
        revenue: (item.metrics && typeof item.metrics.totalRevenue === 'number') ? item.metrics.totalRevenue : 0,
        expenses: (item.metrics && typeof item.metrics.totalExpenses === 'number') ? item.metrics.totalExpenses : 0
      }))
    : [
        { date: new Date().toLocaleDateString(), revenue: 0, expenses: 0 }
      ];

  const cropHealthData = [
    { name: t('analytics.healthy') || 'Healthy', value: safeSummary.metrics?.activeCrops || 0 },
    { name: t('analytics.needsAttention') || 'Needs Attention', value: (safeSummary.metrics?.totalCrops || 0) - (safeSummary.metrics?.activeCrops || 0) },
    { name: t('analytics.harvested') || 'Harvested', value: safeSummary.metrics?.harvestedCrops || 0 },
    { name: t('analytics.failed') || 'Failed', value: safeSummary.metrics?.failedCrops || 0 }
  ];

  const COLORS = ['#4caf50', '#ff9800', '#2196f3', '#f44336'];

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('analytics.title') || 'Analytics Dashboard'}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="contained" 
            color="primary"
            sx={{ minWidth: 40, width: 40, height: 40, borderRadius: '50%', p: 0 }}
            onClick={() => {
              const newItem = prompt('Add new item:');
              if (newItem) {
                logger.debug('Adding item', { item: newItem });
              }
            }}
            title="Add New Item"
          >
            +
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
            {t('analytics.refresh') || 'Refresh'}
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>{t('analytics.timeRange') || 'Time Range'}</InputLabel>
          <Select value={timeRange} label={t('analytics.timeRange') || 'Time Range'} onChange={(e) => setTimeRange(e.target.value)}>
            <MenuItem value="7days">{t('analytics.last7Days') || 'Last 7 Days'}</MenuItem>
            <MenuItem value="30days">{t('analytics.last30Days') || 'Last 30 Days'}</MenuItem>
            <MenuItem value="90days">{t('analytics.last90Days') || 'Last 90 Days'}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>{t('analytics.farmSize') || 'Farm Size'}</Typography>
              <Typography variant="h4">
                {safeFarmInfo && safeFarmInfo.size !== undefined ? safeFarmInfo.size : 0} 
                {' '}
                {safeFarmInfo && safeFarmInfo.sizeUnit ? safeFarmInfo.sizeUnit : (t('analytics.farmSizeUnit') || 'ha')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>{t('analytics.totalCrops') || 'Total Crops'}</Typography>
              <Typography variant="h4">{safeSummary.metrics?.totalCrops || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>{t('analytics.totalRevenue') || 'Total Revenue'}</Typography>
              <Typography variant="h4">{t('analytics.revenueUnit') || '₹'}{safeSummary.metrics?.totalRevenue || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>{t('analytics.averageHealth') || 'Average Health'}</Typography>
              <Typography variant="h4">{safeSummary.metrics?.averageHealth?.toFixed(1) || '0'}{t('analytics.healthUnit') || '%'}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>{t('analytics.revenueVsExpenses') || 'Revenue vs Expenses'}</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#4caf50" strokeWidth={2} />
                  <Line type="monotone" dataKey="expenses" stroke="#f44336" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>{t('analytics.cropDistributionChart') || 'Crop Distribution'}</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={Array.isArray(cropHealthData) ? cropHealthData : []} cx="50%" cy="50%" labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80} fill="#8884d8" dataKey="value">
                    {(Array.isArray(cropHealthData) ? cropHealthData : []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {Array.isArray(insights) && insights.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>{t('analytics.insights') || 'Insights'} & {t('analytics.recommendations') || 'Recommendations'}</Typography>
              <Grid container spacing={2}>
                {insights.map((insight, index) => (
                  <Grid item xs={12} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle1">{insight.title}</Typography>
                          <Chip label={insight.priority} size="small" color={insight.priority === 'high' ? 'error' : 'warning'} />
                        </Box>
                        <Typography color="text.secondary">{insight.message}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default Analytics;

