# TODO — the working queue

**This file is the queue. If you are an agent picking up work on YoteMarket, start here.**

Rules for whoever works this list, human or agent:

- **Tick the box in the same commit as the work.** A finished task with an open box sends
  the next agent to redo it.
- **Do not delete a task to close it.** If it turns out to be wrong or unnecessary, say so
  under the item and tick it — the reason is worth more than the empty line.
- **Two repos.** Items are tagged `[web]` (this repo, `yotemarket-vercel`) or `[fn]`
  (`yotemarket-flutter`, the Cloud Functions / Firestore rules / Storage rules under
  `firebase/`). An `[fn]` item needs that repo open; it cannot be done from here.
- **Some items cannot be finished by an agent at all** — they need Firebase credentials, a
  signed build, or an account on somebody else's website. Those are marked
  **needs-credentials**. Do the code half, then say plainly what is left rather than
  reporting it done.
- **Verify before ticking.** Every item below says what "done" looks like. `npm test` and
  `npm run build` both have to stay green (CI runs `npm ci`, `npm test`, `npm run build` —
  there is no lint step, the repo has no ESLint config).

---

## P1 — a correctness bug, do this first

- [x] **`[fn]` A lapsed plan keeps its server-side entitlements for up to 24 hours.**
  **Status 2026-09-17:** fixed in code — `planRenewsAt` stamped by the trigger AND the
  backfill, `storeTier()` checks it, arithmetic extracted to `functions/entitlements.js`
  with `tests/entitlements.test.js` (15 cases, including the exact active-but-expired
  shape). Committed in yotemarket-flutter `c283ca7`. **DEPLOYED 2026-09-17 20:03 EAT** —
  all 22 affected functions (every `assertEntitlement` caller included), each confirmed by
  name in its deploy log. One click still owed by a signed-in admin: Promotions → Plan
  tiers → **Backfill store tiers**, so stores stamped before today carry `planRenewsAt`
  (until then they keep the cached tier exactly as before — no worse than yesterday).
  `storeTier()` trusts the denormalised `stores/{id}.planTier`, and that field is only
  recomputed when the subscription document is *written*. A plan lapsing is not a write —
  the next one is the 08:00 sweep. So between the renewal instant and the next morning,
  `assertEntitlement` still lets a lapsed merchant use POS, Insight, feed posting and team
  seats, while their own dashboard has already locked them out.
  **Fix:** stamp `planRenewsAt` beside `planTier` in `onSubscriptionTierChange` and compare
  it to the clock in `storeTier`. Full diff: [`staff-portal-backend.md` §1](./staff-portal-backend.md).
  **Done when:** a subscription whose `renewsAt` is in the past but whose `status` is still
  `"active"` is refused by `assertEntitlement`. Add a unit test for `subTierRank` /
  `storeTier` with that exact shape — it is the case that has no coverage today.

---

## P2 — shipped UI waiting on its backend half — ALL LANDED 2026-09-17

Kept for the record. The screens shipped first and degraded honestly, each carrying a
notice that disappears by itself once its backend half is live; the backend half is live
now. If any notice is still showing, that is the bug to chase, not this list.

- [x] **`[fn]` Send `renewsAt` and `statusRaw` from `staffListSubscriptions`.**
  **DEPLOYED 2026-09-17 20:00 EAT** (yotemarket-flutter `c283ca7`; log-verified per function).
  Ticked on the deploy, not on a screenshot — if the amber banner is still there, the
  console is reading a cached response: reload the page before reading the diff.
  Today the callable sends a pre-formatted date string and collapses every non-active
  status to `"overdue"`, so the billing table cannot derive anything and a cancelled plan is
  indistinguishable from an unpaid one. Two added fields; `next` and `status` stay as they
  are, so nothing that reads them breaks. [§2](./staff-portal-backend.md).
  **Done when:** the amber *"These statuses are the server's word, not a live check"* banner
  on Admin → Subscriptions & billing is gone, and a lapsed plan shows a red **Lapsed** pill
  with "overdue by N days" without waiting for the sweep.

- [x] **`[fn]` Stop sending `badgeFund: fmtKsh(0)`.** It is a hardcoded zero rendered as a
  measured figure on the billing screen. Either compute it or send `null` — the screen
  already prints an em-dash for a missing money figure, which is the honest answer.
  Sends `null` (nothing in the backend computes a badge fund). Same commit and deploy as
  the item above — live 2026-09-17.
  **Done when:** the "Badge insurance fund" tile shows a real number or a dash, not `KSh 0`.

- [x] **`[fn]` Accept `cat` in `staffListMerchants`.** The web filter is built and sends it.
  **Status 2026-09-17:** done in `c283ca7` — filter on page + tallies, `cat` on the row,
  `catId` in `storeIndexFields`, `ensureStoreIndex` widened to revisit stores stamped
  without it (`STORE_INDEX_VERSION` 2), four indexes in `firestore.indexes.json`.
  **DEPLOYED 2026-09-17** — indexes submitted 19:52 EAT, function 20:00 EAT. If the screen
  reports "The merchant index is still building" right after, that is the four composite
  indexes finishing; it clears on its own.
  Needs: the `where("catId", "==", cat)` on both the query and the counts scope, `cat` on
  each returned row, four composite indexes, and a backfill — note that `ensureStoreIndex`
  only stamps documents missing `nameLower`, so bumping `STORE_INDEX_VERSION` alone will
  **not** backfill `catId` onto stores that already exist. [§3](./staff-portal-backend.md).
  **Deploy the indexes before the function** — the query throws `failed-precondition` while
  an index builds.
  **Done when:** picking a category on Admin → Merchant verification fills the Category
  column, the amber "narrowed in the browser" note is gone, and the four status tallies
  change with the category rather than staying put.

- [x] **`[fn]` The two careers CV callables, the Storage rule, and erasure.**
  **Status 2026-09-17:** all four pieces in `c283ca7` (callables, `job_applications/`
  rule with 5 rules tests, `cv` through `serializeApplication`, object deleted in
  `staffDeleteDoc`). **DEPLOYED 2026-09-17** — rule released 19:52 EAT, callables
  20:00 EAT (`attachApplicationCv` answers 400 to an empty body, i.e. reachable and
  validating; `staffJobApplicationCv` 403 unauthenticated).
  `attachApplicationCv` (public, second step, reference-checked, create-only) and
  `staffJobApplicationCv` (People-gated, returns bytes, mints no URL), plus
  `match /job_applications/{path=**} { allow read, write: if false; }`, plus `cv` passed
  through `serializeApplication`, plus deleting the object in `staffDeleteDoc`.
  [§4](./staff-portal-backend.md).
  **Done when:** a CV attached at `/careers` opens from the staff drawer's **Open CV**
  button, and erasing that application removes the file from the bucket as well — check the
  bucket, not just the callable's return.

- [x] **`[fn]` `staffMerchantBilling` — what a merchant has paid us.**
  **Status 2026-09-17:** in `c283ca7`. Field checked: subscription payments key off
  `ownerId` — but so do wallet top-ups and POS sales, so the query also filters
  `purpose == "subscription"` (two equalities, no composite index). **DEPLOYED 2026-09-17.** Settlements (money
  going *to* a merchant) are visible; subscription payments *from* them are in no staff
  callable at all. One query over `mpesa_payments`. [§5](./staff-portal-backend.md).
  **Check the field name first** — that collection also holds order and top-up payments and
  they may not all key off `ownerId`.

- [x] **`[web]` Render the payment history once the callable above exists.**
  `src/kits/staff/billing.jsx` → the "Settlement history" block currently ends with a line
  saying subscription payments are not exposed yet. Replace that line with the real list;
  keep settlements and payments clearly separated, because one is our revenue and the other
  is their money.
  Done 2026-09-17: a separate **Payment history** panel above Settlement history
  (`fetchMerchantBilling` in service.js). Three states, none of which reads as "never
  paid": loading, the server could not answer, and an empty list. Until the callable is
  deployed the panel shows the could-not-load line.

---

## P3 — standing items, older than this session

- [ ] **`[web]` No Uptodown listing URL yet.** Paste it into Admin → App releases when
  Uptodown publishes; the badge flips everywhere on its own. **needs-credentials** (an
  Uptodown account).
- [ ] **No APK published.** Both apps show "not published yet", and the rider APK has never
  been uploaded although it is wired up identically. **needs-credentials** (a signed build
  + staff console access).
- [ ] **Verify `/apk` once a build is up.** Load `https://www.yotemarket.co.ke/apk` and check
  the version, size and SHA-256 are the ones that were uploaded.
- [ ] **`[web]` Verify the catalogue links after a deploy.**
  `grep -o 'href="/product/' dist/storefront.html | wc -l` should match the product count
  `scripts/prerender.mjs` prints. (Not `grep -c` — the prerendered page is one line, so
  that always prints 1.) This is the check that catches the indexing fix silently
  regressing. Last verified 2026-09-17 on a local build: 35 links, 35 products.
- [ ] **Play Store URLs (`playUrl`) are empty** in `src/lib/apk-releases.mjs`.

---

## Things that will bite you

- **`package-lock.json` drifted out of sync once** and broke `npm ci` — CI was red for five
  days before anyone noticed. If CI fails at install, regenerate with
  `npm install --package-lock-only`; never hand-edit it.
- **The prerender `<noscript>` swap is position-sensitive.** If you touch `index.html`'s head
  comments, re-check a built page — see the gotchas section of `CLAUDE.md`.
- **`src/lib/entitlements.js` has a server mirror** (`ENT_FEATURE_MIN` in
  `firebase/functions/index.js`). Change one, change both, or a merchant is gated
  differently by the browser than by the callable.
- **`src/kits/storefront/categories.js` is the single source of truth for the taxonomy.** The
  staff category filter, the merchant signup picker and the storefront all read it. A new
  top-level category needs its `match` array pointing at its own `catId`, not a parent's —
  that mistake has been made twice and is documented in the file.
