// Live in-app chat (shopper ↔ merchant) on Firestore. Shared data model with the
// Flutter apps so every client speaks the same backend:
//
//   conversations/{convId}
//     participants : [shopperUid, merchantUid]            (drives security rules)
//     info         : { [uid]: { name, role, ...display } } (per-participant card)
//     storeId, status('active'|'blocked')
//     lastMessage, lastSenderId, updatedAt                 (inbox preview)
//     unread       : { [uid]: count }                      (badge counters)
//   conversations/{convId}/messages/{id}
//     senderId, text, at(serverTimestamp)
//
// A new message document triggers `onMessageCreated` (Cloud Function) which pushes
// an FCM notification to the other participant. Inbox/unread fields are denormalised
// here on the client (Firestore rules permit participants to write them) so no extra
// backend deploy is required and web + Flutter behave identically.
import { useEffect, useState } from 'react';
import {
  doc, setDoc, getDoc, updateDoc, collection, addDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, increment,
} from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';

/** Stable id for a (store, shopper) thread so re-opening returns the same chat. */
export function conversationId(storeId, shopperUid) {
  return `${storeId}__${shopperUid}`;
}

/** Live chat needs a real backend + a signed-in, non-guest account. */
export function chatEnabled(user) {
  return Boolean(
    firebaseEnabled && db && user && user.uid && user.uid !== 'guest' && !user.isGuest,
  );
}

/** Coerce any Firestore timestamp shape (or null pending write) to epoch ms. */
export function tsMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds != null) return ts.seconds * 1000;
  if (ts._seconds != null) return ts._seconds * 1000;
  return 0;
}

/** Clock time for a message bubble, e.g. "10:24 AM". */
export function fmtTime(ts) {
  const ms = tsMillis(ts);
  if (!ms) return 'Now';
  return new Date(ms).toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' });
}

/** Relative-ish label for an inbox row: time today, weekday this week, else date. */
export function fmtWhen(ts) {
  const ms = tsMillis(ts);
  if (!ms) return '';
  const d = new Date(ms);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' });
  }
  if ((now - d) / 86400000 < 6) return d.toLocaleDateString('en-KE', { weekday: 'short' });
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

/** The participant in a conversation who isn't `me`. */
export function otherParticipant(conv, myUid) {
  return (conv.participants || []).find((p) => p && p !== myUid) || '';
}

/**
 * Ensure a shopper↔store conversation exists and return its id. Idempotent — a
 * shopper always reuses the same thread for a given store. The shopper writes the
 * full participant `info` map (they know their own name and the store's identity);
 * the merchant never has to seed it.
 */
export async function openStoreConversation({ store, user, shopperName }) {
  if (!chatEnabled(user)) throw new Error('Sign in to chat with this store.');
  const merchantUid = store?.ownerId;
  if (!merchantUid) throw new Error('This store isn’t available on chat yet.');
  const shopperUid = user.uid;
  if (merchantUid === shopperUid) throw new Error('You can’t start a chat with your own store.');

  const convId = conversationId(store.id, shopperUid);
  const ref = doc(db, 'conversations', convId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      participants: [shopperUid, merchantUid],
      storeId: store.id,
      status: 'active',
      info: {
        [shopperUid]: { name: shopperName || 'Shopper', role: 'shopper' },
        [merchantUid]: {
          name: store.name || 'Store',
          role: 'merchant',
          storeId: store.id,
          icon: store.icon || 'fa-store',
          tint: store.tint || '#4f46e5',
          ...(store.img ? { img: store.img } : {}),
        },
      },
      unread: { [shopperUid]: 0, [merchantUid]: 0 },
      lastMessage: '',
      lastSenderId: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return convId;
}

/**
 * Post a message and update the parent thread's inbox preview + unread counter.
 * `recipientUid` is the participant who should see a new unread badge.
 */
export async function sendChatMessage({ convId, user, text, recipientUid }) {
  const body = String(text || '').trim();
  if (!convId || !body || !chatEnabled(user)) return;
  await addDoc(collection(db, 'conversations', convId, 'messages'), {
    senderId: user.uid,
    text: body,
    at: serverTimestamp(),
  });
  const patch = {
    lastMessage: body,
    lastSenderId: user.uid,
    updatedAt: serverTimestamp(),
  };
  if (recipientUid) patch[`unread.${recipientUid}`] = increment(1);
  // Best-effort: a failed denormalise must not lose the delivered message.
  updateDoc(doc(db, 'conversations', convId), patch).catch(() => {});
}

/** Clear my unread badge for a thread (called when I open/read it). */
export function markConversationRead(convId, uid) {
  if (!firebaseEnabled || !db || !convId || !uid) return;
  updateDoc(doc(db, 'conversations', convId), { [`unread.${uid}`]: 0 }).catch(() => {});
}

/** Live list of my conversations, newest-first. Returns an unsubscribe fn. */
export function subscribeConversations(uid, cb) {
  if (!firebaseEnabled || !db || !uid) return () => {};
  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => tsMillis(b.updatedAt) - tsMillis(a.updatedAt));
      cb(list);
    },
    (err) => console.warn('[chat] conversations subscribe error', err),
  );
}

/** React hook: total unread messages across all my conversations (0 when not live). */
export function useUnreadCount(user) {
  const [count, setCount] = useState(0);
  const uid = chatEnabled(user) ? user.uid : null;
  useEffect(() => {
    if (!uid) { setCount(0); return undefined; }
    return subscribeConversations(uid, (list) => {
      setCount(list.reduce((sum, c) => sum + ((c.unread && c.unread[uid]) || 0), 0));
    });
  }, [uid]);
  return count;
}

/** Live, chronologically-ordered messages for a thread. Returns an unsubscribe fn. */
export function subscribeMessages(convId, cb) {
  if (!firebaseEnabled || !db || !convId) return () => {};
  const q = query(collection(db, 'conversations', convId, 'messages'), orderBy('at', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // A just-sent message has a pending (null) serverTimestamp — keep it last.
      list.sort((a, b) => (tsMillis(a.at) || Number.MAX_SAFE_INTEGER) - (tsMillis(b.at) || Number.MAX_SAFE_INTEGER));
      cb(list);
    },
    (err) => console.warn('[chat] messages subscribe error', err),
  );
}
