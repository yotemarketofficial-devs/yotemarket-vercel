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

/** Fold per-account outcomes from one or more requests into totals for the summary. */
export function tally(results) {
  const t = { sent: 0, failed: 0, recent: 0, verified: 0, other: 0, firstError: '' };
  (results || []).forEach((r) => {
    if (!r) return;
    if (r.outcome === 'sent') t.sent++;
    else if (r.outcome === 'failed') { t.failed++; if (!t.firstError && r.error) t.firstError = r.error; }
    else if (r.outcome === 'recently_sent') t.recent++;
    else if (r.outcome === 'already_verified') t.verified++;
    else t.other++;   // no_email | disabled | not_found — changed since the list loaded
  });
  return t;
}

const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;

/** One sentence for the console: what went, what was deliberately not sent and why, what
 *  failed. Nothing reads as sent unless the server said `sent`. */
export function describeTally(t) {
  const parts = [];
  parts.push(t.sent ? `Sent ${n(t.sent, 'verification email', 'verification emails')}.` : 'No verification emails were sent.');
  if (t.recent) parts.push(`${n(t.recent, 'account was', 'accounts were')} skipped — already sent one in the last 24 hours.`);
  if (t.verified) parts.push(`${n(t.verified, 'account has', 'accounts have')} verified since the list loaded.`);
  if (t.other) parts.push(`${n(t.other, 'account', 'accounts')} changed since the list loaded (disabled, deleted or no address) and ${t.other === 1 ? 'was' : 'were'} skipped.`);
  if (t.failed) parts.push(`${n(t.failed, 'send', 'sends')} failed${t.firstError ? `: ${t.firstError}` : ''}.`);
  return parts.join(' ');
}

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
  if (/permission-denied/.test(code)) return 'Only an admin can send verification emails.';
  if (/Backend not configured/.test(msg)) return 'Sending needs a live backend.';
  return msg || 'Could not send verification emails.';
}
