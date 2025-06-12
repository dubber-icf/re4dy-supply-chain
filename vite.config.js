import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  },
  define: {
    // NOTE: Inject API base URL at build time for production
    __API_BASE__: JSON.stringify(process.env.VITE_RE4DY_API_BASE || 'https://re4dy-supply-chain.onrender.com/api' )
  },
  // NOTE: Ensure environment variables are available in development
  envPrefix: 'VITE_'
});
