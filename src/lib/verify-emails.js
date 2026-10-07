/* verify-emails.js — the console half of staff-sent email verification.

   Admin → Accounts showed "unverified" against accounts and offered nothing to do about
   it: an email/password sign-up gets one "confirm your email", at sign-up, and if that was
   missed nothing sent another. The button that fixes it calls staffSendVerificationEmails
   (yotemarket-flutter, see docs/verify-email-backend.md), which re-checks every account
   itself. This file is only the console's arithmetic, kept pure so it is tested. */

/** Accounts per request — the server's own cap (VERIFY_BATCH_MAX in functions/verify.js). */
export const VERIFY_BATCH = 25;

/** Would the button email this account? An address, not verified, not disabled.
 *  `verified === false` exactly: the Firestore-fallback directory has no Auth data and
 *  marks everyone verified, and an unknown state must never count as unverified. */
export function needsVerification(u) {
  return Boolean(u && String(u.email || '').trim()) && u.verified === false && !u.disabled;
}

/** Split a list into requests of at most `size`. */
export function chunk(list, size = VERIFY_BATCH) {
  const out = [];
  for (let i = 0; i < (list || []).length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Fold per-account outcomes from one or more requests into totals for the summary.
 *  `lost` counts accounts whose request failed outright, so their outcome is unknown;
 *  `notAttempted` counts accounts never sent to the server. */
export function tally(results, { lost = 0, notAttempted = 0 } = {}) {
  const t = { sent: 0, failed: 0, unknown: 0, recent: 0, unconfirmed: 0, requested: 0, newAcct: 0, busy: 0, verified: 0, other: 0, lost, notAttempted, firstError: '' };
  (results || []).forEach((r) => {
    if (!r) return;
    switch (r.outcome) {
      case 'sent': t.sent++; break;
      case 'failed': t.failed++; if (!t.firstError && r.error) t.firstError = r.error; break;
      case 'unknown': t.unknown++; break;
      case 'recently_sent': t.recent++; break;
      case 'recently_unconfirmed': t.unconfirmed++; break;
      case 'recently_requested': t.requested++; break;
      case 'new_account': t.newAcct++; break;
      case 'in_progress': t.busy++; break;
      case 'already_verified': t.verified++; break;
      default: t.other++;   // no_email | disabled | not_found — changed since the list loaded
    }
  });
  return t;
}

const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
const was = (k) => (k === 1 ? 'was' : 'were');

/** The summary for the console. Nothing reads as sent unless the server said `sent`, and
 *  each reason an address is resting is said as what it is: a mail that went, one that may
 *  have gone, or one the person asked for themselves. */
export function describeTally(t) {
  const parts = [];
  if (t.sent) parts.push(`Sent ${n(t.sent, 'verification email', 'verification emails')}.`);
  else parts.push(t.unknown || t.lost ? 'No verification emails were confirmed sent.' : 'No verification emails were sent.');
  if (t.recent) parts.push(`${n(t.recent, 'account', 'accounts')} ${was(t.recent)} skipped — sent one in the last 24 hours.`);
  if (t.requested) parts.push(`${n(t.requested, 'account', 'accounts')} ${was(t.requested)} skipped — asked for one themselves in the last 24 hours.`);
  if (t.unconfirmed) parts.push(`${n(t.unconfirmed, 'account', 'accounts')} ${was(t.unconfirmed)} skipped — a send in the last 24 hours couldn’t be confirmed, so ${t.unconfirmed === 1 ? 'it isn’t' : 'they aren’t'} emailed again until a day has passed.`);
  if (t.newAcct) parts.push(`${n(t.newAcct, 'account', 'accounts')} signed up in the last day and ${t.newAcct === 1 ? 'has' : 'have'} a fresh sign-up email, so ${t.newAcct === 1 ? 'it was' : 'they were'} skipped.`);
  if (t.busy) parts.push(`${n(t.busy, 'account', 'accounts')} ${was(t.busy)} skipped — a send to ${t.busy === 1 ? 'it' : 'them'} is still in progress.`);
  if (t.verified) parts.push(`${n(t.verified, 'account has', 'accounts have')} verified since the list loaded.`);
  if (t.other) parts.push(`${n(t.other, 'account', 'accounts')} changed since the list loaded (disabled, deleted or no address) and ${was(t.other)} skipped.`);
  if (t.unknown) parts.push(`${n(t.unknown, 'send', 'sends')} couldn’t be confirmed — ${t.unknown === 1 ? 'it' : 'they'} may have gone, so ${t.unknown === 1 ? 'that address' : 'those addresses'} won’t be emailed again for 24 hours.`);
  if (t.failed) parts.push(`${n(t.failed, 'send', 'sends')} failed${t.firstError ? `: ${t.firstError}` : ''}.`);
  if (t.lost) parts.push(`For ${n(t.lost, 'account', 'accounts')} the server didn’t answer, so we can’t say whether ${t.lost === 1 ? 'it was' : 'they were'} emailed — press again later; anyone already emailed is skipped.`);
  if (t.notAttempted) parts.push(`${n(t.notAttempted, 'account', 'accounts')} ${was(t.notAttempted)} not attempted.`);
  return parts.join(' ');
}

/** Not shown as success when anything failed, went unanswered, wasn't attempted, or
 *  couldn't be confirmed. Everyone deliberately skipped is the server doing its job. */
export const tallyIsError = (t) => Boolean(t.failed || t.lost || t.notAttempted || t.unknown);

/** What to tell an admin when the request itself fails, rather than an account in it.
 *  A callable that isn't deployed answers 404 with no CORS headers, which the Firebase
 *  SDK reports as `internal` — so that case can't be told apart from a crash, and the
 *  message says both. */
export function describeCallError(e) {
  const code = String((e && e.code) || '');
  const msg = String((e && e.message) || '');
  if (/not-found|unimplemented/.test(code)) {
    return 'The server can’t send these yet — staffSendVerificationEmails isn’t deployed. See docs/verify-email-backend.md.';
  }
  if (/internal/.test(code) || msg === 'internal') {
    return 'The server didn’t answer. If staffSendVerificationEmails hasn’t been deployed yet, that is why — see docs/verify-email-backend.md.';
  }
  if (/aborted/.test(code)) return msg || 'A verification send is already running. Try again in a couple of minutes.';
  if (/deadline-exceeded/.test(code)) return 'The server took too long to answer.';
  if (/permission-denied/.test(code)) return 'Only an admin can send verification emails.';
  if (/Backend not configured/.test(msg)) return 'Sending needs a live backend.';
  return msg || 'Could not send verification emails.';
}

/** Was nothing sent at all for this request? Then its accounts are "not attempted",
 *  not "unknown": the server refused it before touching any account. */
export const refusedBeforeSending = (e) => /not-found|unimplemented|aborted|permission-denied|invalid-argument|unauthenticated/.test(String((e && e.code) || ''))
  || /Backend not configured/.test(String((e && e.message) || ''));
