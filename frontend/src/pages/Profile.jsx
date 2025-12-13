import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  TextField,
  Divider,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../services/api';

export default function Profile() {
  const { user, farmer, loading } = useAuth();
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    state: '',
    district: '',
    village: '',
    pincode: ''
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user || farmer) {
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        state: farmer?.location?.state || '',
        district: farmer?.location?.district || '',
        village: farmer?.location?.village || '',
        pincode: farmer?.location?.pincode || ''
      });
    }
  }, [user, farmer]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setSaveLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await api.put('/auth/profile', {
        name: formData.name,
        phone: formData.phone,
        location: {
          state: formData.state,
          district: formData.district,
          village: formData.village,
          pincode: formData.pincode
        }
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully' });
        setIsEditing(false);
        window.location.reload();
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to update profile'
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (user || farmer) {
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        state: farmer?.location?.state || '',
        district: farmer?.location?.district || '',
        village: farmer?.location?.village || '',
        pincode: farmer?.location?.pincode || ''
      });
    }
    setMessage({ type: '', text: '' });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        {t('nav.profile') || 'Profile'}
      </Typography>

      {message.text && (
        <Alert severity={message.type === 'success' ? 'success' : 'error'} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={3}>
                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: 'primary.main',
                    fontSize: '2.5rem'
                  }}
                >
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <Box flexGrow={1}>
                  <Typography variant="h5" gutterBottom>
                    {user?.name || 'User'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <EmailIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                    {user?.email || 'No email'}
                  </Typography>
                  {user?.phone && (
                    <Typography variant="body2" color="text.secondary">
                      <PhoneIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                      {user.phone}
                    </Typography>
                  )}
                  {user?.role && (
                    <Chip
                      label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      color="primary"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>
                <Button
                  variant="contained"
                  startIcon={isEditing ? <CancelIcon /> : <EditIcon />}
                  onClick={isEditing ? handleCancel : () => setIsEditing(true)}
                  disabled={saveLoading}
                >
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('profile.personalInfo') || 'Personal Information'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('profile.name') || 'Name'}
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('profile.email') || 'Email'}
                    name="email"
                    value={formData.email}
                    disabled
                    helperText="Email cannot be changed"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('profile.phone') || 'Phone'}
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <LocationIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                {t('profile.location') || 'Location'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('profile.state') || 'State'}
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('profile.district') || 'District'}
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('profile.village') || 'Village'}
                    name="village"
                    value={formData.village}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('profile.pincode') || 'Pincode'}
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {farmer && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('profile.farmerDetails') || 'Farmer Details'}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  {farmer.landDetails?.totalArea && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        {t('profile.totalArea') || 'Total Area'}
                      </Typography>
                      <Typography variant="h6">
                        {farmer.landDetails.totalArea} {t('profile.acres') || 'acres'}
                      </Typography>
                    </Grid>
                  )}
                  {farmer.landDetails?.soilType && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        {t('profile.soilType') || 'Soil Type'}
                      </Typography>
                      <Typography variant="h6">
                        {farmer.landDetails.soilType}
                      </Typography>
                    </Grid>
                  )}
                  {farmer.farmingExperience && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        {t('profile.experience') || 'Experience'}
                      </Typography>
                      <Typography variant="h6">
                        {farmer.farmingExperience} {t('profile.years') || 'years'}
                      </Typography>
                    </Grid>
                  )}
                  {farmer.familyMembers && (
                    <Grid item xs={12} sm={6} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        {t('profile.familyMembers') || 'Family Members'}
                      </Typography>
                      <Typography variant="h6">
                        {farmer.familyMembers}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {isEditing && (
          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button
                variant="outlined"
                onClick={handleCancel}
                disabled={saveLoading}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={saveLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saveLoading}
              >
                {saveLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
















