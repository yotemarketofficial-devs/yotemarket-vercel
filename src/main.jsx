import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/motion.css';
import './styles.css';
import { AuthProvider } from './lib/useAuth.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { firebaseEnabled } from './lib/firebase-config.js';
import { initMonitoring } from './lib/monitoring.js';

// Error reporting first, so a crash during start-up is still reported. No-ops
// without VITE_SENTRY_DSN, and loads the SDK lazily — never blocks first paint.
initMonitoring();

if (firebaseEnabled) {
  // Analytics renders nothing, and importing it statically put the whole Firebase SDK
  // on the critical path. Deferred to idle so fetching it cannot compete with the first
  // paint or with the user's first interaction.
  const startAnalytics = () => import('./lib/firebase.js').then((m) => m.initAnalytics()).catch(() => {});
  if ('requestIdleCallback' in window) window.requestIdleCallback(startAnalytics, { timeout: 5000 });
  else setTimeout(startAnalytics, 3000);
} else if (import.meta.env.DEV) {
  console.info('[YoteMarket] Running in demo mode — set VITE_FIREBASE_* env vars to connect the backend.');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
);
