# Staff-sent email verification — the backend half

Admin → Accounts now has a **Send verification emails (N)** button, an **Unverified**
filter, and a **Send verification email** button in each unverified account's drawer.
They call one new callable, `staffSendVerificationEmails`, which isn't in production yet.
Until it is deployed, pressing either button says so instead of claiming a send.

**[`verify-email-backend.patch`](./verify-email-backend.patch)** is a `git diff` against
**yotemarket-flutter `5ae318b`**. It's independent of
[`comms-backend.patch`](./comms-backend.patch): they apply cleanly together, in either order.

```
cd yotemarket-flutter
git apply ../yotemarket-vercel/docs/verify-email-backend.patch
```

Checked before handing over:

- `git apply --check` is clean on `5ae318b`, both on its own and after `comms-backend.patch`.
- `tests/verify.test.js` has 15 new pure tests. With the email, entitlements, limits and
  access suites, 80 pass.
- `eslint index.js verify.js` is clean.
- `node check-exports.js`: 287 → 288. `exports.snapshot.json` now includes the new export,
  so later changes can't drop it unnoticed.

## Why

An email/password sign-up gets one "Confirm your email", at sign-up. If it was missed (spam
folder, an expired link), the only way to get another was the person finding the resend
themselves. Accounts showed "unverified" and offered no way to act on it.

## What it does

`staffSendVerificationEmails({ uids })` is **admin only**, like Accounts itself. It takes at
most 25 accounts per call; the console sends longer lists in batches and shows progress.

For each account it checks the **Auth record**, not the console's list:

| Outcome | When |
| --- | --- |
| `sent` | Unverified, enabled, has an address, and nothing was sent to it in the last 24 h |
| `already_verified` / `disabled` / `no_email` / `not_found` | Skipped. The record says so |
| `recently_sent` | A verification email went to that address in the last 24 h, sent by staff **or** by the person |
| `failed` | Delivery failed. The claim is released, so a retry isn't blocked for a day |

- **Only the account's own address.** It uses the email on the Auth record and never an
  address supplied by the caller, so it can't be aimed at another inbox.
- **No double sends.** Each staff send claims the address in a Firestore transaction (a
  hashed key in `auth_emails`, like the existing rate-limit rows). Two admins pressing the
  button at the same moment can't both email someone.
- **Logged only once it actually went.** The `auth_emails` row the self-service throttle
  counts is written after a successful send, never before.
- **Paced** under Resend's default limit of 2 requests per second, with one retry on a 429.
- **Same email** as self-service: `deliverAuthEmail("verify", …)`, the branded template.
- **Audited** as `user.verify_email`, with the sent/skipped/failed totals.

## Deploy

```
firebase deploy --only functions:staffSendVerificationEmails
```

It needs `RESEND_API_KEY`, which is already set because the auth emails use it. No new
collection, rules or indexes: it writes to `auth_emails`, which the rules already deny to
clients.

## Verify after deploy

1. Accounts → **Unverified** lists accounts with an address that isn't verified. The
   button shows the same number.
2. Open one of them → **Send verification email**. The toast says it was sent, and the
   email arrives from YoteMarket.
3. Press it again on the same account. The toast says *Not sent — … in the last 24 hours*.
4. Press **Send verification emails**. The summary counts what was sent and skips the
   account from step 2.
