// Web Push (FCM) for chat + order notifications. Registers the browser's FCM
// token on `users/{uid}.fcmTokens` — the same field the `onMessageCreated` /
// order Cloud Functions read — so web users get push like the Flutter apps.
//
// Permission is opt-in: we never prompt automatically. On sign-in we only store
// a token if the browser has *already* granted permission; the actual prompt is
// driven by an in-app "Enable notifications" button (a user gesture). Everything
// no-ops gracefully when push isn't available; in-app live chat is unaffected.
import { useCallback, useEffect, useState } from 'react';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { db, firebaseEnabled, FCM_VAPID_KEY, getMessagingInstance } from './firebase.js';
import { chatEnabled } from './chat.js';

/** True when this browser can do web push and a VAPID key is configured. */
export function pushSupported() {
  return (
    Boolean(FCM_VAPID_KEY) &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

/** 'unsupported' | 'default' | 'granted' | 'denied'. */
export function pushPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function canRegister(uid) {
  return Boolean(firebaseEnabled && db && uid && uid !== 'guest' && pushSupported());
}

// Resolve a token via the SW and store it on the user profile.
async function storeToken(uid) {
  const messaging = await getMessagingInstance();
  if (!messaging) return false;
  const { getToken } = await import('firebase/messaging');
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(messaging, {
    vapidKey: FCM_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) return false;
  await setDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token) }, { merge: true });
  return true;
}

/** Passive: store a token only if permission is already granted (no prompt). */
export async function registerForPush(uid) {
  if (!canRegister(uid) || Notification.permission !== 'granted') return;
  try {
    await storeToken(uid);
  } catch (err) {
    console.warn('[push] registration skipped', err);
  }
}

/**
 * Active (must be called from a user gesture): request permission, then store
 * the token. Returns 'granted' | 'denied' | 'default' | 'unsupported' | 'no-key'
 * | 'error'.
 */
export async function enablePush(uid) {
  if (!FCM_VAPID_KEY) return 'no-key';
  if (!canRegister(uid)) return 'unsupported';
  try {
    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission;
    await storeToken(uid);
    return 'granted';
  } catch (err) {
    console.warn('[push] enable failed', err);
    return 'error';
  }
}

/**
 * Passively register on sign-in (if already granted) and surface foreground
 * messages via `onForeground(payload)` — the OS won't show a notification while
 * the tab is focused, so the app shows its own toast.
 */
export function useChatPush(user, onForeground) {
  const uid = chatEnabled(user) ? user.uid : null;
  useEffect(() => {
    if (!uid) return undefined;
    registerForPush(uid);

    let active = true;
    let unsubscribe = () => {};
    (async () => {
      const messaging = await getMessagingInstance();
      if (!messaging || !active) return;
      const { onMessage } = await import('firebase/messaging');
      unsubscribe = onMessage(messaging, (payload) => {
        if (active && onForeground) onForeground(payload);
      });
    })();

    return () => { active = false; unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);
}

/**
 * Drives an in-app "Enable notifications" prompt. `canPrompt` is true only when
 * push is supported, the user is signed in, and permission hasn't been answered.
 */
export function usePushPrompt(user) {
  const uid = chatEnabled(user) ? user.uid : null;
  const [status, setStatus] = useState(pushPermission());

  useEffect(() => { setStatus(pushPermission()); }, [uid]);

  const enable = useCallback(async () => {
    if (!uid) return 'unsupported';
    const result = await enablePush(uid);
    setStatus(pushPermission());
    return result;
  }, [uid]);

  return {
    status,
    enable,
    canPrompt: Boolean(uid && pushSupported() && status === 'default'),
  };
}
