# Staff-sent email verification — the backend half

Admin → Accounts has a **Send verification emails (N)** button, an **Unverified** filter,
and a **Send verification email** button in each unverified account's drawer. They call
one new callable, `staffSendVerificationEmails`, which isn't in production yet. Until it
is deployed, pressing either button says so instead of claiming a send.

**[`verify-email-backend.patch`](./verify-email-backend.patch)** is a `git diff` against
**yotemarket-flutter `5ae318b`**. It's independent of
[`comms-backend.patch`](./comms-backend.patch): either can be applied first, or alone.

```
cd yotemarket-flutter
git apply ../yotemarket-vercel/docs/verify-email-backend.patch
```

Checked before handing over:

- `git apply --check` is clean on `5ae318b` on its own, before `comms-backend.patch` and after it.
- With **both** patches applied: `eslint index.js email.js verify.js` is clean,
  `check-exports` passes (288; the snapshot now records the new export), and 97 tests pass
  across the pure suites. `tests/verify.test.js` alone has 22.
- An adversarial review (four lenses, each finding checked by a skeptic) confirmed 17
  findings, and every one is fixed in this version. See *What the review changed* below.

## Why

An email/password sign-up gets one "Confirm your email", at sign-up. If it was missed (spam
folder, an expired link), the only way to get another was the person finding the resend
themselves. Accounts showed "unverified" and offered no way to act on it.

## What it does

`staffSendVerificationEmails({ uids })` is **admin only**, like Accounts itself. It takes
at most 25 accounts per call. Each account is checked against its **Auth record**, not
against the list the console sent:

| Outcome | When |
| --- | --- |
| `sent` | Delivered |
| `already_verified` / `disabled` / `no_email` / `not_found` | Skipped, because the Auth record says so |
| `new_account` | Created in the last 24 h. Its sign-up email is still fresh |
| `recently_sent` | A verification email **went** to that address in the last 24 h, from staff or from the person |
| `in_progress` | Another admin's send to that address is in flight right now |
| `failed` | Definitely not sent: Resend refused it, the key is missing, or the link couldn't be made. Retry is allowed |
| `unknown` | The connection dropped or timed out, so it may have gone. It's treated as sent for 24 h so nobody gets two |

It also returns `notAttempted`: accounts it ran out of time for (see the time budget
below). The console sends those next.

How it works:

- **One marker per address.** `auth_emails/verify_<sha256>` holds `at`, the last
  verification email that actually went, and `pendingUntil`, a staff send in flight.
  `deliverAuthEmail` stamps `at` after **every** successful verify send, the person's own
  resends included. Checking "sent recently?" is therefore one keyed read, not a scan of
  the send log. The log is never pruned and can't be read in time order without a
  composite index.
- **Leases, not locks.** A staff send leases the address for 3 minutes in a transaction, so
  two admins can't both send. If the instance dies mid-send, the lease expires on its own.
  The address is never locked for a day by a send that didn't happen, and it is never
  reported as `recently_sent` when nothing went.
- **One run at a time.** `auth_emails/verify_run` is held for up to 90 seconds per call. A
  second admin, or a second tab, gets *"Another admin is sending verification emails right
  now"* instead of stacking up against the rate limit.
- **Paced at 1 per second.** That is half of Resend's default 2 per second, which leaves room
  for people's own verify and reset emails. A 429 gets one retry.
- **Time budget.** A call stops taking new accounts after 55 s and hands the rest back as
  `notAttempted`, so it always finishes inside the 120 s function timeout. The console waits
  130 s, longer than the server can run.
- **Resend request timeout.** `sendViaResend` now gives up after 15 s instead of waiting
  until the function was killed. Self-service auth emails get this too.
- **Only the account's own address.** It never uses an address supplied by the caller.
- **Audited** as `user.verify_email`, with totals and the uids that were sent.
- **`staffListUsers` returns `truncated`** when Auth has more accounts than the 5,000 the
  directory lists. The console then says the count covers only those.

## What the review changed

| Finding | Fix |
| --- | --- |
| The 24 h check read a random 25 log rows, so it missed recent self-service resends for exactly the accounts this targets | The per-address marker, stamped by every successful verify send |
| Sends by Firebase's own fallback leave no row | Accounts created in the last 24 h are skipped (`new_account`) |
| The console gave up at 70 s while the server could run 120 s, so batches were misreported as "not attempted" | 55 s server budget with `notAttempted` handed back. Console timeout 130 s. A request that fails partway is reported as "couldn't confirm" |
| A killed instance left a claim that blocked the address for 24 h and read as "already sent" | 3-minute lease, and `in_progress` is distinct from `recently_sent` |
| A dropped connection after Resend accepted the email released the claim, so a retry sent a duplicate | Errors classified: a definite refusal is `failed`; anything ambiguous is `unknown` and holds the address for 24 h |
| Two concurrent runs exceeded the rate limit and could drop people's own reset emails | One run at a time, pace halved |
| Audit showed totals only | `sentUids` added |
| Directory silently capped at 5,000 | `truncated` flag |

Console-side fixes in the same pass: the run survives leaving the screen; the directory
refreshes when the server finds stale rows; the Unverified filter is hidden when the
directory has no Auth data; and the staff `Btn` forwards `title`, so tooltips render.

## Deploy

```
firebase deploy --only functions:staffSendVerificationEmails,functions:staffListUsers,functions:sendVerificationEmail,functions:sendPasswordResetEmail
```

`staffListUsers` gains `truncated`. The two self-service auth functions pick up the marker
stamp and the Resend timeout. It needs `RESEND_API_KEY`, which is already set. There's no
new collection, rule or index: everything lives in `auth_emails`, which the rules already
deny to clients.

## Verify after deploy

1. Accounts → **Unverified** lists accounts with an address that isn't verified. The
   button shows the same number.
2. Open one that's more than a day old → **Send verification email**. The toast says sent,
   and the email arrives from YoteMarket.
3. Press it again. The toast says *Not sent — … in the last 24 hours*.
4. Press **Send verification emails**. The summary counts what was sent and skips the
   account from step 2.
5. Start a bulk send in two tabs at once. The second says another admin is sending.
