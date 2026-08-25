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
 * CORS, THE TRAP THAT MADE ALL OF THIS LOOK BROKEN: Storage's two endpoints do not
 * behave the same way. The DOWNLOAD endpoint (`?alt=media`) answers a browser fetch
 * with no Access-Control-Allow-Origin at all, so a cross-origin read of index.json
 * is rejected before the page ever sees the 200 — and every caller here swallows the
 * failure and falls back, which is exactly what /apk showing "not published yet" over
 * a live build looked like. The METADATA endpoint (same URL, no `?alt=media`) does
 * send `Access-Control-Allow-Origin: *`. Hence: existence checks go to metadata, and
 * the index is read through INDEX_URL — a same-origin path that vercel.json rewrites
 * onto the download URL, so the browser never makes a cross-origin request for it.
 * (Setting a CORS policy on the bucket would also work, but needs gsutil and
 * credentials on someone's machine; a rewrite ships with the site.)
 *
 * THE RULE THIS NEEDS: the app_releases/ block in firebase/storage.rules over in the
 * yotemarket-flutter repo — public read, admin-claim (or verified founding-owner)
 * write, 300 MB cap, APK/JSON content types. It has to be DEPLOYED, which GitHub
 * does not do: `cd firebase && firebase deploy --only storage`.
 *
 * Until that rule is live, uploading fails with "You don't have permission to upload
 * here" and /apk simply falls back to the static entries in apk-releases.mjs.
 */
import { firebaseConfig } from './firebase-config.js';
import { APPS } from './apk-releases.mjs';

export const INDEX_PATH = 'app_releases/index.json';

/** Same-origin path for the index — vercel.json rewrites it onto publicUrl(INDEX_PATH). */
export const INDEX_URL = '/app-releases.json';

/** Public download URL for a world-readable Storage object (no token needed). */
export const publicUrl = (path) =>
  `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(path)}?alt=media`;

/** Metadata URL for the same object: the one of the two endpoints that allows CORS. */
export const metadataUrl = (path) =>
  `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(path)}`;

/**
 * Where a given build is stored — one URL per BUILD, never reused.
 *
 * The version alone is not enough to identify a build. `1.0.0+4` and `1.0.0+5` are
 * different releases that both carry version "1.0.0" (the UI even auto-fills it by
 * pulling the first number out of the filename), so keying on version alone sent the
 * second upload to the first one's path and silently replaced a published build.
 *
 * That is worse than it sounds: index.json publishes a SHA-256 and mirrors verify the
 * file at this URL against it, so replacing the bytes under a live URL looks exactly
 * like tampering to anyone who cached the old checksum — and anyone mid-download gets
 * a corrupt file.
 *
 * versionCode is what Android itself uses to tell two builds apart, so it belongs in
 * the path. It is required; see assertPublishable.
 */
export const apkPath = (slug, version, versionCode) =>
  `app_releases/${slug}/yotemarket-${slug}-${String(version || 'latest').replace(/[^\w.-]/g, '')}` +
  `-${String(versionCode).replace(/[^\w]/g, '')}.apk`;

/**
 * True if something is already stored at `path` — a published build we must not replace.
 * Asks the metadata endpoint, not the download one: a HEAD on `?alt=media` is refused by
 * CORS in every browser, so this guard answered "no, nothing there" for every path it was
 * ever given, including live builds.
 */
export async function objectExists(path) {
  try {
    const res = await fetch(metadataUrl(path), { cache: 'no-store' });
    if (res.status === 404) return false;
    return res.ok;
  } catch {
    return false; // offline or blocked: fall through and let the upload itself decide
  }
}

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
    // Same-origin (see the CORS note at the top). In `vite dev` there is no rewrite,
    // so this resolves to index.html, res.json() throws, and the static entries show —
    // which is the same fallback as every other failure.
    const res = await fetch(INDEX_URL, { cache: 'no-store' });
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

  // Guaranteeing a distinct URL takes both halves: putting versionCode in the path, and
  // refusing to write where a build already sits. The path alone is only a convention —
  // re-entering the same version code (a typo, or a rebuild of the same number) would
  // still land on a published file, and Storage overwrites without complaint.
  if (versionCode === '' || versionCode == null || !Number.isFinite(Number(versionCode))) {
    throw new Error('Version code is required — it is what gives each build its own download URL.');
  }
  const path = apkPath(slug, version, versionCode);
  if (await objectExists(path)) {
    throw new Error(
      `Version code ${versionCode} is already published for this app. Bump the version code ` +
      'and rebuild — replacing a live build would break the checksum mirrors have on file.',
    );
  }

  const [checksum, url] = await Promise.all([
    sha256(file),
    uploadFile(path, file, 'application/vnd.android.package-archive', onProgress),
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
