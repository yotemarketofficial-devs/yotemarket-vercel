# Communication — the backend half

The web half shipped on its own (see "Communication" in `CLAUDE.md`) and degrades honestly:
every screen reports what the server *says* it did, and a server without this patch says
nothing about email, so the console reads "Not emailed — email delivery isn't switched on
yet" rather than implying a send. This file is the other half.

**[`comms-backend.patch`](./comms-backend.patch)** — a `git diff` against
**yotemarket-flutter `5ae318b`**. It was written and checked in a local clone, not pushed:
the session that wrote it had read access to that repo and no Firebase credentials.

```
cd yotemarket-flutter
git apply ../yotemarket-vercel/docs/comms-backend.patch
```

Checked before handing over:

- `git apply --check` clean against `5ae318b`
- `tests/email.test.js` — 23 pass (the 14 existing + 9 for the new template)
- `eslint index.js email.js` clean with the repo's own config
- `node check-exports.js` — all 287 exports still present (the patch adds none)
- The existing verify/reset emails render **byte-identical** after the template refactor

## What it changes, and why

| Where | Before | After |
| --- | --- | --- |
| `staffReplySupportTicket` | Notified in-app only. The Help Center promised *"we'll get back to you by email"*; nothing emailed a reply, so someone who wrote in signed out never saw the answer | Also emails the reply to the address on the ticket, with a link to the thread when the requester has an account. Returns `{ ok, emailed, emailError? }` |
| `staffReplySupportTicket` | Always notified the `"shopper"` bell, so a thread staff opened as *Store business* hopped from the merchant dashboard to the storefront on the first reply | Uses the audience stored on the ticket |
| `staffMessageUser` | In-app + push only; a marketer who hadn't opened the scout app never saw it | Also emails a copy unless `email: false`. Stores `audience` on the ticket. Returns `{ id, ref, emailed, emailError?, emailSkipped? }` |
| `staffSendPasswordReset` | Generated a raw `firebaseapp.com` link for the agent to paste into an email from their own address — the shape of phishing | `send: true` delivers the same branded reset email as self-service (`deliverAuthEmail`, same per-address throttle) → `{ sent: true }`. Falls back to the link only if delivery fails |
| `EMAIL_FROM` / `EMAIL_REPLY_TO` defaults | `noreply@yotemarket.co.ke`, no reply-to: every email read as automated and replies went nowhere | `YoteMarket Support <support@yotemarket.co.ke>`, reply-to `support@yotemarket.com` |
| `staffBroadcast` | An *Everyone* broadcast was stamped `audience: "shopper"`, so it never showed in the merchant dashboard bell | No audience on *Everyone*, so the web shows it in both bells. The mobile apps don't read `audience` |
| `SUPPORT_CATEGORIES` | No way to tell a scout's question from a shopper's | Adds `marketer`; the scout app already sends it (until now coerced to `other`) |
| `email.js` | Auth template only | `renderMessageEmail` (whole message in the email, `[YM-…]` in the subject so a reply can be matched, staff text escaped) and a shared `shell()` |

`emailPerson` never throws: the thread is the record and is written first, so a Resend
outage can't turn a sent message into an error. It reports `emailError` instead.

## Before deploying — one human check

**Is `support@yotemarket.com` read by someone?** It becomes the reply-to on every email the
platform sends, including verify and reset. It's the address `/help` already publishes, so
it should be — but if it isn't, replies bounce or sit unread, which is the problem this
fixes. To use a different inbox, set `EMAIL_REPLY_TO` in `firebase/functions/.env.yotemarket-app`.
Values in that file override the new defaults, so check it for an old `EMAIL_FROM=…noreply…` too.

`yotemarket.co.ke` is verified for sending in Resend (checked 2026-10-06); receiving is not
enabled, which is why the reply-to is the `.com` inbox and not `support@yotemarket.co.ke`.
`RESEND_API_KEY` is already set — the auth emails use it.

## Deploy

```
firebase deploy --only functions:staffReplySupportTicket,functions:staffMessageUser,functions:staffSendPasswordReset,functions:staffBroadcast,functions:createSupportTicket,functions:sendVerificationEmail,functions:sendPasswordResetEmail
```

The last two pick up the new sender defaults; `createSupportTicket` picks up the category.

## Verify after deploy

1. **Outreach.** Staff → Comms → Message someone → yourself, *Also email* ticked. The
   modal says *"… and by email"*. The email comes from *YoteMarket Support*, the subject ends
   `[YM-…]`, replying addresses `support@yotemarket.com`, and the button opens the thread on `/help`.
2. **Support reply to someone signed out.** Submit a request on `/help` while signed out, then
   reply from Staff → Support. The drawer shows a green *"Emailed to …"*, and the
   *Send it from your mail app* fallback does not appear.
3. **Reset password.** Staff → Accounts → a test account → Reset password → *"Reset email sent"*.
   Nothing should land on the clipboard.
4. **Everyone broadcast.** A store owner's account shows it in both the dashboard and
   storefront bells.
5. **Scout message.** Scout app → Messages → Message the team. The ticket shows **Marketer** in
   Staff → Support.

## Not in this patch

- **Email replies don't land on the thread.** A reply to one of these emails goes to the
  support inbox, and someone copies it onto the ticket. Threading it automatically needs
  receiving turned on for a domain in Resend, plus an inbound webhook that matches `[YM-…]`
  and appends to `support_tickets/{id}.replies`.
- **Marketer broadcasts can't be narrowed.** `BROADCAST_FILTERS.marketers` is `["all"]`.
  Useful segments: by county (territory is already canonical), *no activation in 30 days*,
  *payout pending*.
