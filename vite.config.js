import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command, mode }) => {
  // A production deploy on Vercel must either talk to the real API or say plainly that it's a demo.
  // In sample-data mode, "accounts" and "orders" live only in each shopper's browser, so an unlabelled
  // live site in that mode would quietly take orders that never reach the server.
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  if (command === 'build' && process.env.VERCEL_ENV === 'production') {
    const sampleData = env.VITE_USE_MOCK_DATA !== 'false';
    const demo = env.VITE_DEMO_SITE === 'true';
    if (sampleData && !demo) {
      throw new Error(
        'Production build refused: it would use sample data. Set VITE_USE_MOCK_DATA=false in Vercel (Production) to use the real API, or VITE_DEMO_SITE=true in .env.production to publish a labelled demo.',
      );
    }
    if (!sampleData && demo) {
      throw new Error(
        'Production build refused: VITE_DEMO_SITE=true tells shoppers their orders aren’t real, but VITE_USE_MOCK_DATA=false sends them to the real API. Remove VITE_DEMO_SITE from .env.production for the launch.',
      );
    }
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
