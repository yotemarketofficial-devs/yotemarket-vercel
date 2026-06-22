import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';
import { AuthProvider } from './lib/useAuth.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { firebaseEnabled, initAnalytics } from './lib/firebase.js';

if (firebaseEnabled) {
  initAnalytics().catch(() => {});
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
