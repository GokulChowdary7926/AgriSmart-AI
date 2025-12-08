import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Agriculture as CropIcon,
  Assignment as TaskIcon,
  Warning as AlertIcon,
  TrendingUp as TrendingIcon,
  LocalOffer as MarketIcon,
  Cloud as WeatherIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();

  // Fetch dashboard data
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: async () => {
      try {
        const response = await api.get('/analytics/dashboard');
        return response.data.data || {};
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        return {}; // Return empty object on error
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 1, // Only retry once
    staleTime: 60000 // Consider data fresh for 1 minute
  });

  // Fetch crops data
  const { data: cropsData, isLoading: cropsLoading } = useQuery({
    queryKey: ['crops', 'analytics'],
    queryFn: async () => {
      try {
        const response = await api.get('/crops/analytics');
        return response.data.data || {};
      } catch (error) {
        console.error('Failed to fetch crops:', error);
        return {}; // Return empty object on error
      }
    },
    retry: 1,
    staleTime: 60000
  });

  // Fetch weather alerts
  const { data: weatherAlerts } = useQuery({
    queryKey: ['weather', 'alerts'],
    queryFn: async () => {
      try {
        const response = await api.get('/weather/alerts?lat=28.6139&lng=77.2090');
        return response.data.data || [];
      } catch {
        return [];
      }
    }
  });

  const stats = [
    {
      title: 'Active Crops',
      value: cropsData?.summary?.totalCrops || analytics?.summary?.metrics?.activeCrops || 0,
      icon: <CropIcon sx={{ fontSize: 40 }} />,
      color: '#4caf50'
    },
    {
      title: 'Pending Tasks',
      value: analytics?.summary?.metrics?.totalCrops || 0,
      icon: <TaskIcon sx={{ fontSize: 40 }} />,
      color: '#ff9800'
    },
    {
      title: 'Weather Alerts',
      value: weatherAlerts?.length || 0,
      icon: <AlertIcon sx={{ fontSize: 40 }} />,
      color: '#f44336'
    },
    {
      title: 'Market Trends',
      value: analytics?.marketTrends?.length || 0,
      icon: <MarketIcon sx={{ fontSize: 40 }} />,
      color: '#2196f3'
    }
  ];

  // Sample chart data
  const cropGrowthData = [
    { month: 'Jan', crops: 5 },
    { month: 'Feb', crops: 8 },
    { month: 'Mar', crops: 12 },
    { month: 'Apr', crops: 15 },
    { month: 'May', crops: 18 },
    { month: 'Jun', crops: 20 }
  ];

  const revenueData = [
    { month: 'Jan', revenue: 50000, expenses: 30000 },
    { month: 'Feb', revenue: 75000, expenses: 40000 },
    { month: 'Mar', revenue: 100000, expenses: 50000 },
    { month: 'Apr', revenue: 120000, expenses: 55000 },
    { month: 'May', revenue: 150000, expenses: 60000 },
    { month: 'Jun', revenue: 180000, expenses: 65000 }
  ];

  // Don't block rendering on loading - show data as it becomes available
  // if (analyticsLoading || cropsLoading) {
  //   return (
  //     <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
  //       <LinearProgress />
  //       <Typography variant="h6" sx={{ mt: 2 }}>Loading dashboard...</Typography>
  //     </Container>
  //   );
  // }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {(analyticsLoading || cropsLoading) && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
        </Box>
      )}
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome back, {user?.name || 'Farmer'}! 👋
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Here's your agricultural overview
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${stat.color}15 0%, ${stat.color}05 100%)` }}>
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

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Crop Growth Over Time
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cropGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="crops" stroke="#4caf50" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Revenue vs Expenses
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#4caf50" />
                <Bar dataKey="expenses" fill="#f44336" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Crops
            </Typography>
            {cropsData?.recentCrops && cropsData.recentCrops.length > 0 ? (
              <Box>
                {cropsData.recentCrops.map((crop, index) => (
                  <Box key={index} sx={{ py: 2, borderBottom: '1px solid #eee' }}>
                    <Typography variant="subtitle1">{crop.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Status: {crop.status} | Health: {crop.healthScore}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Alert severity="info">No crops found. Add your first crop to get started!</Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Weather Alerts
            </Typography>
            {weatherAlerts && weatherAlerts.length > 0 ? (
              <Box>
                {weatherAlerts.map((alert, index) => (
                  <Alert key={index} severity={alert.severity === 'warning' ? 'warning' : 'info'} sx={{ mb: 1 }}>
                    <Typography variant="subtitle2">{alert.event}</Typography>
                    <Typography variant="body2">{alert.description}</Typography>
                  </Alert>
                ))}
              </Box>
            ) : (
              <Alert severity="success">No weather alerts at this time.</Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
