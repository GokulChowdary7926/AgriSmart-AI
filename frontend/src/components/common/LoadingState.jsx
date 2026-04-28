import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Alert,
  AlertTitle,
  Button,
  Skeleton
} from '@mui/material';
import {
  Refresh as RefreshCw,
  CheckCircle
} from '@mui/icons-material';
import logger from '../../services/logger';
import { useLanguage } from '../../contexts/LanguageContext';

const LoadingState = ({
  isLoading,
  error,
  retry,
  emptyMessage,
  dataLength,
  type = 'default',
  children
}) => {
  const { t } = useLanguage();
  const getFriendlyMessage = (value) => {
    if (!value) return t('errors.generic', 'Something went wrong. Please try again.');
    if (typeof value === 'string') return value;
    if (value instanceof Error && typeof value.message === 'string') return value.message;
    if (typeof value.message === 'string') return value.message;
    if (typeof value.error === 'string') return value.error;
    if (value.error && typeof value.error.message === 'string') return value.error.message;
    if (value.message && typeof value.message === 'object') {
      if (typeof value.message.message === 'string') return value.message.message;
      if (typeof value.message.error === 'string') return value.message.error;
    }
    if (value.response?.data) {
      const apiData = value.response.data;
      if (typeof apiData === 'string') return apiData;
      if (typeof apiData.message === 'string') return apiData.message;
      if (typeof apiData.error === 'string') return apiData.error;
      if (apiData.message && typeof apiData.message === 'object') {
        if (typeof apiData.message.message === 'string') return apiData.message.message;
        if (typeof apiData.message.error === 'string') return apiData.message.error;
      }
    }
    return t('errors.generic', 'Something went wrong. Please try again.');
  };

  React.useEffect(() => {
    if (isLoading) {
      logger.debug('Loading state: started loading');
    } else if (error) {
      logger.error('Loading state: error occurred', error);
    } else if (dataLength === 0) {
      logger.warn('Loading state: empty data returned');
    } else {
      logger.debug('Loading state: loading completed successfully');
    }
  }, [isLoading, error, dataLength]);

  const getSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <Box sx={{ space: 2 }}>
            <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 1 }} />
            <Skeleton variant="text" width="75%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="50%" height={20} />
          </Box>
        );
      case 'list':
        return (
          <Box>
            {[...Array(5)].map((_, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Skeleton variant="circular" width={48} height={48} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="75%" height={20} sx={{ mb: 0.5 }} />
                  <Skeleton variant="text" width="50%" height={16} />
                </Box>
              </Box>
            ))}
          </Box>
        );
      case 'table':
        return (
          <Box>
            <Skeleton variant="rectangular" height={40} sx={{ mb: 2, borderRadius: 1 }} />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </Box>
        );
      default:
        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              gap: 2
            }}
          >
            <CircularProgress size={48} />
            <Typography variant="body2" color="text.secondary">
              {t('common.loading', 'Loading...')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('common.pleaseWait', 'This may take a few moments')}
            </Typography>
          </Box>
        );
    }
  };

  if (error) {
    const friendlyMessage = getFriendlyMessage(error);
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          gap: 2
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 500, width: '100%' }}>
          <AlertTitle>{t('common.unableToLoadData', 'Unable to load data')}</AlertTitle>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {friendlyMessage}
          </Typography>
        </Alert>
        {retry && (
          <Button
            variant="contained"
            startIcon={<RefreshCw />}
            onClick={retry}
            sx={{ mt: 2 }}
          >
            {t('common.tryAgain', 'Try Again')}
          </Button>
        )}
      </Box>
    );
  }

  if (!isLoading && dataLength === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          gap: 2
        }}
      >
        <Alert severity="info" sx={{ maxWidth: 500, width: '100%' }}>
          <AlertTitle>{t('common.noDataAvailable', 'No Data Available')}</AlertTitle>
          <Typography variant="body2">
            {emptyMessage || t('common.noDataFound', 'No data found for your request')}
          </Typography>
        </Alert>
        {retry && (
          <Button
            variant="contained"
            startIcon={<RefreshCw />}
            onClick={retry}
            sx={{ mt: 2 }}
          >
            {t('common.refresh', 'Refresh')}
          </Button>
        )}
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ position: 'relative' }}>
        {getSkeleton()}
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: 'background.paper',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            boxShadow: 1
          }}
        >
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary">
            {t('common.loading', 'Loading...')}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {children}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'success.light',
          color: 'success.dark',
          px: 1.5,
          py: 0.5,
          borderRadius: 1,
          boxShadow: 1
        }}
      >
        <CheckCircle sx={{ fontSize: 16 }} />
        <Typography variant="caption" sx={{ fontWeight: 500 }}>
          {t('common.loadedSuccessfully', 'Loaded successfully')}
        </Typography>
      </Box>
    </Box>
  );
};

export const withLoading = (Component, options = {}) => {
  return function WithLoadingWrapper(props) {
    const [loadingState, setLoadingState] = React.useState({
      isLoading: true,
      error: null,
      data: null
    });

    const loadData = async () => {
      setLoadingState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const data = await options.loadData(props);
        setLoadingState({
          isLoading: false,
          error: null,
          data
        });
      } catch (error) {
        logger.error(`Failed to load data for ${Component.displayName || 'Component'}`, error);
        setLoadingState({
          isLoading: false,
          error,
          data: null
        });
      }
    };

    React.useEffect(() => {
      loadData();

      if (options.refreshInterval) {
        const interval = setInterval(loadData, options.refreshInterval);
        return () => clearInterval(interval);
      }
    }, []);

    return (
      <LoadingState
        isLoading={loadingState.isLoading}
        error={loadingState.error}
        retry={loadData}
        dataLength={loadingState.data ? (Array.isArray(loadingState.data) ? loadingState.data.length : 1) : 0}
        type={options.loadingType}
        emptyMessage={options.emptyMessage}
      >
        <Component {...props} data={loadingState.data} reloadData={loadData} />
      </LoadingState>
    );
  };
};

export default LoadingState;










