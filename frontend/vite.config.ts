import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    // Minificación y tree-shake por defecto; el lazy-load de rutas en App reduce JS inicial
    target: 'es2022',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 15173,
    proxy: {
      // [CAMBIO PRODUCCIÓN]: Si no usas Docker o cambias el nombre del servicio,
      // actualiza "http://backend:13001" por la IP o nombre de host de tu backend.
      '/api': { target: 'http://backend:3001', changeOrigin: true },
      '/uploads': { target: 'http://backend:3001', changeOrigin: true },
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
    testTimeout: 15000,
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
