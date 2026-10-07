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
  `check-exports` passes (288; the snapshot now records the new export), and 102 tests
  pass across the pure suites.
- Reviewed twice. An adversarial review (four lenses, each finding checked by a skeptic)
  confirmed 17 findings. An independent re-check then found where the first round of fixes
  fell short, plus new issues the rework introduced. Both rounds are fixed here, except
  the two limits under *Known limits*, which can't be fixed from the server.

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
| `recently_requested` | The person asked for one themselves in the last 24 h |
| `recently_unconfirmed` | A send in the last 24 h may have gone but couldn't be confirmed, including one whose instance died mid-send |
| `in_progress` | A send to that address is in flight right now |
| `failed` | Definitely not sent: Resend answered 4xx, the key is missing, the link couldn't be made, or the connection was never opened. Retry is allowed |
| `unknown` | It may have gone: a dropped connection, a timeout after connecting, or a 5xx. The address rests for 24 h, reported as unconfirmed, never as sent |

It also returns `notAttempted`: accounts it ran out of time for (see the time budget
below). The console sends those next.

How it works:

- **One marker per address.** `auth_emails/verify_<sha256>` records three separate things,
  each written by the code path that knows it:
  - `at` — a verification email that went (`deliverAuthEmail`, after Resend accepted it);
  - `unconfirmedAt` — one that may have gone (`deliverAuthEmail`, when the send failed
    ambiguously);
  - `requestedAt` — the person asked for one themselves (`throttleAuthEmail`, before the
    send, because if ours fails the apps fall back to Firebase's own).

  Self-service and staff sends stamp the same marker. Checking "rest this address?" is one
  keyed read, not a scan of a send log that is never pruned and can't be read in time order
  without a composite index.
- **Leases.** A staff send leases the address for 3 minutes in a transaction, recording when
  it started. Every send that finishes clears the lease. One still set after it has expired
  means the instance died mid-send, maybe after Resend accepted the email. That rests the
  address for a day and is reported as *couldn't be confirmed*, never as sent.
- **One run at a time.** `auth_emails/verify_run` is held for 130 s, longer than the
  function can run. A second call gets *"A verification send is already running"*: the
  lease can't tell another admin from a dead call, so the message doesn't guess. The
  console waits and retries a few times before stopping.
- **Paced at 1 per second.** That is half of Resend's default 2 per second, which leaves room
  for people's own verify and reset emails. A 429 gets one retry.
- **Time budget.** A call stops taking new accounts after 40 s and hands the rest back as
  `notAttempted`. A 429 is retried only while the budget lasts. The worst single account
  is about 66 s, so every call finishes inside the 120 s function timeout. The console
  waits 130 s, longer than the server can run.
- **Resend request timeout.** `sendViaResend` gives up after 15 s, and the deadline now
  covers reading the response body as well as the headers. Self-service auth emails get this
  too.
- **Only the account's own address.** It never uses an address supplied by the caller.
- **Audited** as `user.verify_email`, with totals, the uids that were sent, and the uids
  whose send couldn't be confirmed.
- **`staffListUsers` returns `truncated`** when Auth has more accounts than the 5,000 the
  directory lists. The console then says the count covers only those.

## What the review changed

| Finding | Fix |
| --- | --- |
| The 24 h check read a random 25 log rows, so it missed recent self-service resends for exactly the accounts this targets | The per-address marker, stamped on every path: sent, may have gone, or requested. The old log check stays only for sends from before deploy, and now fails closed |
| Sends by Firebase's own fallback leave no row | Accounts created in the last 24 h are skipped (`new_account`) |
| The console gave up at 70 s while the server could run 120 s, so batches were misreported as "not attempted" | 40 s server budget with `notAttempted` handed back, and the 429 retry only inside it. Console timeout 130 s. A request that fails partway is reported as "couldn't confirm" |
| A killed instance left a claim that blocked the address for 24 h and read as "already sent" | 3-minute lease. An abandoned lease rests the address as *unconfirmed*, never as sent |
| A dropped connection after Resend accepted the email released the claim, so a retry sent a duplicate | Errors classified. Only a 4xx, a missing key, a failed link or a connection never opened count as `failed`. A 5xx, a dropped connection or a timeout is `unknown`, which rests the address for 24 h, worded as unconfirmed |
| An unconfirmed send was later reported as "was sent one in the last 24 hours" | Separate `unconfirmedAt` and `requestedAt` fields, each with its own wording |
| Two concurrent runs exceeded the rate limit and could drop people's own reset emails | One run at a time (lease 130 s, longer than any call), pace halved, drawer button disabled during a bulk run |
| The Resend timeout didn't cover reading the body | It does now |
| Audit showed totals only | `sentUids` and `unknownUids` added |
| Directory silently capped at 5,000 | `truncated` flag |

Console-side fixes:
- The run survives leaving the screen.
- The directory refreshes when the server finds stale rows.
- The Unverified filter is hidden when the directory has no Auth data.
- The summary never opens with "none were sent" when some were unconfirmed, and doesn't show green for them.
- The staff `Btn` forwards `title`, so tooltips render.

## Known limits

Both are said in the console rather than hidden.

- **A Firebase fallback the server never saw.** When the web or mobile app can't reach
  `sendVerificationEmail` at all (no network, App Check, a cold start), it falls back to
  Firebase's own verification email. That send leaves no trace on the server, so a staff send
  later the same day can't know about it. Accounts created in the last 24 h are skipped
  whatever happens (`new_account`), because sign-up is when this is most likely. The worst
  case is one extra "Confirm your email". Closing it fully needs the apps to report their
  fallback sends.
- **Only the first 5,000 accounts.** `staffListUsers` stops at 5,000. The console says so
  (`truncated`), and the button only covers the listed accounts. If YoteMarket grows past
  that, the next step is a server-side "all unverified" mode that pages Auth itself.

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
5. Start a bulk send in two tabs at once. The second waits, then reports that a send is
   already running.
