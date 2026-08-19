/* Plain Firebase configuration — deliberately imports NO Firebase SDK.
 *
 * Why this file exists: firebase.js pulls in app + app-check + auth + firestore +
 * functions + storage, which is 199 KB over the wire. Anything that only needs to
 * know WHETHER Firebase is configured (or the public client ids) used to import
 * firebase.js for it and dragged the whole SDK into the entry chunk — so the
 * marketing homepage, which never touches auth or Firestore, paid for all of it
 * before it could paint. Import from here for constants; import firebase.js only
 * where the SDK is genuinely used.
 *
 * Everything here is public and already ships in the client bundle.
 */

// Same Firebase project (`yotemarket-app`) as the mobile + rider Flutter apps, using
// the project's registered Web app config. Firebase web config is not a secret (it ships
// in every client bundle — exactly like the committed firebase_options.dart), so these
// are baked in as defaults; VITE_FIREBASE_* env vars still override for other environments.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDXt0Rpw_Cll8RQ_BO0riSKb8q7oZWvgYY',
  // Google/OAuth sign-in shows this host ("continue to …"). To brand it, point it at
  // auth.yotemarket.co.ke — but ONLY after that subdomain is live on Firebase Hosting
  // (it serves /__/auth/handler). Set VITE_FIREBASE_AUTH_DOMAIN=auth.yotemarket.co.ke in
  // Vercel then redeploy; leaving the fallback keeps sign-in working until it's verified.
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'yotemarket-app.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://yotemarket-app-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'yotemarket-app',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'yotemarket-app.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '494092523203',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:494092523203:web:6543ab44b7b1afceb77476',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-71V2WD4QSF',
};

// Backend region for callable Cloud Functions (matches firebase/functions/index.js).
export const FUNCTIONS_REGION = 'europe-west1';

// `firebaseEnabled` lets the whole app know whether a real backend is wired. When false,
// hooks fall back to demo data and auth runs in a local "guest" mode.
export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// Google OAuth *web* client id — the dedicated web client whose "Authorized JavaScript
// origins" list the production domains (yotemarket.com / yotemarket.co.ke), which is what
// Google One Tap (GIS) requires to render. Only the client *id* is used here; the client
// *secret* is a server-only credential and must never ship in the bundle. The id is public
// (it ships in every client bundle) so it's baked in as a default; VITE_GOOGLE_OAUTH_CLIENT_ID
// overrides. Empty → One Tap silently disables and the normal sign-in buttons still work.
export const GOOGLE_OAUTH_CLIENT_ID = firebaseEnabled
  ? (import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ||
     '494092523203-5lpuoneecgi0qbm4s9fpfr1v2g51dn0n.apps.googleusercontent.com')
  : '';

// Web Push (FCM) — VAPID *public* key from Firebase console → Cloud Messaging →
// Web Push certificates. Like the rest of the web config it's not a secret (it
// ships in the client bundle), so it's baked in as a default; VITE_FIREBASE_VAPID_KEY
// still overrides for other environments. Empty → push no-ops (in-app chat unaffected).
export const FCM_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  'BLo4iaFPDAG243CWvQPAZ2gBRi86_9e65QnILeieNvVZISX7Ol0wm-hJ0k0OB7K83xSJvPW8u_A1bpIa8Mg1TM4';
