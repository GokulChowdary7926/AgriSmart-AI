import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      // Fix Fast Refresh for context hooks
      fastRefresh: true
    })
  ],
  server: {
    port: 3030,
    hmr: {
      overlay: true
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'ws://localhost:5001',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  optimizeDeps: {
    include: [
      'i18next', 
      'react-i18next', 
      'i18next-browser-languagedetector', 
      'i18next-http-backend',
      '@mui/icons-material',
      '@mui/material',
      'react-leaflet',
      'leaflet'
    ],
    exclude: [],
    force: true
  }
});

