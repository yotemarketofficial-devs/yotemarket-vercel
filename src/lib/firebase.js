// Firebase service layer for the YoteMarket web platform.
// Centralises app init + typed accessors for auth, Firestore, Functions (europe-west1),
// Storage and Analytics. Everything degrades gracefully when env config is absent so the
// UI still runs against bundled demo data during local/preview builds.
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

// Same Firebase project (`yotemarket-app`) as the mobile + rider Flutter apps, using
// the project's registered Web app config. Firebase web config is not a secret (it ships
// in every client bundle — exactly like the committed firebase_options.dart), so these
// are baked in as defaults; VITE_FIREBASE_* env vars still override for other environments.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDXt0Rpw_Cll8RQ_BO0riSKb8q7oZWvgYY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'yotemarket-app.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://yotemarket-app-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'yotemarket-app',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'yotemarket-app.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '494092523203',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:494092523203:web:6543ab44b7b1afceb77476',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-71V2WD4QSF',
};

// Backend region for callable Cloud Functions (matches firebase/functions/index.js).
const FUNCTIONS_REGION = 'europe-west1';

// `firebaseEnabled` lets the whole app know whether a real backend is wired. When false,
// hooks fall back to demo data and auth runs in a local "guest" mode.
export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app = null;
let auth = null;
let db = null;
let functions = null;
let storage = null;

if (firebaseEnabled) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    functions = getFunctions(app, FUNCTIONS_REGION);
    storage = getStorage(app);
    // Keep users signed in across reloads/tabs.
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  } catch (err) {
    // Misconfiguration shouldn't take the marketing site down.
    console.warn('[firebase] init failed — running in demo mode.', err);
    app = auth = db = functions = storage = null;
  }
}

export const googleProvider = firebaseEnabled ? new GoogleAuthProvider() : null;

export { app, auth, db, functions, storage };

// ── Callable helpers ─────────────────────────────────────────────────────────
// Each returns the function payload directly, or throws a friendly Error.
function callable(name) {
  return async (data) => {
    if (!functions) throw new Error('Backend not configured');
    const fn = httpsCallable(functions, name);
    const res = await fn(data);
    return res.data;
  };
}

/** AI chat completion → { reply, model }. messages:[{role,content}], system? */
export const aiChat = callable('aiChat');
/** Lipa na M-Pesa STK push → { checkoutRequestId, merchantRequestId }. */
export const mpesaStkPush = callable('mpesaStkPush');
/** Merchant subscription STK push → { checkoutRequestId, merchantRequestId }. */
export const subscribeMpesa = callable('subscribeMpesa');
/** Authoritative rider payout breakdown → { base, multi, distance, total, km }. */
export const computeRiderPayout = callable('computeRiderPayout');

// Lazily initialise Analytics only in the browser when supported + measurementId set.
export async function initAnalytics() {
  if (!app || !firebaseConfig.measurementId) return null;
  try {
    const { isSupported, getAnalytics } = await import('firebase/analytics');
    if (await isSupported()) return getAnalytics(app);
  } catch {
    /* analytics is best-effort */
  }
  return null;
}
