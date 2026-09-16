# YoteMarket web app — working notes

> **Looking for what to do next? → [`docs/TODO.md`](docs/TODO.md).** That file is the
> queue: open items, which repo each one lives in, what "done" looks like, and which ones
> need credentials an agent does not have. Tick the box in the same commit as the work.

React 19 + Vite SPA, deployed to Vercel on every push to `main`. Firebase (Auth,
Firestore, Storage) is the backend; the Cloud Functions, Firestore rules and
Storage rules live in the **yotemarket-flutter** repo under `firebase/`.

```
npm install
npm run dev        # local dev server
npm test           # vitest — 210 tests, all passing as of 2026-09-15
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

Moved to [`docs/TODO.md`](docs/TODO.md) — the APK/Uptodown items are under P3 there, with
the rest of the queue. Kept in one place on purpose: two todo lists drift, and the stale one
is always the one somebody reads.

## Indexing — the catalogue was orphaned (fixed 2026-09-15)

Search Console `sc-domain:yotemarket.co.ke` reported 59 pages as **"Discovered –
currently not indexed"** and climbing — roughly the whole sitemap. That bucket means
Google knows the URL and has never spent crawl budget fetching it, and the cause was
structural: **nothing on the site linked into the catalogue.** The storefront navigates
with a screen stack (`nav()` in `kits/storefront/index.jsx`) and only syncs the address
bar with `replaceState`, so no `<a href>` to a `/store/`, `/product/` or `/feed/` URL
existed anywhere in `src/`. `sitemap.xml` was the sole referrer for all 65 of them, and
a URL whose only referrer is a sitemap does not get crawled.

Three things now supply the missing links:

- `ProductCard` / `StoreCard` (`kits/storefront/ui.jsx`) render the title and seller name
  through `CardLink` — a real `<a href>` that still navigates via the screen stack, and
  leaves modifier-clicks to the browser so "open in new tab" works.
- `scripts/prerender.mjs` gives `/storefront` and `/feed` a `catalogueIndex()` body
  listing every store, product and clip as a plain link. The homepage `<noscript>` already
  links both, so the crawl path is homepage → hub → item in two hops. Bounded at
  `MAX_LISTED`; stores are always listed in full because each store page carries its own
  products (capped at 60 — raise it if a store ever exceeds that).
- **Verify after a deploy:** `grep -c 'href="/product/' dist/storefront.html` should match
  the product count `prerender` prints.

Two related defects fixed in the same pass:

- **Static pages were hostage to Firestore.** `prerender.mjs` returned early when
  `fetchListable()` threw, and the static-page loop sat *after* that return — so one
  Firestore blip during a Vercel build shipped every marketing URL as a bare copy of
  `index.html`, carrying the homepage's canonical. That alone would fold /about, /pricing
  and the rest into the homepage. The catalogue loops are now behind `if (cat)` and the
  static pages always ship.
- **Prerendered pages had no `robots` meta**, so they inherited index.html's
  `index, follow`; `/delete-account` shipped indexable and only went `noindex` once Google
  rendered the JS. `render()` now takes `robots` and the static loop passes `robotsFor(path)`.
- **Soft 404s.** `/product/:pid` is a real route, so `robotsFor()` calls it indexable even
  when the id was deleted — the SPA answers 200 with "Product not found". `src/lib/soft404.js`
  is a small signal the `NotFound` screen raises (once `catalogReady`, since before that
  "missing" only means "still fetching") and `RouteSeo` reads. RouteSeo stays the ONLY
  writer of the robots meta on purpose: child effects run before parent ones, so a second
  writer would just be overwritten.

The other Search Console buckets are expected and need no fix: *Page with redirect* (4) is
the apex → www 308 on a domain property, *Excluded by noindex* (5) is `/delete-account`
plus the gated areas, *Alternate page with proper canonical* (2) is benign. *Discovered*
and *Crawled – currently not indexed* also improve with domain authority over time, so
give the fix a few weeks and a re-crawl before judging it.

## The staff portal — three fixes, and the half that isn't here (2026-09-16)

**Subscriptions & billing** moved out of `screens.jsx` into `kits/staff/billing.jsx`. The
complaint was stale data, and the cause was not caching: `subscriptions/{uid}.status` is
rewritten by a sweep that runs once a day at 08:00, so the console was printing a word that
could be up to 24 hours out of date. `lib/subscription-state.js` (pure, unit-tested) derives
the live state from the renewal timestamp the way `lib/entitlements.js` already does, tells
cancelled apart from lapsed, and marks a row as the SERVER'S word when no timestamp came
with it. Rows open a drawer — plan, price, renewal, delivery allotment, what is locked,
settlements, notes — because a billing screen you cannot drill into cannot answer "what has
this merchant actually paid". The Export button, which had no `onClick` at all, works.

**Does service really stop when a plan lapses?** On the client, yes, at the renewal instant
— `tierRank()` returns 0 for active-but-expired, and the screen's own enforcement panel is
rendered from that same matrix so it cannot drift. On the SERVER there is a hole: `storeTier()`
trusts the denormalised `stores/{id}.planTier`, which is only recomputed when the subscription
document is written, and a plan lapsing is not a write. Fix is three lines and is written out
in `docs/staff-portal-backend.md` §1. Do that one first.

**The CV uploader**, both ends. On the employee record the panel was drawn as a drop zone
(dashed border, the comment says so) but had no drop handler — dragging a CV onto it did
nothing. It drops now. `.rtf` was being read down the plain-text path, so a CV came back as
`\rtf1\ansi\deff0{\fonttbl…` — long enough to clear the too-short guard, which is why it
produced a draft of nonsense rather than an error; it is refused by name. The accept list
carries media types as well as extensions, or a .docx from Drive is greyed out in the picker.
On `/careers`, candidates can attach the file instead of only linking to it — the upload is a
second call after the application lands, so a failed upload can never cost somebody their
application. The staff inbox shows it, and the links field is finally clickable.

**Merchants have a category filter**, sent server-side like county and status. The row shape
has no category yet, so the screen PROVES the filter was applied rather than trusting it: if
the page comes back unnarrowed it narrows it in the browser and says so, rather than showing
an unfiltered list that looks filtered.

Everything above ships and degrades honestly without the backend. `docs/staff-portal-backend.md`
is the other half — exact diffs for `yotemarket-flutter/firebase/` (the callables, four
composite indexes, a Storage rule and two new careers callables), written against commit
`f7e71fb` and applyable as-is.

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
