import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Language as LanguageIcon,
  DarkMode as DarkModeIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import LanguageSwitcher from '../components/common/LanguageSwitcher';

export default function Settings() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { mode, toggleTheme } = useTheme();
  const [settings, setSettings] = useState({
    weatherAlerts: true,
    priceAlerts: true,
    diseaseAlerts: true,
    schemeAlerts: true,
    whatsapp: false,
    sms: true,
    email: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user?.preferences?.notifications) {
      setSettings(user.preferences.notifications);
    }
  }, [user]);

  const handleSettingChange = (setting) => (event) => {
    setSettings(prev => ({
      ...prev,
      [setting]: event.target.checked
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await api.put('/auth/preferences', {
        notifications: settings
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to save settings'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        {t('nav.settings') || 'Settings'}
      </Typography>

      {message.text && (
        <Alert severity={message.type === 'success' ? 'success' : 'error'} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <NotificationsIcon color="primary" />
                <Typography variant="h6">
                  {t('settings.notifications') || 'Notifications'}
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.weatherAlerts}
                      onChange={handleSettingChange('weatherAlerts')}
                    />
                  }
                  label={t('settings.weatherAlerts') || 'Weather Alerts'}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.priceAlerts}
                      onChange={handleSettingChange('priceAlerts')}
                    />
                  }
                  label={t('settings.priceAlerts') || 'Price Alerts'}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.diseaseAlerts}
                      onChange={handleSettingChange('diseaseAlerts')}
                    />
                  }
                  label={t('settings.diseaseAlerts') || 'Disease Alerts'}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.schemeAlerts}
                      onChange={handleSettingChange('schemeAlerts')}
                    />
                  }
                  label={t('settings.schemeAlerts') || 'Government Scheme Alerts'}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Communication Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('settings.communication') || 'Communication'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.sms}
                      onChange={handleSettingChange('sms')}
                    />
                  }
                  label={t('settings.sms') || 'SMS Notifications'}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.email}
                      onChange={handleSettingChange('email')}
                    />
                  }
                  label={t('settings.email') || 'Email Notifications'}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.whatsapp}
                      onChange={handleSettingChange('whatsapp')}
                    />
                  }
                  label={t('settings.whatsapp') || 'WhatsApp Notifications'}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Appearance Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <DarkModeIcon color="primary" />
                <Typography variant="h6">
                  {t('settings.appearance') || 'Appearance'}
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={mode === 'dark'}
                    onChange={toggleTheme}
                  />
                }
                label={t('settings.darkMode') || 'Dark Mode'}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Language Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <LanguageIcon color="primary" />
                <Typography variant="h6">
                  {t('settings.language') || 'Language'}
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('settings.selectLanguage') || 'Select your preferred language'}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <LanguageSwitcher />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={loading}
              size="large"
            >
              {loading ? 'Saving...' : (t('settings.save') || 'Save Settings')}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}


