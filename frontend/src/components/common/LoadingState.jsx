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
  ErrorOutline as AlertCircle,
  CheckCircle,
  HourglassEmpty as Loader2
} from '@mui/icons-material';
import logger from '../../services/logger';

const LoadingState = ({
  isLoading,
  error,
  retry,
  emptyMessage,
  dataLength,
  type = 'default',
  children
}) => {
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
              Loading data...
            </Typography>
            <Typography variant="caption" color="text.secondary">
              This may take a few moments
            </Typography>
          </Box>
        );
    }
  };

  if (error) {
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
          <AlertTitle>Unable to Load Data</AlertTitle>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {error.message || 'An unexpected error occurred'}
          </Typography>
          {error.code && (
            <Typography variant="caption" color="text.secondary">
              Error code: {error.code}
            </Typography>
          )}
        </Alert>
        {retry && (
          <Button
            variant="contained"
            startIcon={<RefreshCw />}
            onClick={retry}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
        )}
        <Button
          variant="text"
          size="small"
          onClick={() => {
            logger.error('User viewed error details', error);
          }}
        >
          View Technical Details
        </Button>
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
          <AlertTitle>No Data Available</AlertTitle>
          <Typography variant="body2">
            {emptyMessage || 'No data found for your request'}
          </Typography>
        </Alert>
        {retry && (
          <Button
            variant="contained"
            startIcon={<RefreshCw />}
            onClick={retry}
            sx={{ mt: 2 }}
          >
            Refresh
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
            Loading...
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
          Loaded successfully
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






