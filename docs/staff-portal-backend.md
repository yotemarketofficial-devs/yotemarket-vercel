# Staff portal — the backend half

Three staff-portal fixes landed in this repo on 2026-09-16 (billing, the CV uploader, the
merchant category filter). Each of them is a screen reading a **callable that lives in
`yotemarket-flutter/firebase/`**, so part of every one of them is a change over there.

This file is the other half, written to be applied rather than interpreted. Everything
below was read against `firebase/functions/index.js` at commit `f7e71fb`; line references
are from that commit.

**None of it is deployed.** The web side ships without it and degrades honestly — the
billing screen labels undated rows as the server's word, the category filter says when it
narrowed a page in the browser, and the careers CV upload tells the applicant to email it
instead. Deploy each piece and its screen lights up with no further web change.

Order of value: **1** (the entitlement hole) is a correctness bug and should go first;
**2** is what makes billing live; **4** is the only one that adds new stored data.

---

## 1. A lapsed plan keeps its server-side entitlements until the next sweep

**This is the answer to "do services actually stop when a subscription goes overdue?" —
and the answer today is "on the client yes, on the server up to 24 hours late."**

The chain, as it stands:

| Where | What it checks | When a plan lapses |
| --- | --- | --- |
| `web_app/src/lib/entitlements.js` → `tierRank()` | `status === 'active'` **and** `renewsAt > now` | locks **immediately** |
| `functions/index.js` → `subTierRank()` (9574) | the same two things | correct, but see below |
| `functions/index.js` → `storeTier()` (9584) | **`stores/{id}.planTier`, a cached number** | **stale — keeps the old rank** |

`storeTier()` prefers the denormalised `planTier`, and that field is only recomputed by
`onSubscriptionTierChange` — a trigger on *writes* to `subscriptions/{uid}`. A plan lapsing
is not a write. Nothing touches the document at the renewal instant; the next write is the
`renewSubscriptions` sweep at 08:00 Africa/Nairobi (9508), which sets `status: "expired"`
and *then* fires the trigger.

So for up to a day, `assertEntitlement` lets a lapsed merchant keep POS, Insight, feed
posting and team seats server-side, while their own dashboard has already locked them.

**Fix — stamp the expiry next to the tier, and check it where the tier is read.** No extra
document reads; the trigger already has the value in hand.

```js
// functions/index.js — in onSubscriptionTierChange (≈9665), alongside planTier:
      await storeRef.set({
        planTier: newTier,
        planName: after && after.status === "active" ? (after.plan || null) : null,
        planKind: after ? (after.kind || null) : null,
        planActive: newTier > 0,
        // When the cached tier above stops being true. storeTier() compares it to the clock,
        // so a plan that lapses between writes cannot keep its entitlements until the sweep.
        planRenewsAt: after && after.renewsAt && typeof after.renewsAt.toMillis === "function"
          ? after.renewsAt.toMillis() : null,
        entUpdatedAt: FV.serverTimestamp(),
      }, {merge: true});
```

```js
// functions/index.js — storeTier() (≈9584):
  const sd = s.data();
  if (typeof sd.planTier === "number") {
    // A cached tier is only worth what its expiry says. Without this the number outlives
    // the plan by up to a day — the window between the renewal instant and the 08:00 sweep.
    if (sd.planTier > 0 && sd.planRenewsAt && sd.planRenewsAt <= Date.now()) return 0;
    return sd.planTier;
  }
```

`backfillStoreTiers` (9680) writes the same fields — add `planRenewsAt` there too, then run
it once so existing stores carry the expiry. Stores it has not yet stamped are safe: a
missing `planRenewsAt` falls through to the cached tier exactly as today.

Worth deciding separately: the sweep only runs once a day, which is also why a merchant who
pays at 09:00 is fine but one who lapses at 09:00 stays labelled "active" all day. Moving
`renewSubscriptions` to hourly would cut both the label lag and this window, at the cost of
24 sweeps a day over a collection that is read whole each time.

---

## 2. `staffListSubscriptions` — send the timestamp, keep the real status

Today (2642) each row is flattened to:

```js
      next: s.renewsAt ? shortDate(msOf(s.renewsAt)) : (s.status === "active" ? "—" : "overdue"),
      status: s.status === "active" ? "active" : "overdue",
```

Two consequences on the billing screen:

- **No renewal timestamp reaches the browser**, so nothing can be derived. A plan that
  lapsed an hour ago reads "active" until the sweep relabels it the next morning. This is
  the staleness — the screen is printing a stored word, not a state.
- **Every non-active status becomes "overdue"** — a cancelled plan, an expired one and a
  genuinely unpaid one are one red pill, so churn is indistinguishable from debt.

Both are fixed by adding two fields. `next` stays exactly as it is, so nothing that reads
it today breaks:

```js
    return {
      id: d.id,
      uid: d.id,                                    // the subscription doc IS the owner uid
      shop: m.name || s.shop || "Merchant",
      plan: s.plan || "—",
      band: s.range || s.band || "—",
      amount: Number(s.price) || 0,
      kind: s.kind || null,
      next: s.renewsAt ? shortDate(msOf(s.renewsAt)) : (s.status === "active" ? "—" : "overdue"),
      // The renewal instant in epoch ms. The console derives the live state from this the
      // same way the entitlement gate does, instead of trusting a once-daily relabel.
      renewsAt: s.renewsAt ? msOf(s.renewsAt) : null,
      // The status as stored, before the collapse below — cancelled is not overdue.
      statusRaw: s.status || null,
      status: s.status === "active" ? "active" : "overdue",
    };
```

The web side already reads `renewsAt` and `statusRaw` when present
(`src/lib/subscription-state.js`, `src/kits/staff/service.js`). Nothing else to change here
— the amber "these statuses are the server's word" banner disappears on its own.

While you are in this function: `badgeFund: fmtKsh(0)` is a hardcoded zero rendered as a
measured figure. Either compute it or send `null`, which the screen already prints as an
em-dash.

---

## 3. `staffListMerchants` — accept a category

The web filter is built and sends `cat`. The callable ignores unknown arguments, so until
this lands the screen detects that the page came back unnarrowed, narrows it in the browser
and says so. That is a stopgap, not the design: paging and the tallies still cover every
category.

Store documents carry the category as **`catId`** (written by `registerStore`, 5270 — the field at 5340).
Older documents may hold `category` or `cat` instead — `staffOverview` already copes with
both (3984) — so a backfill is part of this.

```js
// functions/index.js — staffListMerchants (2374), beside the other filters:
  const cat = String(d.cat || "").trim();
  ...
  let query = db.collection("stores");
  if (level && place) query = query.where(level, "==", place);
  if (cat) query = query.where("catId", "==", cat);
  if (status) query = query.where("listStatus", "==", status);
```

Apply it to the `counts` scope as well (2403) or the status tallies will describe a
different set than the table:

```js
    let scope = db.collection("stores");
    if (level && place) scope = scope.where(level, "==", place);
    if (cat) scope = scope.where("catId", "==", cat);
```

And return it on the row, so the console's Category column has something to print:

```js
      cat: s.catId || s.category || s.cat || null,
```

**Backfill.** `storeIndexFields()` (60) materialises the fields the list queries on. Add
the category so documents written before `registerStore` settled on `catId` are findable:

```js
function storeIndexFields(s = {}) {
  const g = storeGeo(s);
  return {
    county: g.county || null,
    subCounty: g.subCounty || null,
    town: g.town || null,
    listStatus: s.suspended ? "suspended" : (s.verified ? "verified" : "pending"),
    nameLower: String(s.name || "").trim().toLowerCase(),
    // Normalised from whichever field the document was written with, so one equality
    // filter can find every store rather than only the ones created since registerStore.
    catId: s.catId || s.category || s.cat || null,
  };
}
```

⚠️ `ensureStoreIndex()` only stamps documents where `nameLower === undefined`, so bumping
`STORE_INDEX_VERSION` alone will **not** backfill `catId` onto already-stamped stores —
widen its `todo` filter to `nameLower === undefined || catId === undefined` in the same
change, or the filter will quietly miss every store that exists today.

**Indexes.** `firestore.indexes.json` needs the category combinations the screen can
produce. The merchant screen only ever sends the county level, so four:

```json
    { "collectionGroup": "stores", "queryScope": "COLLECTION", "fields": [
      { "fieldPath": "catId", "order": "ASCENDING" },
      { "fieldPath": "nameLower", "order": "ASCENDING" } ] },
    { "collectionGroup": "stores", "queryScope": "COLLECTION", "fields": [
      { "fieldPath": "catId", "order": "ASCENDING" },
      { "fieldPath": "listStatus", "order": "ASCENDING" },
      { "fieldPath": "nameLower", "order": "ASCENDING" } ] },
    { "collectionGroup": "stores", "queryScope": "COLLECTION", "fields": [
      { "fieldPath": "county", "order": "ASCENDING" },
      { "fieldPath": "catId", "order": "ASCENDING" },
      { "fieldPath": "nameLower", "order": "ASCENDING" } ] },
    { "collectionGroup": "stores", "queryScope": "COLLECTION", "fields": [
      { "fieldPath": "county", "order": "ASCENDING" },
      { "fieldPath": "catId", "order": "ASCENDING" },
      { "fieldPath": "listStatus", "order": "ASCENDING" },
      { "fieldPath": "nameLower", "order": "ASCENDING" } ] },
```

Deploy the indexes **before** the function. The query throws `failed-precondition` while an
index builds, and that path is already handled with a named error ("The merchant index is
still building") — but a staffer hitting it sees an empty screen in the meantime.

---

## 4. A candidate's CV — two callables and a rule

`/careers` now offers a file picker; the staff inbox shows a paperclip and an **Open CV**
button. Both call functions that do not exist yet, and both fail softly: the applicant is
told their application went through and to email the CV instead, and the drawer says no CV
is attached.

**Why a callable rather than a direct upload.** Applying is anonymous — `submitJobApplication`
takes `request.auth` as optional and stamps `source: "web"` for signed-out applicants. Every
write path in `storage.rules` requires `signedIn()`, so an applicant cannot reach the bucket
at all. Opening one for them would be a world-writable prefix on a public marketing page.

**Why no download URL.** A CV is candidate PII, and a Firebase download URL is a permanent
unauthenticated link to it. This follows `staff_documents` / `functions/hrfiles.js`: store
only the storage **path**, hand the bytes back through a staff-gated callable, mint no URL.

### 4a. Storage rule

```
    // Applicant CVs — DENIED TO EVERY CLIENT, both ways, exactly like staff_documents.
    // Applicants are anonymous, so no rule here could tell the person who submitted an
    // application from anyone else. Both directions go through callables instead:
    // attachApplicationCv writes with the Admin SDK, staffJobApplicationCv reads it back
    // for People. No download URL is ever minted for these objects.
    match /job_applications/{path=**} {
      allow read, write: if false;
    }
```

### 4b. `attachApplicationCv` — public, second step

Put the two constants next to `CAREER_DEPTS` / `CAREER_STAGES`; `throttle` (15539) and
`callerKey` (15566) are function declarations, so they hoist and can be called from here.

```js
const CV_MAX_BYTES = 5 * 1024 * 1024;
const CV_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain", "text/markdown",
];

/** Public: attach a CV to an application just submitted. { applicationId, ref, filename,
 *  contentType, dataBase64 } -> { ok, cv:{ name, size } }. */
exports.attachApplicationCv = onCall({region: REGION}, async (request) => {
  await throttle("application_cv", callerKey(request), 10, 24 * 3600000);
  const d = request.data || {};
  const id = String(d.applicationId || "").trim();
  const ref = String(d.ref || "").trim().toUpperCase();
  if (!id || !ref) throw new HttpsError("invalid-argument", "applicationId and ref are required.");

  const snap = await db.collection("job_applications").doc(id).get();
  // The reference is the second factor. It is handed only to whoever submitted, so a
  // document id on its own cannot write a file onto a stranger's application.
  if (!snap.exists || String(snap.data().ref || "").toUpperCase() !== ref) {
    throw new HttpsError("permission-denied", "That application reference does not match.");
  }
  // Create-only, like every other upload path here: one application, one CV, and no way to
  // replace a document the hiring team may already have read.
  if (snap.data().cv) throw new HttpsError("already-exists", "A CV is already attached to this application.");

  const contentType = String(d.contentType || "");
  if (!CV_TYPES.includes(contentType)) throw new HttpsError("invalid-argument", "Send a PDF or a .docx.");
  const buf = Buffer.from(String(d.dataBase64 || ""), "base64");
  if (!buf.length) throw new HttpsError("invalid-argument", "That file was empty.");
  if (buf.length > CV_MAX_BYTES) throw new HttpsError("invalid-argument", "That file is over the 5 MB limit.");

  const safe = String(d.filename || "cv").replace(/[^\w.\- ]+/g, "_").slice(-120);
  const path = `job_applications/${id}/${Date.now()}_${safe}`;
  await admin.storage().bucket().file(path).save(buf, {contentType, resumable: false});

  const cv = {path, name: safe, size: buf.length, contentType, at: Date.now()};
  await snap.ref.set({cv, updatedAt: FV.serverTimestamp()}, {merge: true});
  logger.info("application cv attached", {id, size: buf.length});
  return {ok: true, cv: {name: cv.name, size: cv.size}};
});
```

### 4c. `staffJobApplicationCv` — staff, read it back

```js
/** Staff (People): an applicant's CV → { dataBase64, contentType, filename, size }. */
exports.staffJobApplicationCv = onCall({region: REGION}, async (request) => {
  await assertDept(request, "people");
  const id = String((request.data && request.data.id) || "");
  if (!id) throw new HttpsError("invalid-argument", "id is required.");
  const snap = await db.collection("job_applications").doc(id).get();
  const cv = snap.exists ? snap.data().cv : null;
  if (!cv || !cv.path) throw new HttpsError("not-found", "No CV is attached to this application.");
  const [buf] = await admin.storage().bucket().file(cv.path).download();
  await logAudit(request, "application.cv.read", {type: "job_application", id}, {name: cv.name});
  return {dataBase64: buf.toString("base64"), contentType: cv.contentType, filename: cv.name, size: cv.size};
});
```

### 4d. Two edits to existing functions

- **`serializeApplication`** (2963) must pass `cv` through, or the inbox never shows the
  paperclip. Send the metadata only — `{name, size, at}` — and keep the storage path
  server-side, so a path never reaches a browser:

  ```js
    cv: a.cv ? {name: a.cv.name, size: a.cv.size, at: a.cv.at} : null,
  ```

- **Erasure must delete the object too.** A file surviving a right-to-erasure request is the
  failure that matters most here. `staffDeleteJobApplication` (10523) is a one-line
  delegation to the shared `staffDeleteDoc`, so put it in the helper, where it also covers
  any future collection that grows an attachment:

  ```js
  // functions/index.js — staffDeleteDoc, between reading the snapshot and ref.delete():
    const data = snap.data() || {};
    const label = labelOf ? labelOf(data) : null;
    // An attachment is part of the personal data being erased. Best-effort: a missing object
    // must not block the deletion of the record that points at it.
    if (data.cv && data.cv.path) {
      await admin.storage().bucket().file(data.cv.path).delete().catch(() => {});
    }
    await ref.delete();
  ```

---

## 5. Not built: what a merchant has paid us

The billing drawer shows settlements — money going **to** a merchant. What a merchant has
paid **us** is nowhere in the staff API. `mpesa_payments` holds it (`staffListSubscriptions`
already scans that collection for today's total), and `subscriptions/{uid}` is keyed
by owner uid, so a per-merchant payment history is a single query:

```js
/** Staff: what this merchant has paid us → { payments:[{at, amount, reference, plan, status}] }. */
exports.staffMerchantBilling = onCall({region: REGION}, async (request) => {
  await assertDept(request, "marketplace");
  const uid = String((request.data && request.data.uid) || "");
  if (!uid) throw new HttpsError("invalid-argument", "uid is required.");
  const snap = await db.collection("mpesa_payments").where("ownerId", "==", uid).limit(100).get();
  const payments = snap.docs.map((doc) => {
    const p = doc.data();
    return {id: doc.id, at: msOf(p.createdAt), amount: Number(p.amount) || 0,
      reference: p.reference || p.receipt || null, plan: p.plan || null,
      status: p.status || (p.paid ? "success" : null)};
  }).sort((a, b) => (b.at || 0) - (a.at || 0));
  return {payments};
});
```

Check the field name on `mpesa_payments` first — the subscription-payment writer at ≈1458
keys off `pay.ownerId`, which is what the query above assumes, but the collection carries
order and top-up payments too and those may be keyed differently.

The drawer has a panel waiting for this (`src/kits/staff/billing.jsx`, "Settlement history")
and currently states plainly that subscription payments are not exposed yet.
