import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  plugins: [
    react(),
    mkcert(), // Habilita HTTPS local para mejor compatibilidad con API Web como NFC
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Asegura que todas las rutas se redirijan al index.html
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
        }
      }
    }
  },
  server: {
    https: true, // Habilita HTTPS para desarrollo local
    host: true, // Escucha en todas las interfaces de red
  }
});