import React, { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider as MUIThemeProvider, createTheme, CssBaseline } from '@mui/material';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'dark'; // Default to dark theme
  });

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#2e7d32', // Green - consistent across all pages
            light: '#60ad5e',
            dark: '#005005',
          },
          secondary: {
            main: '#ff6f00', // Orange - consistent across all pages
            light: '#ff9f40',
            dark: '#c43e00',
          },
          background: {
            default: mode === 'dark' ? '#121212' : '#f5f5f5',
            paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
          success: {
            main: '#2e7d32',
            light: '#60ad5e',
            dark: '#005005',
          },
          warning: {
            main: '#ff6f00',
            light: '#ff9f40',
            dark: '#c43e00',
          },
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
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: 8,
                fontWeight: 500,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                boxShadow: mode === 'dark' 
                  ? '0 2px 8px rgba(0,0,0,0.3)' 
                  : '0 2px 8px rgba(0,0,0,0.1)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
              elevation1: {
                boxShadow: mode === 'dark' 
                  ? '0 1px 3px rgba(0,0,0,0.3)' 
                  : '0 1px 3px rgba(0,0,0,0.12)',
              },
              elevation3: {
                boxShadow: mode === 'dark' 
                  ? '0 2px 8px rgba(0,0,0,0.3)' 
                  : '0 2px 8px rgba(0,0,0,0.1)',
              },
            },
          },
          MuiContainer: {
            styleOverrides: {
              root: {
                paddingTop: 24,
                paddingBottom: 24,
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

