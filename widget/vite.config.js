import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Widget is served by the Flask backend at /, so emit relative asset URLs and
// proxy /api in dev to the backend on :8080.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
});
