// feed.js — YoteFeed shortform video (public read; writes via the feed callables).
// Firebase Storage MVP: merchants upload a vertical clip to feed/{storeId}/ and the
// createFeedPost callable records a `feed_posts/{id}` doc. The video URL is read back
// straight from the doc here — put behind `feedVideoUrl()` so a future swap to
// Cloudflare/HLS is a one-liner and never touches the UI.
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';
import { feedVideoPath, uploadVideo } from './storage.js';

/** The playable source for a post. Today it's the stored MP4 URL; swap here to
 *  return an HLS manifest URL (Cloudflare Stream / Bunny) without UI changes. */
export function feedVideoUrl(post) {
  return post?.videoUrl || '';
}

/** Live-subscribe to the newest feed posts (status 'live'), newest first. Ordered
 *  by createdAt only (single-field index, no composite) and status-filtered
 *  client-side. Returns an unsubscribe fn. */
export function subscribeFeed(cb, max = 150) {
  if (!firebaseEnabled || !db) { cb([]); return () => {}; }
  const q = query(collection(db, 'feed_posts'), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => (p.status || 'live') === 'live' && p.videoUrl);
    cb(rows);
  }, () => cb([]));
}

/** Live-subscribe to ONE store's clips (newest first). Equality query on storeId
 *  (index-free); status-filtered + sorted client-side. Returns an unsubscribe fn. */
export function subscribeStoreFeed(storeId, cb, max = 50) {
  if (!firebaseEnabled || !db || !storeId) { cb([]); return () => {}; }
  const q = query(collection(db, 'feed_posts'), where('storeId', '==', String(storeId)), limit(max));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => (p.status || 'live') === 'live' && p.videoUrl)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    cb(rows);
  }, () => cb([]));
}

/** Live-subscribe to the signed-in shopper's liked post ids → Set. */
export function subscribeMyFeedLikes(uid, cb) {
  if (!firebaseEnabled || !db || !uid) { cb(new Set()); return () => {}; }
  const q = collection(db, 'users', uid, 'feed_likes');
  return onSnapshot(q, (snap) => cb(new Set(snap.docs.map((d) => d.id))), () => cb(new Set()));
}

/** Live-subscribe to the ids of clips the user has already seen → Set (used to
 *  soft-demote them so the feed doesn't repeat). */
export function subscribeFeedSeen(uid, cb) {
  if (!firebaseEnabled || !db || !uid) { cb(new Set()); return () => {}; }
  const q = collection(db, 'users', uid, 'feed_seen');
  return onSnapshot(q, (snap) => cb(new Set(snap.docs.map((d) => d.id))), () => cb(new Set()));
}

// ── Ranking ──────────────────────────────────────────────────────────────────
// Balanced For-You score, computed client-side over the fetched candidate set
// (cheapest; no ranking infra; easy to tune). Engagement-led with a commerce tilt
// (shop-tap rate weighted highest) so shoppable clips win ties. Rates are Laplace-
// smoothed by prior views so low-view clips aren't judged on noise; a cold-start
// boost gives brand-new clips a launch window; freshness decays with age; followed/
// engaged stores get a lift; already-seen clips are soft-demoted (never hard-removed,
// so the feed can't run empty); and a diversity pass avoids the same store back-to-back.
const sidOf = (p) => p.storeId || ('post:' + p.id);
const msOf = (t) => (t && t.seconds ? t.seconds * 1000 : (t && t.toMillis ? t.toMillis() : 0));

export function rankFeed(posts, ctx = {}) {
  const { likedSet = new Set(), seenSet = new Set(), boostStores = new Set(), now = Date.now() } = ctx;
  const scored = (posts || []).map((p) => {
    const views = Math.max(0, Number(p.views) || 0);
    const B = 8; // prior views (smoothing strength)
    const rate = (x, prior) => (Math.max(0, Number(x) || 0) + prior) / (views + B);
    const likeRate = rate(p.likes, 0.5);
    const finishRate = rate(p.finishes, 0.5);   // watch-completion → watch-time proxy
    const shopRate = rate(p.shopTaps, 0.2);      // commerce tilt
    const quality = Math.max(0.01, 3.0 * likeRate + 3.0 * finishRate + 4.0 * shopRate);
    const ageH = Math.max(0, (now - msOf(p.createdAt)) / 3.6e6);
    const freshness = 1 / Math.pow(ageH + 2, 1.4);
    const storeQ = 0.9 + 0.05 * (Number(p.storeRating) || 2);        // rating 0..5 → ~0.9..1.15
    const coldStart = ageH < 12 ? 1 + 0.5 * (1 - ageH / 12) : 1;      // launch boost for new clips
    let score = quality * freshness * storeQ * coldStart;
    if (p.storeId && boostStores.has(p.storeId)) score *= 1.6;        // followed/engaged store
    if (likedSet.has(p.id) || seenSet.has(p.id)) score *= 0.15;       // soft-demote seen/liked
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score);
  // Diversity: don't place the same store within the last 2 slots when avoidable.
  const remaining = scored.map((s) => s.p);
  const out = [];
  while (remaining.length) {
    const recent = out.slice(-2).map(sidOf);
    let i = remaining.findIndex((p) => !recent.includes(sidOf(p)));
    if (i < 0) i = 0;
    out.push(remaining.splice(i, 1)[0]);
  }
  return out;
}

/** Upload a merchant's video File to feed/{storeId}/ → its download URL.
 *  `onProgress(0..1)` fires during upload. */
export function uploadFeedVideo(storeId, file, onProgress) {
  const ext = (file?.name?.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
  return uploadVideo(feedVideoPath(storeId, ext), file, onProgress);
}
