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

/** Which side of a conversation `uid` is on ('shopper' | 'merchant'). Reads the
 *  per-participant info map, inferring from the other party for any legacy doc
 *  that doesn't carry my own role. A store owner is 'merchant' in their store's
 *  customer chats and 'shopper' when they message another store. */
export function conversationRole(conv, uid) {
  const info = (conv && conv.info) || {};
  const mine = info[uid] && info[uid].role;
  if (mine) return mine;
  const otherId = ((conv && conv.participants) || []).find((p) => p && p !== uid);
  const otherRole = otherId && info[otherId] && info[otherId].role;
  if (otherRole === 'shopper') return 'merchant';
  if (otherRole === 'merchant') return 'shopper';
  return 'shopper';
}

/** Messages `uid` can see in a thread: everything sent at/before the point they
 *  last "deleted for me" (hiddenAt) is hidden, so re-opening a cleared chat
 *  starts fresh for them while the other party keeps full history. A pending
 *  send (no server timestamp yet) always shows. */
export function visibleMessages(msgs, conv, uid) {
  const cleared = tsMillis((conv && conv.hiddenAt && conv.hiddenAt[uid]) || 0);
  if (!cleared) return msgs;
  return (msgs || []).filter((m) => { const t = tsMillis(m.at); return !t || t > cleared; });
}

/**
 * Ensure a shopper↔store conversation exists and return its id. Idempotent — a
 * shopper always reuses the same thread for a given store. The shopper writes the
 * full participant `info` map (they know their own name and the store's identity);
 * the merchant never has to seed it.
 */
export async function openStoreConversation({ store, user, shopperName, product }) {
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
          ...(store.logo ? { logo: store.logo } : {}),
        },
      },
      unread: { [shopperUid]: 0, [merchantUid]: 0 },
      lastMessage: '',
      lastSenderId: '',
      ...(product ? { product } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else if (product) {
    // Refresh the pinned product context when re-opening chat from a new product.
    updateDoc(ref, { product }).catch(() => {});
  }
  return convId;
}

/**
 * Guarantee a conversation doc exists before we post into it. The message-create rule
 * reads the parent conversation, so a just-opened (synthesized) thread whose create is
 * still in flight would be denied — this closes that race. Throws a clear, user-facing
 * error when we don't have enough info (e.g. the store has no ownerId).
 */
async function ensureConversation({ convId, conv, user }) {
  const ref = doc(db, 'conversations', convId);
  const snap = await getDoc(ref).catch(() => null);
  if (snap && snap.exists()) return;
  const participants = (Array.isArray(conv?.participants) ? conv.participants : []).filter(Boolean);
  if (participants.length < 2 || !participants.includes(user.uid)) {
    throw new Error('This store isn’t available on chat yet.');
  }
  await setDoc(ref, {
    participants,
    storeId: conv.storeId || null,
    status: 'active',
    info: conv.info || {},
    unread: {},
    lastMessage: '',
    lastSenderId: '',
    ...(conv.product ? { product: conv.product } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Post a message and update the parent thread's inbox preview + unread counter.
 * `recipientUid` is the participant who should see a new unread badge.
 */
export async function sendChatMessage({ convId, conv, user, text, recipientUid, product }) {
  const body = String(text || '').trim();
  if (!convId || !body || !chatEnabled(user)) return;
  // Make sure the thread exists first, so the message-create rule (which reads the
  // conversation) can never deny a just-opened chat. Surfaces a clear error otherwise.
  await ensureConversation({ convId, conv, user });
  const msgsCol = collection(db, 'conversations', convId, 'messages');
  const msg = { senderId: user.uid, text: body, at: serverTimestamp() };
  if (product) msg.product = product; // product tag rides along on the message
  await addDoc(msgsCol, msg);
  const patch = {
    lastMessage: body,
    lastSenderId: user.uid,
    updatedAt: serverTimestamp(),
  };
  if (recipientUid) patch[`unread.${recipientUid}`] = increment(1);
  // Best-effort: a failed denormalise must not lose the delivered message.
  updateDoc(doc(db, 'conversations', convId), patch).catch(() => {});
}

/** File an abuse report against a conversation → staff moderation queue. */
export async function reportConversation({ convId, reporterUid, reporterName, reportedName, reason }) {
  if (!firebaseEnabled || !db || !convId || !reporterUid) return;
  await addDoc(collection(db, 'reports'), {
    convId,
    reporterId: reporterUid,
    reporterName: reporterName || '',
    reportedName: reportedName || '',
    reason: reason || 'Reported conversation',
    status: 'open',
    createdAt: serverTimestamp(),
  });
}

/** Clear my unread badge for a thread + stamp when I last read it (drives the
 *  other participant's "Seen" receipt). Called when I open/view the thread. */
export function markConversationRead(convId, uid) {
  if (!firebaseEnabled || !db || !convId || !uid) return;
  updateDoc(doc(db, 'conversations', convId), {
    [`unread.${uid}`]: 0,
    [`lastReadAt.${uid}`]: serverTimestamp(),
  }).catch(() => {});
}

/**
 * "Delete for me" — hide a thread from MY inbox by stamping a per-participant
 * `hiddenAt`. The other party's copy is untouched (a shared thread is never really
 * deleted), and it RESURFACES for me if they send a new message (which advances
 * `updatedAt` past my hide time). Allowed by the rules — it's not a
 * participants/status/moderation change.
 */
export function hideConversation(convId, uid) {
  if (!firebaseEnabled || !db || !convId || !uid) return Promise.resolve();
  return updateDoc(doc(db, 'conversations', convId), { [`hiddenAt.${uid}`]: serverTimestamp() });
}

/** Live list of my conversations, newest-first. Returns an unsubscribe fn.
 *  `role` scopes the list to the side I'm on, so a store owner's customer chats
 *  ('merchant') never leak into their personal shopper inbox ('shopper') and
 *  vice-versa. Omit for every conversation I'm a participant in. */
export function subscribeConversations(uid, cb, role) {
  if (!firebaseEnabled || !db || !uid) return () => {};
  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        // Keep only the side asked for (personal inbox vs. store dashboard).
        .filter((c) => !role || conversationRole(c, uid) === role)
        // Drop threads I've "deleted for me" — unless a newer message arrived since.
        .filter((c) => {
          const h = c.hiddenAt && c.hiddenAt[uid];
          return !(h && tsMillis(h) >= tsMillis(c.updatedAt));
        });
      list.sort((a, b) => tsMillis(b.updatedAt) - tsMillis(a.updatedAt));
      cb(list);
    },
    (err) => console.warn('[chat] conversations subscribe error', err),
  );
}

/** React hook: total unread messages across my conversations (0 when not live).
 *  Pass a `role` to count only one side (e.g. 'shopper' for the storefront). */
export function useUnreadCount(user, role) {
  const [count, setCount] = useState(0);
  const uid = chatEnabled(user) ? user.uid : null;
  useEffect(() => {
    if (!uid) { setCount(0); return undefined; }
    return subscribeConversations(uid, (list) => {
      setCount(list.reduce((sum, c) => sum + ((c.unread && c.unread[uid]) || 0), 0));
    }, role);
  }, [uid, role]);
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
