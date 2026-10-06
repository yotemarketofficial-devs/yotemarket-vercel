/* The console side of "send verification emails": who the button counts, how the list is
 * split, and what the admin is told. The rule throughout is that nothing reads as sent
 * unless the server said so, and an account in an unknown state is never counted. */
import { describe, it, expect } from 'vitest';
import { needsVerification, chunk, tally, describeTally, describeCallError, VERIFY_BATCH } from './verify-emails.js';

const acct = (over = {}) => ({ uid: 'u', email: 'a@example.com', verified: false, disabled: false, ...over });

describe('needsVerification', () => {
  it('counts an enabled account with an unverified address', () => {
    expect(needsVerification(acct())).toBe(true);
  });

  it('leaves out verified, disabled and address-less accounts', () => {
    expect(needsVerification(acct({ verified: true }))).toBe(false);
    expect(needsVerification(acct({ disabled: true }))).toBe(false);
    expect(needsVerification(acct({ email: '' }))).toBe(false);
    expect(needsVerification(acct({ email: '   ' }))).toBe(false);
  });

  it('never counts an account whose state is unknown', () => {
    expect(needsVerification(acct({ verified: undefined }))).toBe(false);
    expect(needsVerification(null)).toBe(false);
  });
});

describe('chunk', () => {
  it('splits into requests of the server cap', () => {
    const list = Array.from({ length: 2 * VERIFY_BATCH + 3 }, (_, i) => i);
    expect(chunk(list).map((c) => c.length)).toEqual([VERIFY_BATCH, VERIFY_BATCH, 3]);
  });

  it('handles an empty list', () => {
    expect(chunk([])).toEqual([]);
    expect(chunk(null)).toEqual([]);
  });
});

describe('tally + describeTally', () => {
  it('reports what went, what was skipped and why, and what failed', () => {
    const t = tally([
      { outcome: 'sent' }, { outcome: 'sent' },
      { outcome: 'recently_sent' },
      { outcome: 'already_verified' },
      { outcome: 'disabled' },
      { outcome: 'failed', error: 'resend 403: domain is not verified' }, { outcome: 'failed' },
    ]);
    expect(t).toMatchObject({ sent: 2, failed: 2, recent: 1, verified: 1, other: 1 });
    const s = describeTally(t);
    expect(s).toMatch(/^Sent 2 verification emails\./);
    expect(s).toMatch(/1 account was skipped — already sent one in the last 24 hours/);
    expect(s).toMatch(/1 account has verified since/);
    expect(s).toMatch(/2 sends failed: resend 403: domain is not verified/);
  });

  it('never says something was sent when nothing was', () => {
    expect(describeTally(tally([{ outcome: 'recently_sent' }]))).toMatch(/^No verification emails were sent\./);
    expect(describeTally(tally([]))).toBe('No verification emails were sent.');
  });

  it('uses the singular for one', () => {
    expect(describeTally(tally([{ outcome: 'sent' }]))).toBe('Sent 1 verification email.');
  });
});

describe('describeCallError', () => {
  it('says plainly when the callable is not deployed', () => {
    expect(describeCallError({ code: 'functions/not-found' })).toMatch(/isn’t deployed/);
  });

  it('owns up that `internal` may be the same thing', () => {
    expect(describeCallError({ code: 'functions/internal', message: 'internal' })).toMatch(/hasn’t been deployed yet, that is why/);
  });

  it('explains a permission refusal', () => {
    expect(describeCallError({ code: 'functions/permission-denied', message: 'Admins only.' })).toBe('Only an admin can send verification emails.');
  });

  it('falls back to the server’s own message', () => {
    expect(describeCallError({ code: 'functions/invalid-argument', message: 'At most 25 accounts per request.' })).toBe('At most 25 accounts per request.');
  });
});
