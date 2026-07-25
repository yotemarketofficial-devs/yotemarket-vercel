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

// Newest N. Read a little wider than a bell shows, because each surface then filters
// to its own audience (see notifAudienceOf) — 30 raw rows could be 4 after filtering
// for a merchant whose store is busy.
const PAGE = 60;

/* ── Which hat a notification is for ───────────────────────────────────────────
   A store owner shops the mall with the SAME account, so "New refund request" (their
   store) and "Order confirmed" (their own shopping) used to land in one pile and show
   up in both bells. The server now stamps `audience` ('merchant' | 'shopper') on every
   notification it writes, and each surface asks for its own.

   Notifications written BEFORE that field existed have no audience, so they're
   classified here from what we can prove. Anything still ambiguous returns null and
   is shown EVERYWHERE — an old notification going quiet would be worse than one
   appearing in the wrong bell for the week it takes to age out of the feed. */
export function notifAudienceOf(n, uid) {
  if (n && (n.audience === 'merchant' || n.audience === 'shopper')) return n.audience;
  const type = (n && n.type) || 'general';
  // Chat ids are `${storeId}__${shopperUid}` — if the thread ends in my uid I'm the
  // shopper in it, otherwise I'm the store. Exact, and needs no extra read.
  if (type === 'chat') {
    const convId = (n.data && n.data.convId) || '';
    if (!convId || !uid) return null;
    return convId.endsWith(`__${uid}`) ? 'shopper' : 'merchant';
  }
  if (type === 'post_comment') return 'merchant';   // only ever sent to a store owner
  if (type === 'order' || type === 'support') return 'shopper'; // only ever sent to a buyer
  return null;                                      // dispute/general/payout — can't prove it
}

/** Does this notification belong on a surface showing `audience`? */
export const notifInAudience = (n, uid, audience) => {
  if (!audience) return true;                       // unfiltered surface (e.g. scout app)
  const a = notifAudienceOf(n, uid);
  return a === null || a === audience;
};

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
        audience: x.audience || null,   // 'merchant' | 'shopper' | null (pre-split doc)
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
 *
 * `audience` scopes the bell to one hat — 'shopper' in the storefront, 'merchant' in
 * the dashboard. Omit it and the surface sees everything (the scout app).
 */
export function useNotifications(user, audience) {
  const uid = (firebaseEnabled && user && user.uid && user.uid !== 'guest' && !user.isGuest) ? user.uid : null;
  const [all, setAll] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) { setAll([]); setError(null); return undefined; }
    setError(null);
    return subscribeNotifications(uid, setAll, setError);
  }, [uid]);

  // One query, filtered per surface: a merchant's own shopping and their store's
  // events are the same uid, so they can't be split by the query alone.
  const items = useMemo(
    () => all.filter((x) => notifInAudience(x, uid, audience)),
    [all, uid, audience],
  );

  const unread = useMemo(() => items.reduce((n, x) => n + (x.read ? 0 : 1), 0), [items]);

  /* Optimistic: flip locally first so the badge clears the instant it's tapped, then
     persist. The snapshot will overwrite with the server's truth either way, so a
     failed call self-corrects rather than leaving a lie on screen. */
  const markRead = useCallback(async (ids) => {
    const list = Array.isArray(ids) ? ids : [ids];
    if (!uid || !list.length) return;
    setAll((xs) => xs.map((x) => (list.includes(x.id) ? { ...x, read: true } : x)));
    try { await markNotificationsRead({ ids: list }); } catch { /* snapshot re-syncs */ }
  }, [uid]);

  /* "Mark all read" means all of THIS bell. On a scoped surface it sends the visible
     ids explicitly — the bare call clears every notification on the account, so
     clearing the storefront bell would silently clear the store's unread too. */
  const markAllRead = useCallback(async () => {
    if (!uid) return;
    const ids = audience ? items.filter((x) => !x.read).map((x) => x.id) : null;
    if (ids && !ids.length) return;
    setAll((xs) => xs.map((x) => (x.read || (ids && !ids.includes(x.id)) ? x : { ...x, read: true })));
    try { await markNotificationsRead(ids ? { ids } : {}); } catch { /* snapshot re-syncs */ }
  }, [uid, audience, items]);

  const dismiss = useCallback(async (id) => {
    if (!uid || !id) return;
    setAll((xs) => xs.filter((x) => x.id !== id));
    try { await deleteNotification({ id }); } catch { /* snapshot re-syncs */ }
  }, [uid]);

  return { items, unread, error, enabled: Boolean(uid), markRead, markAllRead, dismiss };
}
