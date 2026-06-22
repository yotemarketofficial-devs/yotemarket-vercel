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
