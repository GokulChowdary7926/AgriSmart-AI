import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../services/api';

export default function Crops() {
  const [open, setOpen] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    variety: '',
    plantingDate: '',
    area: { value: '', unit: 'hectares' },
    status: 'planned'
  });
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const { data: crops, isLoading } = useQuery({
    queryKey: ['crops'],
    queryFn: async () => {
      const response = await api.get('/crops');
      return response.data.data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/crops', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crops']);
      enqueueSnackbar('Crop added successfully!', { variant: 'success' });
      handleClose();
    },
    onError: (error) => {
      enqueueSnackbar(error.response?.data?.error || 'Failed to add crop', { variant: 'error' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/crops/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crops']);
      enqueueSnackbar('Crop deleted successfully!', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(error.response?.data?.error || 'Failed to delete crop', { variant: 'error' });
    }
  });

  const handleOpen = (crop = null) => {
    if (crop) {
      setSelectedCrop(crop);
      setFormData({
        name: crop.name || '',
        type: crop.type || '',
        variety: crop.variety || '',
        plantingDate: crop.plantingDate ? crop.plantingDate.split('T')[0] : '',
        area: { value: crop.area?.value || '', unit: crop.area?.unit || 'hectares' },
        status: crop.status || 'planned'
      });
    } else {
      setSelectedCrop(null);
      setFormData({
        name: '',
        type: '',
        variety: '',
        plantingDate: '',
        area: { value: '', unit: 'hectares' },
        status: 'planned'
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedCrop(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Format data for backend - ensure area is properly structured
    const submitData = {
      ...formData,
      area: {
        value: parseFloat(formData.area.value) || 0,
        unit: formData.area.unit || 'hectares'
      },
      plantingDate: formData.plantingDate ? new Date(formData.plantingDate).toISOString() : new Date().toISOString()
    };
    createMutation.mutate(submitData);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this crop?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      planned: 'default',
      planted: 'info',
      growing: 'primary',
      flowering: 'warning',
      fruiting: 'success',
      harvested: 'success',
      failed: 'error'
    };
    return colors[status] || 'default';
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Crop Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Crop
        </Button>
      </Box>

      {crops && crops.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No crops found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Start by adding your first crop
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Add Your First Crop
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Variety</TableCell>
                <TableCell>Planting Date</TableCell>
                <TableCell>Area</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Health Score</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {crops?.map((crop) => (
                <TableRow key={crop._id}>
                  <TableCell>{crop.name}</TableCell>
                  <TableCell>{crop.type}</TableCell>
                  <TableCell>{crop.variety || '-'}</TableCell>
                  <TableCell>
                    {crop.plantingDate ? new Date(crop.plantingDate).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    {crop.area?.value} {crop.area?.unit}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={crop.status}
                      color={getStatusColor(crop.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{crop.healthScore || 100}%</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpen(crop)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(crop._id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{selectedCrop ? 'Edit Crop' : 'Add New Crop'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Crop Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Crop Type</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    label="Crop Type"
                    required
                  >
                    <MenuItem value="cereal">Cereal</MenuItem>
                    <MenuItem value="vegetable">Vegetable</MenuItem>
                    <MenuItem value="fruit">Fruit</MenuItem>
                    <MenuItem value="legume">Legume</MenuItem>
                    <MenuItem value="tuber">Tuber</MenuItem>
                    <MenuItem value="cash-crop">Cash Crop</MenuItem>
                    <MenuItem value="fodder">Fodder</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Variety"
                  value={formData.variety}
                  onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Planting Date"
                  type="date"
                  value={formData.plantingDate}
                  onChange={(e) => setFormData({ ...formData, plantingDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Area"
                  type="number"
                  value={formData.area.value}
                  onChange={(e) => setFormData({
                    ...formData,
                    area: { ...formData.area, value: e.target.value }
                  })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={formData.area.unit}
                    onChange={(e) => setFormData({
                      ...formData,
                      area: { ...formData.area, unit: e.target.value }
                    })}
                    label="Unit"
                  >
                    <MenuItem value="acres">Acres</MenuItem>
                    <MenuItem value="hectares">Hectares</MenuItem>
                    <MenuItem value="square-meters">Square Meters</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    label="Status"
                  >
                    <MenuItem value="planned">Planned</MenuItem>
                    <MenuItem value="planted">Planted</MenuItem>
                    <MenuItem value="growing">Growing</MenuItem>
                    <MenuItem value="flowering">Flowering</MenuItem>
                    <MenuItem value="fruiting">Fruiting</MenuItem>
                    <MenuItem value="harvested">Harvested</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isLoading}>
              {createMutation.isLoading ? <CircularProgress size={24} /> : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
}
