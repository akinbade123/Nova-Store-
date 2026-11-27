import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command, mode }) => {
  // A production deploy on Vercel must talk to the real API. In sample-data mode, "accounts" and
  // "orders" live only in each shopper's browser, so a live site in that mode would quietly take orders
  // that never reach the server. Preview deploys may still use sample data.
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  if (command === 'build' && process.env.VERCEL_ENV === 'production' && env.VITE_USE_MOCK_DATA !== 'false') {
    throw new Error(
      'Production build refused: set VITE_USE_MOCK_DATA=false in the Vercel project settings (Production environment), so the live site uses the real API.',
    );
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Development only: `/api` requests go to the API server (`npm run dev` in server/), so the
      // storefront and API share one origin, as they do in production. Only used when
      // VITE_USE_MOCK_DATA=false; sample-data mode never calls the API.
      proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:4000' },
    },
  };
});
