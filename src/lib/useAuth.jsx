// Auth context for the whole web platform. Wraps Firebase Auth (email/password + Google)
// with session persistence and exposes a small, friendly API. When Firebase isn't
// configured it runs a local "guest" mode so the prototypes stay fully interactive.
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { setMonitoringUser } from './monitoring.js';
// Firebase is 199 KB over the wire, and the marketing pages (/, /about, /pricing …)
// never touch auth or Firestore — yet importing the SDK here put all of it in the entry
// chunk, so the homepage paid for it before it could paint. The SDK is now fetched on
// demand. `loading` starts true and only clears once the SDK has loaded AND the first
// auth callback has fired, so a signed-in user never flashes as signed out; screens
// already wait on that flag.
import { firebaseEnabled } from './firebase-config.js';

let sdkPromise = null;
/** Load (once) the Firebase SDK plus our initialised instances. */
function sdk() {
  if (!sdkPromise) {
    sdkPromise = Promise.all([
      import('./firebase.js'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]).then(([core, fbAuth, fbStore]) => ({
      ...fbAuth, ...fbStore,
      auth: core.auth, db: core.db, googleProvider: core.googleProvider,
    }));
  }
  return sdkPromise;
}

const AuthContext = createContext(null);

// Stash the post-auth destination across a full-page Google redirect so a user who
// signs in under a role that lives in another app still lands there on return.
const REDIRECT_DEST_KEY = 'ym:postAuthDest';

function friendlyError(err) {
  const code = err?.code || '';
  const map = {
    'auth/invalid-email': 'That email address looks invalid.',
    'auth/user-not-found': 'No account found with those details.',
    'auth/wrong-password': 'Incorrect password — try again.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/email-already-in-use': 'An account with that email already exists.',
    'auth/weak-password': 'Choose a stronger password (6+ characters).',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled.',
    'auth/popup-blocked': 'Your browser blocked the sign-in popup — redirecting you instead…',
    'auth/too-many-requests': 'Too many attempts — please wait a moment.',
    'auth/network-request-failed': 'Network problem — check your connection and try again.',
    'auth/account-exists-with-different-credential':
      'You already have an account with this email — sign in with your original method (e.g. email + password), then link Google in settings.',
    'auth/unauthorized-domain':
      'This site isn’t authorised for Google sign-in yet. Add this domain under Firebase → Authentication → Settings → Authorized domains.',
    'auth/operation-not-supported-in-this-environment':
      'Google sign-in isn’t supported in this browser — try your device’s default browser.',
  };
  return map[code] || err?.message || 'Something went wrong. Please try again.';
}

// In-app webviews (Instagram, Facebook, TikTok, WhatsApp, …) and some locked-down
// browsers can't run OAuth popups reliably — go straight to full-page redirect there.
function popupUnreliable() {
  if (typeof window === 'undefined') return true;
  const ua = navigator.userAgent || '';
  const inApp = /(FBAN|FBAV|Instagram|Line|Twitter|WhatsApp|WeChat|MicroMessenger|TikTok|Musical_ly|Snapchat|GSA)/i.test(ua);
  return inApp || typeof window.open !== 'function';
}
// Popup failed for a reason a redirect can recover from (blocked, unsupported env,
// or COOP tearing down the popup handle) → fall back to redirect automatically.
function shouldFallbackToRedirect(err) {
  const code = err?.code || '';
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/operation-not-supported-in-this-environment' ||
    code === 'auth/web-storage-unsupported' ||
    code === 'auth/internal-error' // often a COOP-severed popup on strict hosts
  );
}

// Make a Google sign-in double as a sign-up: ensure the user has a users/{uid}
// profile doc (mirrors what registerEmail writes for email accounts) so their
// name/email/photo are persisted server-side on first Google login.
// Ensure the signed-in user has a complete users/{uid} profile doc. Google provides
// name/email/photo (but no phone); email sign-ups seed name/phone via registerEmail.
// This backfills any MISSING identity fields — without clobbering user-edited values —
// so every account, however it signed in, has consistent profile data downstream
// (profile screen, chat display name, order/customer name). Field names match the rest
// of the app: account.js + profile.jsx read `photoUrl` (lowercase).
async function ensureUserProfile(user) {
  if (!firebaseEnabled || !user || !user.uid || user.isGuest || user.uid === 'guest') return;
  try {
    const { db, doc, getDoc, setDoc, serverTimestamp } = await sdk();
    if (!db) return;
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref).catch(() => null);
    const data = (snap && snap.exists() && snap.data()) || null;
    const patch = { updatedAt: serverTimestamp() };
    if (!data) patch.createdAt = serverTimestamp();
    if (user.displayName && !(data && data.name)) patch.name = user.displayName;
    if (user.email && !(data && data.email)) patch.email = user.email;
    if (user.photoURL && !(data && data.photoUrl)) patch.photoUrl = user.photoURL;
    if (!(data && data.provider)) {
      const isGoogle = (user.providerData || []).some((p) => p?.providerId === 'google.com');
      patch.provider = isGoogle ? 'google' : 'password';
    }
    // Existing doc with nothing new to fill → skip the write (avoid churn every load).
    if (data && Object.keys(patch).length === 1) return;
    await setDoc(ref, patch, { merge: true });
  } catch {
    /* best-effort — never block sign-in on profile write */
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(firebaseEnabled);
  // Surfaced to the sign-in UI when a Google *redirect* comes back with an error
  // (the popup path throws inline; the redirect path completes after a page reload).
  const [redirectError, setRedirectError] = useState('');

  useEffect(() => {
    if (!firebaseEnabled) {
      setLoading(false);
      return undefined;
    }
    let off = null;
    let cancelled = false;
    sdk().then(({ auth, onAuthStateChanged }) => {
      if (cancelled) return;
      if (!auth) { setLoading(false); return; }
      off = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
        // Tag crash reports with the uid — "which account hit this" is the first
        // question. Cleared on sign-out.
        setMonitoringUser(u);
        // Backfill/complete the profile doc for every signed-in account — covers session
        // restore and legacy Google users created before provisioning existed.
        if (u) ensureUserProfile(u);
      });
    }).catch(() => setLoading(false));
    return () => { cancelled = true; if (off) off(); };
  }, []);

  // Complete a Google sign-in that used the full-page redirect flow: provision the
  // profile and honour any stashed cross-app destination. Runs once on load; resolves
  // to null (no-op) when there's no redirect pending.
  useEffect(() => {
    if (!firebaseEnabled) return;
    sdk()
      .then(({ auth, getRedirectResult }) => (auth ? getRedirectResult(auth) : null))
      .then((res) => {
        if (!res?.user) return;
        ensureUserProfile(res.user);
        const dest = sessionStorage.getItem(REDIRECT_DEST_KEY);
        sessionStorage.removeItem(REDIRECT_DEST_KEY);
        if (dest && dest !== window.location.pathname) window.location.assign(dest);
      })
      .catch((err) => {
        sessionStorage.removeItem(REDIRECT_DEST_KEY);
        setRedirectError(friendlyError(err));
      });
  }, []);

  const signInEmail = useCallback(async (email, password) => {
    if (!firebaseEnabled) return guestSignIn(setUser, { email });
    try {
      const { auth, signInWithEmailAndPassword } = await sdk();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user;
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  }, []);

  const registerEmail = useCallback(async (name, email, password, phone) => {
    if (!firebaseEnabled) return guestSignIn(setUser, { email, displayName: name });
    try {
      const { auth, db, createUserWithEmailAndPassword, updateProfile, sendEmailVerification,
        doc, setDoc, serverTimestamp } = await sdk();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      sendEmailVerification(cred.user).catch(() => {});
      // Persist a base profile so the name + M-Pesa phone are saved for BOTH
      // shoppers and merchants (previously the phone was collected then dropped).
      if (db) {
        setDoc(doc(db, 'users', cred.user.uid), {
          name: name || '',
          ...(phone ? { phone: String(phone).trim() } : {}),
          createdAt: serverTimestamp(),
        }, { merge: true }).catch(() => {});
      }
      return cred.user;
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  }, []);

  // One button for both sign-in AND sign-up: Google auto-creates the account on first
  // use, and we provision the profile doc so a first-time Google user is a real "sign up".
  // Prefers a popup (keeps SPA state) but falls back to a full-page redirect wherever
  // popups can't work (mobile in-app browsers, popup blockers, strict COOP hosts).
  // `redirectTo` (optional) is the destination to land on if a redirect is needed.
  const signInGoogle = useCallback(async ({ redirectTo } = {}) => {
    if (!firebaseEnabled) return guestSignIn(setUser, { displayName: 'Guest Shopper' });

    const startRedirect = async () => {
      try {
        if (redirectTo) sessionStorage.setItem(REDIRECT_DEST_KEY, redirectTo);
      } catch { /* private mode — non-fatal */ }
      const { auth, googleProvider, signInWithRedirect } = await sdk();
      await signInWithRedirect(auth, googleProvider);
      // Page navigates away; getRedirectResult finishes the flow on return.
      return null;
    };

    if (popupUnreliable()) return startRedirect();

    try {
      const { auth, googleProvider, signInWithPopup } = await sdk();
      const cred = await signInWithPopup(auth, googleProvider);
      ensureUserProfile(cred.user);
      return cred.user;
    } catch (err) {
      if (shouldFallbackToRedirect(err)) return startRedirect();
      throw new Error(friendlyError(err));
    }
  }, []);

  // Complete a Google One Tap / GIS sign-in: exchange the Google ID token for a Firebase
  // session, then provision the profile (so One Tap is a real sign-in AND sign-up).
  const signInWithGoogleCredential = useCallback(async (idToken) => {
    if (!firebaseEnabled || !idToken) return null;
    const { auth, GoogleAuthProvider, signInWithCredential } = await sdk();
    if (!auth) return null;
    const cred = GoogleAuthProvider.credential(idToken);
    const res = await signInWithCredential(auth, cred);
    ensureUserProfile(res.user);
    return res.user;
  }, []);

  const continueAsGuest = useCallback(() => guestSignIn(setUser, { displayName: 'Guest' }), []);

  const signOutUser = useCallback(async () => {
    // Stop Google One Tap from instantly re-selecting the account we just left,
    // otherwise "sign out" appears to do nothing.
    try { window.google?.accounts?.id?.disableAutoSelect(); } catch { /* GIS not loaded */ }
    if (firebaseEnabled) {
      const { auth, signOut } = await sdk();
      if (auth) await signOut(auth);
    }
    setUser(null);
  }, []);

  const resendVerification = useCallback(async () => {
    if (!firebaseEnabled) return;
    const { auth, sendEmailVerification } = await sdk();
    if (auth?.currentUser) await sendEmailVerification(auth.currentUser);
  }, []);

  const resetPassword = useCallback(async (email) => {
    const addr = String(email || '').trim();
    if (!addr) throw new Error('Enter your email first, then tap “Forgot password”.');
    if (!firebaseEnabled) return; // guest/demo mode — nothing to reset
    try {
      const { auth, sendPasswordResetEmail } = await sdk();
      if (!auth) return;
      await sendPasswordResetEmail(auth, addr);
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  }, []);

  // A "real account" is a signed-in user that isn't an anonymous/local guest.
  const isGuest = Boolean(user?.isGuest) || Boolean(user?.isAnonymous);
  const hasAccount = Boolean(user) && !isGuest;

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthed: Boolean(user),
      hasAccount,
      isGuest,
      emailVerified: user?.emailVerified ?? true,
      redirectError,
      signInEmail,
      registerEmail,
      signInGoogle,
      signInWithGoogleCredential,
      continueAsGuest,
      signOutUser,
      resendVerification,
      resetPassword,
    }),
    [user, loading, hasAccount, isGuest, redirectError, signInEmail, registerEmail, signInGoogle, signInWithGoogleCredential, continueAsGuest, signOutUser, resendVerification, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Local guest identity used when no backend is configured.
function guestSignIn(setUser, extra = {}) {
  const fake = {
    uid: 'guest',
    isGuest: true,
    displayName: extra.displayName || 'Guest',
    email: extra.email || '',
    emailVerified: true,
    photoURL: null,
  };
  setUser(fake);
  return fake;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
