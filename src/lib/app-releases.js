/* Publishing the Android APKs from the staff console, and reading them back on /apk.
 *
 * WHY NOT FIRESTORE: staff have no direct Firestore access — every staff read/write
 * goes through an Admin-SDK callable (see kits/staff/service.js), and adding one for
 * this means a backend deploy. Storage is the one place a claim-holding admin can
 * write directly, so the APK and its metadata both live there:
 *
 *   app_releases/index.json          ← what /apk reads: version, size, sha256, url
 *   app_releases/<slug>/<file>.apk   ← the signed build itself
 *
 * Both are world-readable, so the page fetches the index with a plain GET and no
 * Firebase SDK — the marketing bundle stays SDK-free. Writing needs the admin claim.
 *
 * THE RULE THIS NEEDS (deploy once, in the Firebase project's storage.rules):
 *
 *   match /app_releases/{allPaths=**} {
 *     allow read: if true;
 *     allow write: if request.auth != null && request.auth.token.admin == true;
 *   }
 *
 * Until that rule is live, uploading fails with "You don't have permission to upload
 * here" and /apk simply falls back to the static entries in apk-releases.mjs.
 */
import { firebaseConfig } from './firebase-config.js';
import { APPS } from './apk-releases.mjs';

export const INDEX_PATH = 'app_releases/index.json';

/** Public download URL for a world-readable Storage object (no token needed). */
export const publicUrl = (path) =>
  `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(path)}?alt=media`;

/** Where a given build is stored. Versioned, so an old link never changes under anyone. */
export const apkPath = (slug, version) =>
  `app_releases/${slug}/yotemarket-${slug}-${String(version || 'latest').replace(/[^\w.-]/g, '')}.apk`;

/** SHA-256 of a File/Blob, lower-case hex — the checksum a mirror verifies against. */
export async function sha256(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Bytes → MB with one decimal, the unit /apk shows. */
export const toMb = (bytes) => Math.round((Number(bytes) || 0) / 1048576 * 10) / 10;

/**
 * The published releases, keyed by app slug: { shopper: {...}, rider: {...} }.
 * Resolves to {} for any failure — a missing index, no network, rules not deployed —
 * because /apk must still render its static entries rather than break.
 */
export async function fetchReleases() {
  try {
    const res = await fetch(publicUrl(INDEX_PATH), { cache: 'no-store' });
    if (!res.ok) return {};
    const data = await res.json();
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

/**
 * The app catalogue with any published release merged over the static one, so a
 * build uploaded from the staff console wins over what shipped in the bundle.
 * Only non-empty fields override, so a partial index can't blank out real data.
 */
export function mergeReleases(published = {}) {
  return APPS.map((app) => {
    const live = published[app.slug];
    if (!live || typeof live !== 'object') return app;
    const release = { ...app.release };
    for (const [k, v] of Object.entries(live.release || live)) {
      if (v !== '' && v !== null && v !== undefined && k in release) release[k] = v;
    }
    return { ...app, release, ...(live.uptodownUrl ? { uptodownUrl: live.uptodownUrl } : {}) };
  });
}

/**
 * Publish a build: upload the .apk, then rewrite index.json with its metadata.
 * `onProgress(0..1)` tracks the upload (the index write is instant by comparison).
 * Returns the release entry that /apk will now serve.
 */
export async function publishRelease({ slug, file, version, versionCode, uptodownUrl, releasedOn }, onProgress) {
  const { uploadFile } = await import('./storage.js');
  const [checksum, url] = await Promise.all([
    sha256(file),
    uploadFile(apkPath(slug, version), file, 'application/vnd.android.package-archive', onProgress),
  ]);

  const release = {
    version: String(version || '').trim(),
    versionCode: versionCode === '' || versionCode == null ? null : Number(versionCode),
    sizeMb: toMb(file.size),
    sha256: checksum,
    releasedOn: releasedOn || new Date().toISOString().slice(0, 10),
    url,
  };

  // Merge into whatever is already published so uploading the rider build cannot
  // wipe the shopper's entry.
  const index = { ...(await fetchReleases()) };
  index[slug] = { release, ...(uptodownUrl ? { uptodownUrl } : {}) };

  const blob = new Blob([JSON.stringify(index, null, 2)], { type: 'application/json' });
  await uploadFile(INDEX_PATH, blob, 'application/json');
  return index[slug];
}
