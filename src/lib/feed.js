// feed.js — YoteFeed shortform video (public read; writes via the feed callables).
// Firebase Storage MVP: merchants upload a vertical clip to feed/{storeId}/ and the
// createFeedPost callable records a `feed_posts/{id}` doc. The video URL is read back
// straight from the doc here — put behind `feedVideoUrl()` so a future swap to
// Cloudflare/HLS is a one-liner and never touches the UI.
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
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
export function subscribeFeed(cb, max = 60) {
  if (!firebaseEnabled || !db) { cb([]); return () => {}; }
  const q = query(collection(db, 'feed_posts'), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => (p.status || 'live') === 'live' && p.videoUrl);
    cb(rows);
  }, () => cb([]));
}

/** Live-subscribe to the signed-in shopper's liked post ids → Set. */
export function subscribeMyFeedLikes(uid, cb) {
  if (!firebaseEnabled || !db || !uid) { cb(new Set()); return () => {}; }
  const q = collection(db, 'users', uid, 'feed_likes');
  return onSnapshot(q, (snap) => cb(new Set(snap.docs.map((d) => d.id))), () => cb(new Set()));
}

/** Upload a merchant's video File to feed/{storeId}/ → its download URL.
 *  `onProgress(0..1)` fires during upload. */
export function uploadFeedVideo(storeId, file, onProgress) {
  const ext = (file?.name?.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
  return uploadVideo(feedVideoPath(storeId, ext), file, onProgress);
}
