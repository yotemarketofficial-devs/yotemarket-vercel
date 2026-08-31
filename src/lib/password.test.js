/**
 * password.test.js — what a staff console password is allowed to be.
 *
 * Firebase enforces six characters and nothing else. That is a reasonable floor for a
 * shopper and far too low here: this password reaches customer personal data, employment
 * records and the button that pays salaries. These tests pin the stricter rule, and — just
 * as importantly — pin the things it deliberately does NOT demand, so nobody "improves" it
 * later into a composition rule that produces Password1!.
 */
import { describe, it, expect } from 'vitest';
import { checkPassword, passwordStrength, MIN_LENGTH } from './password.js';

const ok = (pw, ctx) => checkPassword(pw, ctx).ok;
const why = (pw, ctx) => checkPassword(pw, ctx).problems.join(' | ');

describe('length', () => {
  it('accepts a long passphrase', () => {
    expect(ok('otter granite harbour')).toBe(true);
  });

  it('rejects anything under the minimum and says how short it is', () => {
    const p = why('short1');
    expect(p).toMatch(new RegExp(String(MIN_LENGTH)));
    expect(p).toMatch(/6/);
  });

  it('rejects what Firebase alone would have accepted', () => {
    // The whole reason this module exists: Firebase would take this.
    expect(ok('abc123')).toBe(false);
  });

  it('rejects an empty password with something actionable', () => {
    expect(why('')).toMatch(/Enter a new password/);
  });
});

describe('guessable passwords', () => {
  it('rejects the obvious ones even when they are long enough', () => {
    ['passwordpassword', 'letmeinletmein12', 'administrator123'].forEach((pw) => {
      expect(ok(pw), pw).toBe(false);
    });
  });

  it('sees through digit and punctuation padding', () => {
    // Stripped to letters before comparison, so this is caught by "yotemarket".
    expect(ok('Yotemarket@2026')).toBe(false);
    expect(why('Yotemarket@2026')).toMatch(/yotemarket/);
  });

  it('rejects the company and local terms a generic list would miss', () => {
    ['nairobi-nairobi', 'safaricom12345', 'mpesa-mpesa-mpesa'].forEach((pw) => {
      expect(ok(pw), pw).toBe(false);
    });
  });

  it('names which word it objected to', () => {
    expect(why('qwertyqwertyqwerty')).toMatch(/qwerty/);
  });
});

describe('low variety', () => {
  it('rejects a single character repeated to length', () => {
    expect(ok('aaaaaaaaaaaaaa')).toBe(false);
  });

  it('rejects a keyboard or alphabet run', () => {
    expect(ok('abcdefghijklmno')).toBe(false);
    expect(ok('zyxwvutsrqponml')).toBe(false);
  });

  it('does not object to an ordinary passphrase', () => {
    expect(checkPassword('otter granite harbour').problems.join(' ')).not.toMatch(/repetitive/);
  });
});

describe('the person it belongs to', () => {
  const ctx = { email: 'jane.wanjiku@yotemarket.com', name: 'Jane Wanjiku' };

  it('rejects their own name', () => {
    expect(ok('janewanjiku2026', ctx)).toBe(false);
    expect(why('janewanjiku2026', ctx)).toMatch(/your own name/);
  });

  it('rejects the local part of their address', () => {
    expect(ok('jane.wanjiku-secure', ctx)).toBe(false);
  });

  it('rejects the company domain', () => {
    expect(ok('yotemarket-secure-1', ctx)).toBe(false);
  });

  it('accepts an unrelated passphrase from the same person', () => {
    expect(ok('otter granite harbour', ctx)).toBe(true);
  });

  it('ignores name fragments too short to mean anything', () => {
    // A two-letter name must not blacklist every password containing those letters.
    expect(ok('otter granite harbour', { name: 'Jo Ng', email: 'jo@x.io' })).toBe(true);
  });
});

describe('reusing the current password', () => {
  it('refuses a change that changes nothing', () => {
    expect(ok('otter granite harbour', { current: 'otter granite harbour' })).toBe(false);
    expect(why('otter granite harbour', { current: 'otter granite harbour' })).toMatch(/already using/);
  });
});

describe('whitespace', () => {
  it('objects to a leading or trailing space', () => {
    expect(ok(' otter granite harbour')).toBe(false);
    expect(ok('otter granite harbour ')).toBe(false);
  });

  it('is happy with spaces inside a passphrase', () => {
    expect(ok('otter granite harbour')).toBe(true);
  });
});

describe('what it deliberately does NOT require', () => {
  it('does not demand a digit, a capital or a symbol', () => {
    // Composition rules push people to Password1! rather than to length. If someone adds
    // them later, this test should be the argument they have to answer.
    expect(ok('otter granite harbour')).toBe(true);
    expect(ok('correct horse battery')).toBe(true);
  });

  it('accepts an all-lowercase passphrase of sufficient length', () => {
    expect(ok('marble lantern voyage')).toBe(true);
  });
});

describe('several problems at once', () => {
  it('reports every failing rule rather than only the first', () => {
    // Short AND personal AND common — fixing one at a time would take three attempts.
    const r = checkPassword('jane1', { email: 'jane@yotemarket.com', name: 'Jane' });
    expect(r.ok).toBe(false);
    expect(r.problems.length).toBeGreaterThan(1);
  });
});

describe('passwordStrength', () => {
  it('is empty for an empty password', () => {
    expect(passwordStrength('').score).toBe(0);
    expect(passwordStrength('').label).toBe('');
  });

  it('rises with length and variety', () => {
    const weak = passwordStrength('aaaaaaaa').score;
    const strong = passwordStrength('otter granite harbour quartz').score;
    expect(strong).toBeGreaterThan(weak);
  });

  it('never exceeds its scale', () => {
    const s = passwordStrength('x'.repeat(400) + 'AbC!@#$%^&*()_+9876');
    expect(s.score).toBeLessThanOrEqual(4);
    expect(s.label).toBeTruthy();
  });

  it('gives every score a tone the Pill vocabulary understands', () => {
    ['', 'a', 'abcdefgh', 'otter granite harbour', 'otter granite harbour quartz zephyr']
      .forEach((pw) => expect(['ok', 'amber', 'red']).toContain(passwordStrength(pw).tone));
  });

  it('survives nonsense without throwing', () => {
    [null, undefined, 12345, {}].forEach((v) => expect(() => passwordStrength(v)).not.toThrow());
    [null, undefined, 12345, {}].forEach((v) => expect(() => checkPassword(v)).not.toThrow());
  });
});
