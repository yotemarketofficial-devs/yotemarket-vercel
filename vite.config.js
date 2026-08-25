import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Storage download endpoint sends no Access-Control-Allow-Origin, so /apk reads the
// release index from a same-origin path (lib/app-releases.js). vercel.json rewrites it in
// production; this is the dev-server equivalent, so `npm run dev` shows published builds
// rather than silently falling back to the bundled entries.
const STORAGE_HOST = 'https://firebasestorage.googleapis.com';
const RELEASE_INDEX_PATH = '/v0/b/yotemarket-app.firebasestorage.app/o/app_releases%2Findex.json?alt=media';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/app-releases.json': {
        target: STORAGE_HOST,
        changeOrigin: true,
        rewrite: () => RELEASE_INDEX_PATH,
      },
    },
  },
  build: {
    // Keep the Firebase SDK in its own long-cacheable vendor chunk so route code
    // and the marketing landing stay small.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Sentry MUST be matched before the react rule: `@sentry/react`'s path
            // contains "/react/", so it would otherwise be swallowed into the react
            // vendor chunk that every page loads (measured: 193 kB → 686 kB). Its
            // own chunk keeps it lazy — monitoring.js imports it dynamically and
            // only when a DSN is set.
            if (id.includes('@sentry')) return 'monitoring';
            if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
            if (id.includes('react-router')) return 'router';
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react';
          }
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
