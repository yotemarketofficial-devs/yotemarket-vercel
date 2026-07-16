import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
