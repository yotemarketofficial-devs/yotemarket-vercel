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
npm test           # vitest — 303 tests, all passing as of 2026-10-09
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

## Communication — where a message from staff lands (2026-10-06)

The complaint was that the company communicates badly with marketers and everyone else.
The tooling existed (Comms → Message someone, Broadcasts, Support), but the messages
dead-ended:

- **A support notification led nowhere.** Staff outreach is a support ticket, readable
  only on `/help`. The scout and storefront bells sent the tap to a Profile screen with no
  messages on it, and the merchant bell did nothing. Now `notifLink()` in
  `lib/notifications.js` resolves it: scouts get their own **Messages** screen
  (`kits/marketers/messages.jsx`), and everyone else gets `/help?thread=<id>#requests`,
  which opens the thread.
- **Broadcast links were dropped.** The server always accepted `link`; the composer never
  sent one and no bell followed it. It's sent now, and it's validated by `safeNotifLink()`,
  a security boundary with tests: site paths and https only.
- **The staff "Email" buttons were bare `mailto:`** — the agent's own mail app and
  address, with nothing on the record. They're replaced by `MessageButton`
  (`kits/staff/comms.jsx`), which is shown only to staff that `staffMessageUser` accepts
  (admin, or the comms department).
- **Nothing was emailed.** Support replies, outreach and staff password resets weren't
  emailed, and the only automated mail came from `noreply@` with no reply-to. That's
  backend work: **[`docs/comms-backend.patch`](docs/comms-backend.patch)**, not deployed.
  Until it is, every screen reports what the server says it did. An old server says
  nothing about email, which reads as "not emailed", never as sent. The one case that
  would reach nobody gets a prefilled mail-app fallback in the Support drawer: a reply to
  someone who wrote in signed out.

WhatsApp is how scouts work, so phone numbers in the console now carry a wa.me link
(`lib/phone.js`, Kenyan formats only unless written with a `+`).

## The homepage hero is built to a mockup (2026-10-07)

The hero and the shared header (`Layout.jsx`) match a 1536px brand mockup. The copy, the
six-up feature row and both buttons are live HTML (`src/styles/home-hero.css`, sizes scaled
in `vw` from the artboard). The right-hand art (phone, the 200+ stores / M-Pesa / YoteFeed /
YoteAI cards, ribbon, rider, Nairobi skyline) is **one image**, `src/assets/hero/hero-art.webp`
(906×744), cut from that mockup. Its branding was then swapped for the real assets:
`logo.png` on the phone, `logo-white.png` on the delivery box, the YoteAI badge (as
`.ai-badge` draws it) in place of the mockup's robot on the YoteAI card, the supplied M-Pesa
logo on the payment card, and the supplied shopper photo in the phone's banner. The night art
carries the same swaps. The store icon on the 200+ stores card was redrawn in both: the
generated one had a broken door that never reached the floor. **YoteMarket does not offer live order tracking**, so the mockup's
"Order on the way · Track live" card shows YoteFeed instead, and nothing on the homepage
promises live tracking. Keep it that way until the feature exists. Its pieces overlap each other and the photo, so rebuilding
them as layers would drift from the design. To change the art, replace that file and keep
the 906:744 ratio, or update `width`/`height` on the `<img>`.

**The light art also ships at 2×**, `hero-art-2x.webp` (1812×1488), offered through `srcSet`
with a `sizes` that mirrors `home-hero.css`, so only screens that need the pixels download it.
The mockup has no larger original, so its pixels were upscaled by models: Real-CUGAN for detail
(the only one that kept the phone's small text spelled right), Real-ESRGAN x4plus over the
skyline and trees (Real-CUGAN paints foliage flat), and EDSR for colour (Real-CUGAN over-saturates
thin navy text). Every brand swap above was then redrawn at 2× from its full-size source. **Change
both files together**, or drop the `srcSet` until the 2× is redone: high-density laptops and
desktops, and 3× phones, are served only the 2× file (2× phones still get the 906px one), so an
edit to the 906px file alone would never reach them. The art files are imported in `HomePage.jsx` rather than served from `public/`, so
Vite gives them hashed names and a replaced image shows up on the next load. With a fixed name,
the `/assets/*.webp` cache rule in `vercel.json` kept the old art on screen for up to an hour.
Dark mode swaps in `hero-art-dark.webp` (1536×1024), the designer's night
scene, with the same logo/YoteAI swap applied. It is a full photograph in a different frame from
the light art, so the hero shows it whole, centred against the copy, and fades its edges into the
page (`html.dark .hx-art img` masks in `home-hero.css`).

The layout follows the mockup, but **the words are the brand's own**: "Shop local. *Delivered*
fast." (gradient on "Delivered"), the original lead, "Start shopping" / "Become a seller", and
"One platform · every role" below. The mockup's copy ("Live Better.", "Download App",
"Everything you need in one place") was tried and rejected; don't bring it back.

## The YoteAI, YoteFeed and Get-the-apps bands (2026-10-08)

The three bands below the shopper features are `src/pages/HomeSections.jsx` and
`src/styles/home-sections.css`. They are laid out to a brand reference board: pill tag, two-tone
headline, a YoteAI product window with a result card over it, icon-card lists, numbered steps, a
fan of four phones, a "Have a store?" card, handwritten notes (Caveat, in the Google Fonts link),
a feature list, a shopper photo and an ecosystem strip. The board was green and orange; here its
green is the brand purple and its orange the gold, with pale bands in light mode and deep purple
ones in dark mode.

**The YoteFeed stills in `src/assets/home/` were cut from that board** (the board's phone UI
cropped away, the sneaker's maker's swoosh retouched off). `shopper.webp`, the apps band's photo, is
a supplied picture (the yellow-top shopper): greens turned purple in LCh, `logo-white.png` printed
on her bag. Its purple and gold backdrop blocks are CSS (`.hs-apps-shot`), so they follow the theme.
A Dreamstime preview was offered for this slot twice, once with its watermark painted out by an AI
tool (the file's own XMP said so); neither was used. Don't use a stock image without its licence. The stills are
only the fallback: the fan shows merchants' newest clips once `lib/feed.js` loads (only the front
one plays, as before), and links each phone to `/feed/:id`.

**The board's words were not copied where the product doesn't back them**, and the bands must
not claim these: YoteAI writing listings from a photo, SEO titles or order tracking (YoteMarket
Insight's sales, pricing and stock reports are real, Growth plan and up); checkout inside a
YoteFeed clip (Buy adds a TAGGED product to the cart, so untagged clips say "Watch", not "Shop
now"; payment is the normal checkout); "available on Android & iOS" (the Google Play and App Store
badges were put back at the owner's request on 2026-10-08: they lead to /mobile, as they did before,
and Google Play goes to its listing once `playUrl` is set in `apk-releases.mjs`); door delivery (collection is a pickup point or the store); and,
for signed-out visitors who get canned replies, that every YoteAI answer is a real listing. The board's YoteAI was a seller tool; the band stays shopper-first and its last card says
what sellers really get (YoteAI chat in the dashboard writes listings, drafts replies, advises on
stock and price). The unsourced 4.7★ rating was dropped with the old apps band.

## The For shoppers / For merchants bands (2026-10-08)

`ShoppersSection` and `MerchantsSection` in `src/pages/HomeSections.jsx` (styles at the end of
`src/styles/home-sections.css`) replace the old six- and eleven-card grids, laid out to the second
brand board: pill, two-tone headline, CTA; a photo with the app over it; icon-card lists; the YoteFeed
card; and, for merchants, the board's dark band (deep purple in both themes) with a 2×4 card grid.

**The photos were supplied, then branded.** `for-shoppers*.webp` (sweater, braids) came cut out on
transparency; `for-merchants*.webp` (the seller at his counter) came on a white studio wall. Both had
greens turned to the brand purple in LCh (the plants stay green), and the real logo printed back on
every bag, box and the apron, shaded by the surface under it. The fruit logo on the merchant's laptop
was retouched off, like the board's sneaker swoosh. The merchant's wall was NOT replaced by a flat
fill: it is the photo's own wall, repainted deep purple with every shadow the shelves, rail and he
cast on it kept, a pool of light behind him and the photo's grain, so it reads as a real room and
fades into the band (`#2C1260` at its edges). `feed-handbag.webp`, the YoteFeed card's clip, is a
supplied photo too: the bag's hanging maker's monogram charm was retouched off (a trademark) and the
phone case turned purple.

**The stages are sized in `cqw`** (container units of the stage), so photo, phone, dashboard window
and YoteAI card scale as one picture. On wide screens both photos stand on the band's bottom edge
(the stage bleeds through the band's padding), and the merchant stage reaches back under the copy
column on a fade, as the board's photo does. **The overlay positions are tied to the merchant photo**:
the window sits right of his head, the YoteAI card right of the phone in his hand. Replace the photo
and those two `left`/`top` values must be re-fitted. Under 560px the window goes and the card drops
under the photo at a fixed size.

**The dashboard window is a transcription, not an impression**: nav labels from
`kits/dashboard/layout.jsx` (`NAV`), the Revenue figure and the week's order bars from
`dashboard/data.js` (the dashboard's own demo store, Tamasha Electronics). There is no "Total sales"
line chart, no store "Active" badge, and the button says "View storefront". Keep it that way.

**What the boards said that the product doesn't, and what the bands say instead** (checked against
the code, 2026-10-08):

- "Hundreds of trusted stores": there are 15 live stores. → "Browse local stores by category.
  Verified sellers carry a badge."
- "Choose pickup or delivery" / "get it delivered": no door delivery exists; hub carriage is paused
  (Terms). Store pickup with a one-time code always works. → "Collect with a code".
- "Ask YoteAI / Track every order … real-time updates": YoteAI finds products; it doesn't track
  orders. → "Ask YoteAI".
- "Shop instantly" / "Shop Now": Buy adds a tagged product to the cart. → "Tap Buy", button "Buy".
- "Turn your product photo into a polished listing": nothing takes a photo. YoteAI chat drafts
  listing copy from the merchant's own products. → the card "Write a product description".
- "Demand insights — see what's trending": there is no trending or search data. Insight (Growth+)
  reports on the store's own sales, prices and restocking. → "YoteMarket Insight".
- "Generate KRA invoices": POS invoices carry the merchant's KRA PIN but are not eTIMS. → "receipts".
- "Receive payments instantly": online payments land in a pending balance first, and the merchant
  starts each withdrawal. → "Withdraw to M-Pesa whenever you like".
- Plan gates are shown where they apply (POS and Insight say Growth+).

## One platform, Earn with YoteMarket and the final CTA (2026-10-08)

`RolesSection`, `EarnSection` and `CtaSection` in `src/pages/HomeSections.jsx` (styles at the very end
of `home-sections.css`) replace the old roles cards, the earn cards and the `cta-band`, laid out to the
third brand board. The people are the eight supplied models (one sheet, already cut out), branded like
the others: greens to purple in LCh, the real logo printed back on every bag, box, apron and delivery
case, nothing else touched. Who goes where: Shop = the yellow-top shopper, Sell = the apron + laptop
merchant, Earn = the megaphone scout, Ride = the standing rider; the Scout card = the blazer woman (she
is the narrowest figure, and the card is narrow); the Rider card = the rider on his bike, behind a
copy panel as on the board. `cta-group.webp` is one composite: the shopper MIRRORED to face out (the
owner asked; her bag's logo was re-printed the right way round after the flip), the merchant with
the parcel, the man with his phone, the rider. The figures' heads rise past their panels' tops: the
panels clip their sides only (`clip-path: inset(-N% 0 0 0)`).

**The copy on these bands has not been fact-checked yet** — see `docs/TODO.md`. In particular the
rider band says "Get paid per run" while carriage is paused, and the marketer steps end in
"Interview" (the earn landing says top scouts are invited to interview, not hired).

## A growing Kenyan community: the live figures (2026-10-09)

`CommunityStatsSection` (in `HomeSections.jsx`) replaces the old stats band, laid out to the stats
board: three cards, each a big number, a label, a line and a picture (the apron merchant under a
CSS-drawn striped awning, the supplied map of Kenya, the polo merchant with a rising arrow). **No
number on it is typed in.** The owner asked for a live counter that goes up when a merchant joins:

- `lib/community-stats.js` (pure, tested in `community-stats.test.js`) turns store documents into
  the figures: **stores** = every store not suspended by staff (what the shop and the sitemap show);
  **counties** = distinct counties among them, from the `county` field, or else a WHOLE word (or
  two neighbouring words) of `area` / `town` / `subCounty` / `address` that is one of the 47 names
  in `lib/counties.js` ("Homabay town" is Homa Bay; "Embulbul" is not Embu).
- `lib/community-live.js` reads them: an `onSnapshot` on `stores` (so a new merchant's store adds
  to the count on every open homepage) and a server-side `getCountFromServer` on `products`, minus
  the products of suspended stores. Loaded after mount like `lib/feed.js`, so Firebase stays off
  the critical path. While loading the numbers show a dash; if they can't be read at all, the
  numbers and the "Live figures" line are left out and the cards keep their words.
- The board's "Merchants" card became **Products**: one store per merchant, so "merchants" would
  only repeat the store count. On 2026-10-09 the band read 15 stores, 7 counties, 39 products.
- The numbers count up from 0 the first time they scroll into view (not with reduced motion).

The Rider program card shows the supplied rider on his bike (second model sheet), shifted right so
the copy panel covers his delivery box and never his face. Re-fit `right` on `.hs-prog.is-rider
.hs-prog-photo` if the photo changes. The program tags carry no star.

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
