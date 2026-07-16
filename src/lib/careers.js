/* careers.js — public job openings. `job_openings` is public-read (adverts, no
   PII) so the careers page streams them live; staff post/close them via callables.
   Applications go the other way — through the submitJobApplication callable. */
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';

/** Live OPEN positions → cb(list). Returns an unsubscribe. Single-equality query,
 *  so it needs no composite index; sorting/grouping happens client-side. */
export function subscribeJobOpenings(cb) {
  if (!firebaseEnabled || !db) { cb([]); return () => {}; }
  try {
    const q = query(collection(db, 'job_openings'), where('status', '==', 'open'));
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => cb([]), // rules/offline → fall back to "no listed roles" (open application still works)
    );
  } catch {
    cb([]);
    return () => {};
  }
}
