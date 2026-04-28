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
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api, { getApiErrorMessage } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export const getCropMutationMode = (selectedCrop) => (selectedCrop?._id ? 'update' : 'create');

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
  const { t } = useLanguage();

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
      enqueueSnackbar(t('crops.addSuccess', 'Crop added successfully!'), { variant: 'success' });
      handleClose();
    },
    onError: (error) => {
      enqueueSnackbar(getApiErrorMessage(error, t('crops.addFailed', 'Failed to add crop')), { variant: 'error' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/crops/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crops']);
      enqueueSnackbar(t('crops.updateSuccess', 'Crop updated successfully!'), { variant: 'success' });
      handleClose();
    },
    onError: (error) => {
      enqueueSnackbar(getApiErrorMessage(error, t('crops.updateFailed', 'Failed to update crop')), { variant: 'error' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/crops/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['crops']);
      enqueueSnackbar(t('crops.deleteSuccess', 'Crop deleted successfully!'), { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(getApiErrorMessage(error, t('crops.deleteFailed', 'Failed to delete crop')), { variant: 'error' });
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
    const submitData = {
      ...formData,
      area: {
        value: parseFloat(formData.area.value) || 0,
        unit: formData.area.unit || 'hectares'
      },
      plantingDate: formData.plantingDate ? new Date(formData.plantingDate).toISOString() : new Date().toISOString()
    };
    if (getCropMutationMode(selectedCrop) === 'update') {
      updateMutation.mutate({ id: selectedCrop._id, data: submitData });
      return;
    }
    createMutation.mutate(submitData);
  };

  const handleDelete = (id) => {
    if (window.confirm(t('crops.deleteConfirm', 'Are you sure you want to delete this crop?'))) {
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
          {t('crops.managementTitle', 'Crop Management')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          {t('crops.addCrop')}
        </Button>
      </Box>

      {crops && crops.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('crops.noCropsFound', 'No crops found')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('crops.addFirstHint', 'Start by adding your first crop')}
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            {t('crops.addFirst', 'Add Your First Crop')}
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('crops.cropName', 'Name')}</TableCell>
                <TableCell>{t('crops.cropType', 'Type')}</TableCell>
                <TableCell>{t('crops.variety', 'Variety')}</TableCell>
                <TableCell>{t('crops.plantingDate', 'Planting Date')}</TableCell>
                <TableCell>{t('crops.area', 'Area')}</TableCell>
                <TableCell>{t('crops.status', 'Status')}</TableCell>
                <TableCell>{t('crops.healthScore', 'Health Score')}</TableCell>
                <TableCell>{t('common.actions', 'Actions')}</TableCell>
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
                    <IconButton
                      size="small"
                      aria-label={t('common.edit', 'Edit')}
                      onClick={() => handleOpen(crop)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label={t('common.delete', 'Delete')}
                      onClick={() => handleDelete(crop._id)}
                    >
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
          <DialogTitle>{selectedCrop ? t('crops.editCrop') : t('crops.addNewCrop', 'Add New Crop')}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('crops.cropName', 'Crop Name')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('crops.cropType', 'Crop Type')}</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    label={t('crops.cropType', 'Crop Type')}
                    required
                  >
                    <MenuItem value="cereal">{t('crops.typeCereal', 'Cereal')}</MenuItem>
                    <MenuItem value="vegetable">{t('crops.typeVegetable', 'Vegetable')}</MenuItem>
                    <MenuItem value="fruit">{t('crops.typeFruit', 'Fruit')}</MenuItem>
                    <MenuItem value="legume">{t('crops.typeLegume', 'Legume')}</MenuItem>
                    <MenuItem value="tuber">{t('crops.typeTuber', 'Tuber')}</MenuItem>
                    <MenuItem value="cash-crop">{t('crops.typeCashCrop', 'Cash Crop')}</MenuItem>
                    <MenuItem value="fodder">{t('crops.typeFodder', 'Fodder')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('crops.variety', 'Variety')}
                  value={formData.variety}
                  onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('crops.plantingDate', 'Planting Date')}
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
                  label={t('crops.area', 'Area')}
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
                  <InputLabel>{t('crops.unit', 'Unit')}</InputLabel>
                  <Select
                    value={formData.area.unit}
                    onChange={(e) => setFormData({
                      ...formData,
                      area: { ...formData.area, unit: e.target.value }
                    })}
                    label={t('crops.unit', 'Unit')}
                  >
                    <MenuItem value="acres">{t('crops.unitAcres', 'Acres')}</MenuItem>
                    <MenuItem value="hectares">{t('crops.unitHectares', 'Hectares')}</MenuItem>
                    <MenuItem value="square-meters">{t('crops.unitSquareMeters', 'Square Meters')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('crops.status')}</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    label={t('crops.status')}
                  >
                    <MenuItem value="planned">{t('crops.statusPlanned', 'Planned')}</MenuItem>
                    <MenuItem value="planted">{t('crops.statusPlanted', 'Planted')}</MenuItem>
                    <MenuItem value="growing">{t('crops.statusGrowing', 'Growing')}</MenuItem>
                    <MenuItem value="flowering">{t('crops.statusFlowering', 'Flowering')}</MenuItem>
                    <MenuItem value="fruiting">{t('crops.statusFruiting', 'Fruiting')}</MenuItem>
                    <MenuItem value="harvested">{t('crops.statusHarvested', 'Harvested')}</MenuItem>
                    <MenuItem value="failed">{t('crops.statusFailed', 'Failed')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>{t('common.cancel')}</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isLoading || updateMutation.isLoading}
            >
              {(createMutation.isLoading || updateMutation.isLoading)
                ? <CircularProgress size={24} />
                : t('common.save')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
}
