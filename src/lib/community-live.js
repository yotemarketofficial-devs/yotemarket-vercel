// Live figures for the homepage's community band. Loaded after the page mounts (like
// lib/feed.js), so the Firebase SDK stays off the homepage's critical path.
//
// Stores are a live listener: when a new merchant's store is created the count goes up on
// every open homepage, and onSnapshot only re-sends the documents that changed. Products
// are a server-side count (one aggregation read, not every product document), refreshed
// whenever the stores change; products of suspended stores are taken off, as the shop
// hides them. Both collections are world-readable (see scripts/lib/catalog.mjs).
import { collection, getCountFromServer, onSnapshot, query, where } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';
import { communityStats } from './community-stats.js';

/** cb({ stores, counties, products }) on every change; cb(null) if the figures can't be
 *  read (no backend, rules, network). Returns an unsubscribe function. */
export function subscribeCommunityStats(cb) {
  if (!firebaseEnabled || !db) { cb(null); return () => {}; }
  let stopped = false;
  let stores = null;
  let products;
  let countRun = 0;
  const emit = () => { if (!stopped && stores) cb(communityStats(stores, products)); };

  async function countProducts(suspendedIds) {
    const run = ++countRun;
    const col = collection(db, 'products');
    const all = (await getCountFromServer(col)).data().count;
    // `in` takes up to 30 values. Suspensions are rare; past 30 the figure includes a few
    // products that are hidden, which is the safe side of wrong for a "products" count.
    const ids = suspendedIds.slice(0, 30);
    const hidden = ids.length ? (await getCountFromServer(query(col, where('storeId', 'in', ids)))).data().count : 0;
    if (run === countRun) { products = Math.max(0, all - hidden); emit(); }
  }

  const off = onSnapshot(collection(db, 'stores'), (snap) => {
    stores = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    emit();
    countProducts(stores.filter((s) => s.suspended === true).map((s) => s.id)).catch(() => {});
  }, () => { if (!stopped) cb(null); });

  return () => { stopped = true; off(); };
}
