import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  useTheme as useMUITheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Agriculture as CropIcon,
  BugReport as DiseaseIcon,
  Cloud as WeatherIcon,
  LocalOffer as MarketIcon,
  Chat as ChatIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  AccountCircle as ProfileIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  AccountBalance as GovernmentSchemesIcon,
  Map as MapIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './common/LanguageSwitcher';
import i18n from 'i18next';

const drawerWidth = 240;

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useMUITheme();
  
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    const handleLanguageChange = () => {
      forceUpdate(prev => prev + 1);
    };
    
    window.addEventListener('languagechange', handleLanguageChange);
    window.addEventListener('i18n:languageChanged', handleLanguageChange);
    
    if (i18n) {
      i18n.on('languageChanged', handleLanguageChange);
    }
    
    return () => {
      window.removeEventListener('languagechange', handleLanguageChange);
      window.removeEventListener('i18n:languageChanged', handleLanguageChange);
      if (i18n) {
        i18n.off('languageChanged', handleLanguageChange);
      }
    };
  }, []);
  
  const menuItems = [
    { textKey: 'nav.dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { textKey: 'nav.crops', icon: <CropIcon />, path: '/crops' },
    { textKey: 'nav.cropRecommendation', icon: <CropIcon />, path: '/crop-recommendation' },
    { textKey: 'nav.diseases', icon: <DiseaseIcon />, path: '/diseases' },
    { textKey: 'nav.weather', icon: <WeatherIcon />, path: '/weather' },
    { textKey: 'nav.market', icon: <MarketIcon />, path: '/market' },
    { textKey: 'nav.governmentSchemes', icon: <GovernmentSchemesIcon />, path: '/government-schemes' },
    { textKey: 'nav.chatbot', icon: <ChatIcon />, path: '/chat' },
    { textKey: 'nav.agriChat', icon: <ChatIcon />, path: '/agri-chat' },
    { textKey: 'nav.analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { textKey: 'nav.agriMap', icon: <MapIcon />, path: '/agri-map' },
  ];

  const settingsItems = [
    { textKey: 'nav.settings', icon: <SettingsIcon />, path: '/settings' },
    { textKey: 'nav.profile', icon: <ProfileIcon />, path: '/profile' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          🌾 AgriSmart AI
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.textKey}
            selected={location.pathname === item.path}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={t(item.textKey)} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        {settingsItems.map((item) => (
          <ListItem
            button
            key={item.textKey}
            selected={location.pathname === item.path}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={t(item.textKey)} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: muiTheme.palette.mode === 'dark' ? 'background.paper' : 'primary.main',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {t('common.app_name') || 'Agricultural AI Platform'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LanguageSwitcher />
            <IconButton color="inherit">
              <Badge badgeContent={0} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <IconButton onClick={handleMenuClick} sx={{ p: 0 }}>
              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
                <ProfileIcon sx={{ mr: 1 }} /> {t('nav.profile')}
              </MenuItem>
              <MenuItem onClick={() => { navigate('/settings'); handleMenuClose(); }}>
                <SettingsIcon sx={{ mr: 1 }} /> {t('nav.settings')}
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} /> {t('auth.logout')}
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: muiTheme.palette.mode === 'dark' ? 'background.paper' : 'background.default',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: muiTheme.palette.mode === 'dark' ? 'background.paper' : 'background.default',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
