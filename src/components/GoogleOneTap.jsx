/* GoogleOneTap.jsx — Google One Tap auto sign-in / sign-up for the web.
   Renders nothing; on public pages it shows Google's One Tap prompt to signed-out
   visitors and, for returning users, auto-signs them in with no click (auto_select).
   The Google ID token is exchanged for a Firebase session via useAuth, which also
   provisions the users/{uid} profile — so One Tap is a real sign-in AND sign-up.

   Everything degrades gracefully: if GIS is blocked/offline, the client id is unset,
   the browser is an in-app webview, or the user is on a console/role app, it no-ops
   and the normal sign-in buttons still work. */
import { useEffect, useRef } from 'react';
import { useAuth } from '../lib/useAuth.jsx';
// Constants only — importing firebase.js here would pull the whole SDK into the entry chunk.
import { firebaseEnabled, GOOGLE_OAUTH_CLIENT_ID } from '../lib/firebase-config.js';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
// Consoles + role apps run their own dedicated sign-in — don't nudge One Tap there.
const BLOCKED_PREFIXES = ['/staff', '/hub', '/pos', '/dashboard', '/marketers', '/admin'];

// One Tap can't render inside in-app webviews (Instagram/Facebook/TikTok/… browsers).
function inAppBrowser() {
  const ua = navigator.userAgent || '';
  return /(FBAN|FBAV|Instagram|Line|Twitter|WhatsApp|WeChat|MicroMessenger|TikTok|Musical_ly|Snapchat|GSA)/i.test(ua);
}

// Load the Google Identity Services library once; resolve with the global `google`.
function loadGis() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google);
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.google);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function GoogleOneTap() {
  const { isAuthed, loading, signInWithGoogleCredential } = useAuth();
  const shown = useRef(false);

  useEffect(() => {
    if (!firebaseEnabled || !GOOGLE_OAUTH_CLIENT_ID) return undefined;
    if (loading || isAuthed) return undefined;         // only prompt signed-out visitors
    if (shown.current) return undefined;               // once per mount
    if (inAppBrowser()) return undefined;
    if (BLOCKED_PREFIXES.some((p) => window.location.pathname.startsWith(p))) return undefined;

    let cancelled = false;
    loadGis()
      .then((google) => {
        if (cancelled || !google?.accounts?.id) return;
        shown.current = true;
        google.accounts.id.initialize({
          client_id: GOOGLE_OAUTH_CLIENT_ID,
          callback: async ({ credential }) => {
            try { await signInWithGoogleCredential(credential); }
            catch { /* fall back to the normal buttons */ }
          },
          auto_select: true,          // returning users get signed in with no click
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true, // Chrome is migrating One Tap to FedCM
          context: 'signin',
        });
        google.accounts.id.prompt();
      })
      .catch(() => { /* GIS blocked/offline — normal sign-in still works */ });

    return () => {
      cancelled = true;
      try { window.google?.accounts?.id?.cancel(); } catch { /* not loaded */ }
    };
  }, [isAuthed, loading, signInWithGoogleCredential]);

  return null;
}
