import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',   // Dev: permite acceso desde LAN (ej. http://10.0.0.25:5173)
    port: 5173,
    proxy: {
      // Dev con Docker/local:
      // - "backend" es el nombre del servicio en docker-compose dentro de la red de Docker.
      // - Si ejecutas frontend FUERA de Docker, cambia target a http://localhost:3001.
      '/api': { target: 'http://backend:3001', changeOrigin: true },
      '/socket.io': {
        // WebSocket proxy obligatorio para que Socket.IO funcione vía Vite.
        // Sin esta ruta, el navegador intenta conectar contra :5173 y falla el handshake.
        target: 'http://backend:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
