import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/motion.css';
import './styles.css';
import { AuthProvider } from './lib/useAuth.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { firebaseEnabled, firebaseConfig } from './lib/firebase-config.js';
import { analyticsAllowed } from './lib/consent.js';
import { initMonitoring } from './lib/monitoring.js';

// Error reporting first, so a crash during start-up is still reported. No-ops
// without VITE_SENTRY_DSN, and loads the SDK lazily — never blocks first paint.
initMonitoring();

if (firebaseEnabled) {
  /* Google Analytics for Firebase, CONSENT-GATED.
   *
   * This used to start unconditionally on idle, so the COOKIE-SETTING tracker (GA4 ->
   * googletagmanager -> doubleclick) ran for everyone, while the COOKIELESS one (Vercel,
   * in components/Analytics.jsx) was carefully held back until "Accept all". That is the
   * wrong way round: consent.js already says non-essential analytics wait for consent
   * under Kenya's DPA 2019 — the code just did not do it.
   *
   * Google's own opt-out flag is set FIRST and kept in sync, because Firebase Analytics
   * cannot be un-initialised. Without it, someone who accepts and later withdraws would
   * keep being measured until they happened to reload the page.
   */
  const gaFlag = firebaseConfig.measurementId ? 'ga-disable-' + firebaseConfig.measurementId : null;
  const syncOptOut = () => { if (gaFlag) window[gaFlag] = !analyticsAllowed(); };
  syncOptOut();

  let started = false;
  const startAnalytics = () => {
    if (started || !analyticsAllowed()) return;
    started = true;
    import('./lib/firebase.js').then((m) => m.initAnalytics()).catch(() => {});
  };
  // Deferred to idle: analytics renders nothing and must not compete with first paint.
  const defer = (fn) => ('requestIdleCallback' in window
    ? window.requestIdleCallback(fn, { timeout: 5000 })
    : setTimeout(fn, 3000));

  defer(startAnalytics);
  // Accepting later starts it without a reload; withdrawing flips the opt-out flag.
  window.addEventListener('ym-consent-change', () => { syncOptOut(); defer(startAnalytics); });
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
