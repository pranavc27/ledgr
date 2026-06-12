import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During `vercel dev` the /api functions are routed automatically. When running
// the Vite dev server standalone, proxy /api to the local functions port.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.API_PROXY ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
