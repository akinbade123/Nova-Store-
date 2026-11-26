import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Development only: `/api` requests go to the API server (`npm run dev` in server/), so the
    // storefront and API share one origin, as they do in production. Only used when
    // VITE_USE_MOCK_DATA=false; sample-data mode never calls the API.
    proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:4000' },
  },
});
