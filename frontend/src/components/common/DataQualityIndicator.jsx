import React, { useState } from 'react';
import {
  ErrorOutline as AlertCircle,
  CheckCircle,
  Refresh as RefreshCw,
  Storage as Database,
  Shield,
  AccessTime as Clock,
  Info
} from '@mui/icons-material';
import {
  Box,
  Chip,
  Tooltip,
  Typography,
  Popover,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Divider
} from '@mui/material';
import logger from '../../services/logger';

const DataQualityIndicator = ({ data, showDetails = false, className = '', onRefresh }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  if (!data || !data._quality) {
    return null;
  }

  const {
    confidence,
    isMockData,
    isFallback,
    dataFreshness,
    warnings,
    timestamp,
    source
  } = data._quality;

  const getQualityLevel = () => {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    if (confidence >= 0.5) return 'low';
    return 'poor';
  };

  const qualityLevel = getQualityLevel();
  const qualityColors = {
    high: { bg: 'success.light', text: 'success.dark', border: 'success.main' },
    medium: { bg: 'warning.light', text: 'warning.dark', border: 'warning.main' },
    low: { bg: 'error.light', text: 'error.dark', border: 'error.main' },
    poor: { bg: 'error.light', text: 'error.dark', border: 'error.main' }
  };

  const qualityIcons = {
    high: CheckCircle,
    medium: Info,
    low: AlertCircle,
    poor: AlertCircle
  };

  const Icon = qualityIcons[qualityLevel];
  const colors = qualityColors[qualityLevel];

  const handleClick = (event) => {
    if (showDetails) {
      setAnchorEl(event.currentTarget);
      logger.info('Data quality indicator clicked', {
        qualityLevel,
        confidence,
        isMockData,
        isFallback,
        source
      });
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Chip
        icon={<Icon sx={{ fontSize: 16 }} />}
        label={`${qualityLevel.toUpperCase()} CONFIDENCE (${Math.round(confidence * 100)}%)`}
        onClick={showDetails ? handleClick : undefined}
        sx={{
          bgcolor: colors.bg,
          color: colors.text,
          border: `1px solid`,
          borderColor: colors.border,
          fontSize: '0.7rem',
          height: '24px',
          cursor: showDetails ? 'pointer' : 'default',
          '&:hover': showDetails ? {
            bgcolor: colors.bg,
            opacity: 0.8
          } : {},
          ...className
        }}
        size="small"
      />

      {showDetails && (
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <Box sx={{ p: 2, minWidth: 300, maxWidth: 400 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Data Quality Information
            </Typography>
            <Divider sx={{ mb: 1.5 }} />

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Confidence Level
                </Typography>
                <Chip
                  label={`${Math.round(confidence * 100)}%`}
                  size="small"
                  sx={{
                    bgcolor: colors.bg,
                    color: colors.text,
                    fontWeight: 600
                  }}
                />
              </Box>

              <List dense sx={{ py: 0 }}>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Database fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Data Source"
                    secondary={isMockData ? 'Mock Data' : isFallback ? 'Fallback' : 'Live'}
                    primaryTypographyProps={{ variant: 'caption', fontWeight: 500 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>

                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Clock fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Data Freshness"
                    secondary={dataFreshness.charAt(0).toUpperCase() + dataFreshness.slice(1)}
                    primaryTypographyProps={{ variant: 'caption', fontWeight: 500 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>

                {timestamp && (
                  <ListItem sx={{ px: 0, py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Shield fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Last Updated"
                      secondary={new Date(timestamp).toLocaleString()}
                      primaryTypographyProps={{ variant: 'caption', fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                )}
              </List>
            </Box>

            {warnings && warnings.length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <AlertCircle fontSize="small" sx={{ color: 'warning.main' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Warnings
                    </Typography>
                  </Box>
                  <List dense sx={{ py: 0 }}>
                    {warnings.map((warning, index) => (
                      <ListItem key={index} sx={{ px: 0, py: 0.25 }}>
                        <ListItemText
                          primary={`• ${warning}`}
                          primaryTypographyProps={{
                            variant: 'caption',
                            sx: { color: 'warning.dark' }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </>
            )}

            {onRefresh && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshCw />}
                  onClick={() => {
                    onRefresh();
                    handleClose();
                  }}
                  sx={{ mt: 1 }}
                >
                  Refresh Data
                </Button>
              </>
            )}
          </Box>
        </Popover>
      )}
    </>
  );
};

export default DataQualityIndicator;






