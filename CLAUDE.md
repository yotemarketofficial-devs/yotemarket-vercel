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

## DONE — the Storage rule is deployed (2026-08-25)

`Admin → App releases` uploads APKs to `app_releases/` in Firebase Storage. That rule
is now **live in production** (`firebase deploy --only storage`, project
`yotemarket-app`), so publishing works. It was written in the yotemarket-flutter repo
by a session with no Firebase credentials, which is why it sat merged-but-inert.

Verified after release: both `app_releases/` paths answer 404 to an anonymous GET
(readable, nothing published yet) while an unmatched path answers 403 — so read is
open where it should be and the bucket was not widened. The emulator suite in
`firebase/tests/storage.rules.test.js` covers it too (public read, admin write,
owner-email write, unverified/moderator/anonymous denied, non-APK denied).

Still worth doing once a build is up: load `https://www.yotemarket.co.ke/apk` and
check the version, size and SHA-256 are the ones you uploaded.

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
app_releases/<slug>/yotemarket-<slug>-<version>-<versionCode>.apk
```

**`versionCode` is in the filename, and it is required.** The version alone does not
identify a build — `1.0.0+4` and `1.0.0+5` are both "1.0.0", and the picker auto-fills
that field from the filename — so keying on version alone sent the second upload to the
first one's path and silently replaced a published build. `publishRelease` also refuses
to write where an object already exists, because the path convention alone doesn't stop
someone re-entering a version code.

This matters more than a clobbered file: `index.json` publishes a SHA-256 that mirrors
verify against the URL, so changing the bytes under a live URL reads as tampering to
anyone holding the old checksum, and corrupts any download in flight. Old builds are
left in place on purpose.

**The badge has two states**, driven by `uptodownUrl` (settable from the staff
screen, or in `apk-releases.mjs`): set → "GET IT ON Uptodown" pointing at the
listing; empty → "DOWNLOAD THE Android APK" pointing at `/apk`.

**AAB vs APK.** The staff screen rejects a `.aab` with the reason. Play builds
bundles and installs them itself; a person or a mirror cannot install one. Shorebird
handles OTA patches to a release, and does not replace publishing the APK here.

## The signing check

`src/lib/apk-signature.js` reads the signing certificate out of the chosen APK in the
browser and the staff screen **refuses to publish a build signed with anything but the
upload key**. Fingerprints are pinned per app as `signingSha256` in `apk-releases.mjs`.

Why pinned rather than "is it signed at all": Android ties update eligibility to the
signing certificate, so a build signed with a different key **cannot install over an
existing one** — the user gets a bare "App not installed" and must uninstall, losing
their data. Publish one wrong build to a mirror and everyone who took it is stranded.
There is also no fixed debug certificate to blacklist instead: the Android debug key is
generated per machine, so its fingerprint differs on every laptop.

An APK is a ZIP with an "APK Signing Block" between the entries and the central
directory; v2/v3 signatures live there, which is why `keytool -printcert -jarfile` reads
nothing from a modern APK. Use `apksigner verify --print-certs` to check by hand — the
screen prints the full fingerprint even on success so it can be compared by eye.

The parser was verified against the real 91 MB rider 1.0.0+4 APK: it reports scheme v3
and `8f:fc:3b:1a:…`, matching both `apksigner` and `keytool -list -v` on the keystore.

**If the upload key is ever rotated**, `signingSha256` must be updated in the same change
or every publish is refused.

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
