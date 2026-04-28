import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.js',
    globals: true,
    css: true,
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
          if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui';
          if (id.includes('recharts') || id.includes('framer-motion')) return 'vendor-charts-ui';
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-maps';
          if (id.includes('@tanstack/react-query')) return 'vendor-query';
          if (id.includes('socket.io-client')) return 'vendor-socket';
          if (id.includes('react-markdown') || id.includes('remark-gfm') || id.includes('rehype-raw')) return 'vendor-markdown';
          if (
            id.includes('/unified/') ||
            id.includes('/remark-') ||
            id.includes('/rehype-') ||
            id.includes('/micromark') ||
            id.includes('/mdast-') ||
            id.includes('/hast-') ||
            id.includes('/unist-') ||
            id.includes('/vfile') ||
            id.includes('/parse5') ||
            id.includes('/property-information') ||
            id.includes('/html-url-attributes') ||
            id.includes('/comma-separated-tokens') ||
            id.includes('/space-separated-tokens')
          ) {
            return 'vendor-markdown-core';
          }
          if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n';
          if (id.includes('axios')) return 'vendor-network';
          if (id.includes('notistack')) return 'vendor-notify';
          if (id.includes('@babel/runtime')) return 'vendor-runtime';
          if (id.includes('stylis') || id.includes('@emotion/cache')) return 'vendor-style-runtime';

          return 'vendor-misc';
        }
      }
    }
  },
  server: {
    port: 3030,
    host: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['Cache-Control'] = 'no-store';
          });
        }
      },
      '/health': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  },
  define: {
    'process.env': process.env
  }
})
