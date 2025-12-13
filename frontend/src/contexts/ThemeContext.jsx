import React, { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider as MUIThemeProvider, createTheme, CssBaseline } from '@mui/material';
import logger from '../services/logger';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [mode] = useState('dark');

  const toggleTheme = () => {
    logger.debug('Dark theme is always enabled');
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark',
          primary: {
            main: '#4caf50', // Bright green for agriculture
            light: '#81c784',
            dark: '#388e3c',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#ff9800', // Orange for alerts
            light: '#ffb74d',
            dark: '#f57c00',
            contrastText: '#ffffff',
          },
          background: {
            default: '#0a0a0a', // Deep dark background
            paper: '#1a1a1a', // Slightly lighter for cards
            elevated: '#252525', // For elevated surfaces
          },
          text: {
            primary: '#ffffff',
            secondary: 'rgba(255, 255, 255, 0.7)',
            disabled: 'rgba(255, 255, 255, 0.5)',
          },
          success: {
            main: '#4caf50',
            light: '#81c784',
            dark: '#388e3c',
          },
          warning: {
            main: '#ff9800',
            light: '#ffb74d',
            dark: '#f57c00',
          },
          error: {
            main: '#f44336',
            light: '#e57373',
            dark: '#d32f2f',
          },
          info: {
            main: '#2196f3',
            light: '#64b5f6',
            dark: '#1976d2',
          },
          divider: 'rgba(255, 255, 255, 0.12)',
        },
        typography: {
          fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
          ].join(','),
          h4: {
            fontWeight: 600,
          },
          h5: {
            fontWeight: 600,
          },
          h6: {
            fontWeight: 600,
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: '#0a0a0a',
                color: '#ffffff',
                '&::-webkit-scrollbar': {
                  width: '10px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#1a1a1a',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#4caf50',
                  borderRadius: '5px',
                  '&:hover': {
                    background: '#388e3c',
                  },
                },
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: 8,
                fontWeight: 500,
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  borderColor: 'rgba(76, 175, 80, 0.3)',
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              },
              elevation1: {
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              },
              elevation3: {
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              },
            },
          },
          MuiContainer: {
            styleOverrides: {
              root: {
                paddingTop: 24,
                paddingBottom: 24,
                backgroundColor: 'transparent',
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#1a1a1a',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(76, 175, 80, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#4caf50',
                  },
                },
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: '#1a1a1a',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                backgroundColor: '#1a1a1a',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              },
            },
          },
        },
      }),
    [mode]
  );

  const value = {
    mode,
    toggleTheme,
    theme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};

