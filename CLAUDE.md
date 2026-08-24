# YoteMarket web app — working notes

React 19 + Vite SPA, deployed to Vercel on every push to `main`. Firebase (Auth,
Firestore, Storage) is the backend; the Cloud Functions, Firestore rules and
Storage rules live in the **yotemarket-flutter** repo under `firebase/`.

```
npm install
npm run dev        # local dev server
npm test           # vitest — 132 tests, all passing as of 2026-08-24
npm run build      # prebuild = sitemap, build = vite, postbuild = prerender
```

`npm run build` runs `scripts/generate-sitemap.mjs` (reads the live catalogue over
the Firestore REST API) and then `scripts/prerender.mjs`, which writes a real HTML
page per store/product/feed clip **and** per static route. Neither ever fails the
build — both degrade to "site ships unchanged" if Firestore is unreachable.

---

## OPEN ACTION — deploy the Storage rule (do this in VS Code)

`Admin → App releases` in the staff portal uploads APKs to `app_releases/` in
Firebase Storage. The rule permitting that is **merged but not deployed** — Firebase
deploys don't happen from GitHub, and the remote session that wrote it had no
Firebase credentials.

```
cd ../yotemarket-flutter/firebase     # wherever that repo is checked out
firebase login                        # once per machine
firebase deploy --only storage
```

Until it runs, the upload screen renders and accepts a file but publishing fails
with *"You don't have permission to upload here"*, and `/apk` shows the static
entries from `src/lib/apk-releases.mjs`. Nothing breaks; the feature is just inert.

Verify afterwards: publish a build from the staff portal, then load
`https://www.yotemarket.co.ke/apk` and check the version, size and SHA-256 shown
are the ones you just uploaded.

---

## The APK / Uptodown pipeline

Why it exists: mirrors (Uptodown, APKPure, Aptoide) list an Android app by fetching
the developer's own APK from a public URL and re-checking it on each release. Without
one, anything listed out there is a repackaged build nobody here signed. `/apk` is
that URL.

| File | What it does |
| --- | --- |
| `src/pages/ApkPage.jsx` | the public `/apk` page — per-app card with package, version, size, SHA-256, direct download; install/redistribution/publisher copy below |
| `src/lib/apk-releases.mjs` | static fallback data + `uptodownUrl` per app. The only edit-and-redeploy path |
| `src/lib/app-releases.js` | runtime layer: reads `app_releases/index.json`, publishes a build, hashes the file |
| `src/lib/storage.js` | `uploadFile()` — the resumable Storage upload the publisher uses |
| `src/kits/staff/releases.jsx` | the staff screen (Admin workspace, `adminOnly`) |
| `src/components/UptodownBadge.jsx` | the third store badge on `/mobile` and the homepage |

**Two sources, one page.** `/apk` renders `apk-releases.mjs` and then overlays
whatever `app_releases/index.json` reports. Any failure — no index, no network,
rules not deployed — falls back to the static entries rather than breaking. That is
deliberate: the page must never 500 for a mirror.

**Storage layout** (world-readable by rule):

```
app_releases/index.json             ← version, versionCode, sizeMb, sha256, url, releasedOn
app_releases/<slug>/yotemarket-<slug>-<version>.apk
```

Filenames are versioned, so a link a mirror already published never changes under
them. Old builds are left in place on purpose.

**The badge has two states**, driven by `uptodownUrl` (settable from the staff
screen, or in `apk-releases.mjs`): set → "GET IT ON Uptodown" pointing at the
listing; empty → "DOWNLOAD THE Android APK" pointing at `/apk`.

**AAB vs APK.** The staff screen rejects a `.aab` with the reason. Play builds
bundles and installs them itself; a person or a mirror cannot install one. Shorebird
handles OTA patches to a release, and does not replace publishing the APK here.

---

## Still open

- **No Uptodown listing URL yet.** Paste it into Admin → App releases when Uptodown
  publishes and the badge flips everywhere.
- **No APK published yet.** Both apps show "not published yet" until the first
  upload. Play Store URLs (`playUrl`) are empty too.
- Rider APK is wired up identically but has never been uploaded.

## Gotchas worth remembering

- **The prerender `<noscript>` swap is position-sensitive.** A head comment mentions
  `<noscript>` in prose; matching the *first* block swallowed that comment's `-->`
  and left the vite module `<script>` inside an open comment — every prerendered page
  served a boot splash that never booted. `scripts/prerender.mjs` now replaces the
  **last** block. If you touch `index.html`'s head comments, re-check a built page.
- **`package-lock.json` drifted out of sync once** (vitest's esbuild missing) and
  broke `npm ci` — CI was red for five days without anyone noticing. If CI fails at
  install, regenerate with `npm install --package-lock-only` rather than editing.
- **CI only gates the build.** `.github/workflows/ci.yml` runs `npm ci`, `npm test`,
  `npm run build`. No lint step — the repo has no ESLint config.
- Vercel serves `dist/<path>.html` before the SPA rewrite (`cleanUrls: true`), which
  is what makes the prerendered pages reachable at their clean URLs.
