import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  CircularProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

export default function Market() {
  const [commodity, setCommodity] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('');

  const { data: commodities } = useQuery({
    queryKey: ['market', 'commodities'],
    queryFn: async () => {
      const response = await api.get('/market/commodities');
      return response.data.data || [];
    }
  });

  const { data: prices, isLoading: pricesLoading } = useQuery({
    queryKey: ['market', 'prices', commodity],
    queryFn: async () => {
      const params = commodity ? { commodity } : {};
      const response = await api.get('/market/prices', { params });
      return response.data.data || [];
    },
    enabled: !!commodity
  });

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

  const handleCommoditySelect = (comm) => {
    setCommodity(comm);
    setSelectedCommodity(comm);
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

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Market Prices & Trends
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Track commodity prices and market trends
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Select Commodity</InputLabel>
              <Select
                value={commodity}
                label="Select Commodity"
                onChange={(e) => handleCommoditySelect(e.target.value)}
              >
                {commodities?.map((comm) => (
                  <MenuItem key={comm.name} value={comm.name}>
                    {comm.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => handleCommoditySelect(commodity)}
              disabled={!commodity}
            >
              View Prices
            </Button>
          </Grid>
        </Grid>
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
      ) : prices && prices.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Commodity</TableCell>
                <TableCell>Market</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Quality</TableCell>
                <TableCell>Price Change</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {prices.map((price, index) => (
                <TableRow key={index}>
                  <TableCell>{price.commodity}</TableCell>
                  <TableCell>{price.market?.name || '-'}</TableCell>
                  <TableCell>
                    ₹{price.price?.value?.toFixed(2)} / kg
                    {price.price?.originalValue && price.price?.originalUnit && price.price?.originalUnit !== 'kg' && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        (₹{price.price.originalValue?.toFixed(2)} / {price.price.originalUnit})
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={price.quality || 'Standard'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getTrendIcon(price.priceChange?.daily || 0)}
                      <Chip
                        label={`${(price.priceChange?.daily || 0).toFixed(2)}%`}
                        color={getTrendColor(price.priceChange?.daily || 0)}
                        size="small"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    {new Date(price.date).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info">
          Select a commodity to view market prices
        </Alert>
      )}
    </Container>
  );
}
