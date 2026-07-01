// reviews.js — product reviews (public read; writes go through the submitReview
// callable which also keeps the product + store rating aggregates in sync).
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';

/** Live-subscribe to a product's reviews (newest first, client-sorted to avoid a
 *  composite index). Returns an unsubscribe fn. */
export function subscribeProductReviews(productId, cb) {
  if (!firebaseEnabled || !db || !productId) { cb([]); return () => {}; }
  const q = query(collection(db, 'reviews'), where('productId', '==', String(productId)), limit(100));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    cb(rows);
  }, () => cb([]));
}
