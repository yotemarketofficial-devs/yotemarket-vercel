/* service.js — Marketer (scout) data layer. Wraps the Cloud Functions + the
   scout's own Firestore reads (their marketers/{uid} doc, referred stores,
   payout requests). Everything degrades to the bundled demo data when the
   backend/auth isn't available so the app still renders. */
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, functions, firebaseEnabled } from '../../lib/firebase.js';

function call(name) {
  return async (data) => {
    if (!functions) throw new Error('Backend not configured');
    const res = await httpsCallable(functions, name)(data);
    return res.data;
  };
}

/** Live scout features need a real backend + a signed-in, non-guest account. */
export function marketerEnabled(user) {
  return Boolean(firebaseEnabled && db && user && user.uid && user.uid !== 'guest' && !user.isGuest);
}

const tsMs = (ts) => {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds != null) return ts.seconds * 1000;
  return 0;
};
const shortDate = (ts) => {
  const ms = tsMs(ts);
  return ms ? new Date(ms).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '';
};

// ── Callables ─────────────────────────────────────────────────────────────────
/** Join the program → marketers/{uid}. { name, phone, county } -> { marketer }. */
export const registerMarketer = call('registerMarketer');
/** Active scout requests an M-Pesa payout. { phone? } -> { amount }. */
export const requestMarketerPayout = call('requestMarketerPayout');

export async function fetchLeaderboard() {
  const d = await call('marketerLeaderboard')();
  return Array.isArray(d?.leaderboard) ? d.leaderboard : [];
}

// ── Direct reads (scope-checked by Firestore rules) ───────────────────────────
export async function fetchMyMarketer(uid) {
  const s = await getDoc(doc(db, 'marketers', uid));
  return s.exists() ? { id: uid, ...s.data() } : null;
}

/** The scout's referred stores → the referral-table shape. */
export async function fetchMyReferrals(uid) {
  const snap = await getDocs(query(collection(db, 'stores'), where('scoutId', '==', uid)));
  return snap.docs
    .map((d) => {
      const s = d.data();
      return {
        id: d.id,
        shop: s.name || 'Store',
        owner: s.ownerName || '',
        county: s.area || '',
        date: shortDate(s.createdAt),
        _ms: tsMs(s.createdAt),
        socials: s.socials || 0,
        items: s.products || 0,
        status: s.verified ? 'verified' : 'pending',
        missing: s.verified ? undefined : 'awaiting staff verification',
      };
    })
    .sort((a, b) => b._ms - a._ms);
}

/** The scout's payout requests → the withdrawal-history shape. */
export async function fetchMyPayouts(uid) {
  const snap = await getDocs(query(collection(db, 'payout_requests'), where('scoutId', '==', uid)));
  return snap.docs
    .map((d) => {
      const p = d.data();
      return {
        id: d.id,
        amount: Number(p.amount) || 0,
        date: shortDate(p.createdAt),
        _ms: tsMs(p.createdAt),
        ref: p.status === 'paid' ? 'PAID' : (p.status || 'pending').toUpperCase(),
        phone: p.phone || '',
        status: p.status === 'paid' ? 'paid' : (p.status || 'pending'),
      };
    })
    .sort((a, b) => b._ms - a._ms);
}
