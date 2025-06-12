// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // <-- THE critical line – tells Vite to bundle React only once
    dedupe: ['react', 'react-dom'],
  },
});