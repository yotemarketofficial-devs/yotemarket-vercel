/* notifications.js — the in-app notification bell's data layer, shared by the
   storefront, merchant dashboard and scout app.

   Notifications used to be push-only (FCM). Push is fire-and-forget: if the device was
   offline, the tab was closed, or the user never granted permission, the event was gone
   with no way to discover it. The server now writes a durable `notifications/{id}` for
   every event (see notifyUser in functions/index.js) and this reads them live.

   Only the DATA lives here. Each kit renders its own bell because the three are
   different design systems — but the query, unread count, mark-read and routing rules
   are defined once so they can't drift apart. */
import React from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, firebaseEnabled, markNotificationsRead, deleteNotification } from './firebase.js';
const { useState, useEffect, useCallback, useMemo } = React;

const PAGE = 30;   // newest N — the bell is a recent feed, not an archive

/** Coerce any Firestore timestamp shape (or a pending server write) to epoch ms. */
export function tsMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds != null) return ts.seconds * 1000;
  if (typeof ts === 'number') return ts;
  return 0;
}

/** Short relative age for a row: "now", "5m", "3h", "2d", else a date. */
export function shortAge(ms) {
  if (!ms) return '';
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(ms).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

/* Per-type presentation + where a tap should go. Kept here so the three bells agree on
   what an "order" notification looks like and does. `screen` is the storefront/scout
   screen key; kits that don't have that screen just ignore it. */
export const NOTIF_META = {
  order:        { icon: 'fa-box',            tone: 'primary', screen: 'orders' },
  chat:         { icon: 'fa-comments',       tone: 'primary', screen: 'messages' },
  dispute:      { icon: 'fa-rotate-left',    tone: 'warn',    screen: 'orders' },
  support:      { icon: 'fa-headset',        tone: 'primary', screen: 'profile' },
  post_comment: { icon: 'fa-comment-dots',   tone: 'primary', screen: 'following' },
  payout:       { icon: 'fa-money-bill-wave', tone: 'ok',     screen: 'payouts' },
  general:      { icon: 'fa-bell',           tone: 'muted',   screen: null },
};
export const notifMeta = (type) => NOTIF_META[type] || NOTIF_META.general;

/** Live subscription to a user's newest notifications. Returns an unsubscribe fn. */
export function subscribeNotifications(uid, cb, onError) {
  if (!firebaseEnabled || !db || !uid) { cb([]); return () => {}; }
  const q = query(
    collection(db, 'notifications'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(PAGE),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => {
      const x = d.data() || {};
      return {
        id: d.id,
        title: x.title || '',
        body: x.body || '',
        type: x.type || 'general',
        data: x.data || {},
        read: x.read === true,
        at: tsMillis(x.createdAt),
      };
    }));
  }, (err) => {
    // Most likely cause of a hard failure here is the composite index (uid+createdAt)
    // not being built yet — surface it rather than showing a silently empty bell.
    console.warn('[notifications] subscribe failed', err);
    onError && onError(err);
  });
}

/**
 * The bell's state for a signed-in user.
 * `items` newest-first, `unread` the badge count, plus the mutations. Everything
 * degrades to an empty, harmless state when signed out or without a backend.
 */
export function useNotifications(user) {
  const uid = (firebaseEnabled && user && user.uid && user.uid !== 'guest' && !user.isGuest) ? user.uid : null;
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) { setItems([]); setError(null); return undefined; }
    setError(null);
    return subscribeNotifications(uid, setItems, setError);
  }, [uid]);

  const unread = useMemo(() => items.reduce((n, x) => n + (x.read ? 0 : 1), 0), [items]);

  /* Optimistic: flip locally first so the badge clears the instant it's tapped, then
     persist. The snapshot will overwrite with the server's truth either way, so a
     failed call self-corrects rather than leaving a lie on screen. */
  const markRead = useCallback(async (ids) => {
    const list = Array.isArray(ids) ? ids : [ids];
    if (!uid || !list.length) return;
    setItems((xs) => xs.map((x) => (list.includes(x.id) ? { ...x, read: true } : x)));
    try { await markNotificationsRead({ ids: list }); } catch { /* snapshot re-syncs */ }
  }, [uid]);

  const markAllRead = useCallback(async () => {
    if (!uid) return;
    setItems((xs) => xs.map((x) => (x.read ? x : { ...x, read: true })));
    try { await markNotificationsRead({}); } catch { /* snapshot re-syncs */ }
  }, [uid]);

  const dismiss = useCallback(async (id) => {
    if (!uid || !id) return;
    setItems((xs) => xs.filter((x) => x.id !== id));
    try { await deleteNotification({ id }); } catch { /* snapshot re-syncs */ }
  }, [uid]);

  return { items, unread, error, enabled: Boolean(uid), markRead, markAllRead, dismiss };
}
