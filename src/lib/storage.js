// Firebase Storage uploads for user-editable images. Paths MUST match the
// deployed Storage rules: public read for `avatars/{uid}/*` and
// `product_images/{storeId}/*`; owner-scoped writes. Store covers/logos reuse
// the store-scoped `product_images/{storeId}/` path (same owner write rule), so
// no new storage path/rule is needed.
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, firebaseEnabled } from './firebase.js';

export const storageReady = () => Boolean(firebaseEnabled && storage);

const stamp = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
export const avatarPath = (uid) => `avatars/${uid}/${stamp()}.jpg`;
export const productImagePath = (storeId) => `product_images/${storeId}/${stamp()}.jpg`;
export const coverPath = (storeId) => `product_images/${storeId}/cover_${stamp()}.jpg`;
export const logoPath = (storeId) => `product_images/${storeId}/logo_${stamp()}.jpg`;

/**
 * Upload a Blob to `path` and resolve with its public download URL.
 * `onProgress(0..1)` is called as bytes transfer.
 */
export function uploadImage(path, blob, onProgress) {
  return new Promise((resolve, reject) => {
    if (!storageReady()) { reject(new Error('Storage is not configured.')); return; }
    const task = uploadBytesResumable(ref(storage, path), blob, { contentType: 'image/jpeg' });
    task.on(
      'state_changed',
      (snap) => { if (onProgress && snap.totalBytes) onProgress(snap.bytesTransferred / snap.totalBytes); },
      (err) => reject(new Error(friendly(err))),
      () => getDownloadURL(task.snapshot.ref).then(resolve).catch((e) => reject(new Error(friendly(e)))),
    );
  });
}

function friendly(err) {
  const code = err?.code || '';
  if (code === 'storage/unauthorized') return 'You don’t have permission to upload here.';
  if (code === 'storage/canceled') return 'Upload cancelled.';
  if (code === 'storage/retry-limit-exceeded') return 'Upload timed out — check your connection.';
  return err?.message || 'Upload failed. Please try again.';
}
