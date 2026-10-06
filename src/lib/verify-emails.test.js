/* The console side of "send verification emails": who the button counts, how the list is
 * split, and what the admin is told. The rule throughout is that nothing reads as sent
 * unless the server said so, and an account in an unknown state is never counted. */
import { describe, it, expect } from 'vitest';
import { needsVerification, chunk, tally, describeTally, tallyIsError, describeCallError, refusedBeforeSending, VERIFY_BATCH } from './verify-emails.js';

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

describe('tally — the outcomes added after review', () => {
  it('says a fresh sign-up, a send in flight and an unconfirmed send for what they are', () => {
    const t = tally([{ outcome: 'new_account' }, { outcome: 'in_progress' }, { outcome: 'unknown' }, { outcome: 'unknown' }]);
    expect(t).toMatchObject({ newAcct: 1, busy: 1, unknown: 2, sent: 0 });
    const s = describeTally(t);
    expect(s).toMatch(/^No verification emails were sent\./);
    expect(s).toMatch(/signed up in the last day/);
    expect(s).toMatch(/being sent one by another admin/);
    expect(s).toMatch(/2 sends couldn’t be confirmed — they may have gone/);
  });

  it('separates accounts nobody can vouch for from accounts never tried', () => {
    const t = tally([{ outcome: 'sent' }], { lost: 25, notAttempted: 10 });
    const s = describeTally(t);
    expect(s).toMatch(/For 25 accounts the server didn’t answer/);
    expect(s).toMatch(/10 accounts were not attempted/);
    expect(tallyIsError(t)).toBe(true);
  });

  it('is not an error when everyone was deliberately skipped', () => {
    expect(tallyIsError(tally([{ outcome: 'recently_sent' }, { outcome: 'new_account' }]))).toBe(false);
    expect(tallyIsError(tally([{ outcome: 'failed' }]))).toBe(true);
  });
});

describe('describeCallError / refusedBeforeSending — after review', () => {
  it('passes on the server’s own “another admin is sending” message', () => {
    const e = { code: 'functions/aborted', message: 'Another admin is sending verification emails right now. Try again in a minute.' };
    expect(describeCallError(e)).toMatch(/Another admin/);
    expect(refusedBeforeSending(e)).toBe(true);
  });

  it('treats a timeout as unanswered, not as refused', () => {
    const e = { code: 'functions/deadline-exceeded', message: 'deadline-exceeded' };
    expect(describeCallError(e)).toBe('The server took too long to answer.');
    expect(refusedBeforeSending(e)).toBe(false);
  });

  it('knows an undeployed or unauthorised call never reached anyone', () => {
    expect(refusedBeforeSending({ code: 'functions/not-found' })).toBe(true);
    expect(refusedBeforeSending({ code: 'functions/permission-denied' })).toBe(true);
    expect(refusedBeforeSending({ message: 'Backend not configured' })).toBe(true);
  });

  it('does not assume an `internal` failure reached nobody', () => {
    // An undeployed callable and a crash mid-send both surface as `internal`.
    expect(refusedBeforeSending({ code: 'functions/internal', message: 'internal' })).toBe(false);
  });
});
