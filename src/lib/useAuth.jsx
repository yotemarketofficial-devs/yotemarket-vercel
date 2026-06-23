// Auth context for the whole web platform. Wraps Firebase Auth (email/password + Google)
// with session persistence and exposes a small, friendly API. When Firebase isn't
// configured it runs a local "guest" mode so the prototypes stay fully interactive.
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { auth, googleProvider, firebaseEnabled } from './firebase.js';

const AuthContext = createContext(null);

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
    'auth/too-many-requests': 'Too many attempts — please wait a moment.',
  };
  return map[code] || err?.message || 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(firebaseEnabled);

  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      setLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signInEmail = useCallback(async (email, password) => {
    if (!firebaseEnabled) return guestSignIn(setUser, { email });
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user;
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  }, []);

  const registerEmail = useCallback(async (name, email, password) => {
    if (!firebaseEnabled) return guestSignIn(setUser, { email, displayName: name });
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      sendEmailVerification(cred.user).catch(() => {});
      return cred.user;
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  }, []);

  const signInGoogle = useCallback(async () => {
    if (!firebaseEnabled) return guestSignIn(setUser, { displayName: 'Guest Shopper' });
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (err) {
      throw new Error(friendlyError(err));
    }
  }, []);

  const continueAsGuest = useCallback(() => guestSignIn(setUser, { displayName: 'Guest' }), []);

  const signOutUser = useCallback(async () => {
    if (firebaseEnabled && auth) await signOut(auth);
    setUser(null);
  }, []);

  const resendVerification = useCallback(async () => {
    if (firebaseEnabled && auth?.currentUser) await sendEmailVerification(auth.currentUser);
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
      signInEmail,
      registerEmail,
      signInGoogle,
      continueAsGuest,
      signOutUser,
      resendVerification,
    }),
    [user, loading, hasAccount, isGuest, signInEmail, registerEmail, signInGoogle, continueAsGuest, signOutUser, resendVerification],
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
