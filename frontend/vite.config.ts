import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // [CAMBIO PRODUCCIÓN]: Si no usas Docker o cambias el nombre del servicio,
      // actualiza "http://backend:3001" por la IP o nombre de host de tu backend.
      '/api': { target: 'http://backend:3001', changeOrigin: true },
      '/socket.io': {
        target: 'http://backend:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts'],
    },
    alias: { '@': path.resolve(__dirname, './src') },
  },
});

