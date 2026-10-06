/* Unit tests for splitting a notification between the two bells.
 *
 * A store owner shops the mall with the same account, so one `notifications` feed
 * serves two different hats. Get this wrong and either a merchant's personal order
 * updates are buried under store traffic, or — worse — something goes quiet because
 * both bells decided it belonged to the other one. Hence the rule that anything we
 * can't prove is shown in BOTH.
 */
import { describe, it, expect } from 'vitest';
import { notifAudienceOf, notifInAudience, notifLink, safeNotifLink, helpThreadPath } from './notifications.js';

const ME = 'uid_merchant_1';
const n = (over = {}) => ({ type: 'general', data: {}, ...over });

describe('notifAudienceOf — the server said so', () => {
  it('takes the stamped audience at face value', () => {
    expect(notifAudienceOf(n({ audience: 'merchant', type: 'chat' }), ME)).toBe('merchant');
    expect(notifAudienceOf(n({ audience: 'shopper', type: 'dispute' }), ME)).toBe('shopper');
  });

  it('ignores a junk value and falls back to inference', () => {
    expect(notifAudienceOf(n({ audience: 'nonsense', type: 'post_comment' }), ME)).toBe('merchant');
  });
});

describe('notifAudienceOf — pre-split docs, inferred', () => {
  it('reads a chat thread id: `storeId__shopperUid` ending in my uid means I am the shopper', () => {
    expect(notifAudienceOf(n({ type: 'chat', data: { convId: `store_9__${ME}` } }), ME)).toBe('shopper');
  });

  it('…and any other thread on that store is me wearing the merchant hat', () => {
    expect(notifAudienceOf(n({ type: 'chat', data: { convId: 'store_9__uid_customer' } }), ME)).toBe('merchant');
  });

  it('will not guess a chat with no thread id', () => {
    expect(notifAudienceOf(n({ type: 'chat', data: {} }), ME)).toBeNull();
    expect(notifAudienceOf(n({ type: 'chat', data: { convId: 'store_9__x' } }), null)).toBeNull();
  });

  it('classifies the types that only ever go one way', () => {
    expect(notifAudienceOf(n({ type: 'post_comment' }), ME)).toBe('merchant'); // store owner only
    expect(notifAudienceOf(n({ type: 'order' }), ME)).toBe('shopper');         // buyer only
    expect(notifAudienceOf(n({ type: 'support' }), ME)).toBe('shopper');
  });

  it('refuses to guess where both sides get the same type', () => {
    expect(notifAudienceOf(n({ type: 'dispute' }), ME)).toBeNull();   // buyer AND store get these
    expect(notifAudienceOf(n({ type: 'general' }), ME)).toBeNull();
  });
});

describe('notifInAudience — what each bell shows', () => {
  const storeChat = n({ type: 'chat', data: { convId: 'store_9__uid_customer' } });
  const myOrder = n({ type: 'order' });
  const oldDispute = n({ type: 'dispute' });

  it('keeps store traffic out of the personal bell', () => {
    expect(notifInAudience(storeChat, ME, 'shopper')).toBe(false);
    expect(notifInAudience(storeChat, ME, 'merchant')).toBe(true);
  });

  it('keeps personal traffic out of the store bell', () => {
    expect(notifInAudience(myOrder, ME, 'merchant')).toBe(false);
    expect(notifInAudience(myOrder, ME, 'shopper')).toBe(true);
  });

  it('shows an unclassifiable notification in both rather than losing it', () => {
    expect(notifInAudience(oldDispute, ME, 'shopper')).toBe(true);
    expect(notifInAudience(oldDispute, ME, 'merchant')).toBe(true);
  });

  it('shows everything on a surface that asks for no audience (the scout app)', () => {
    [storeChat, myOrder, oldDispute].forEach((x) => expect(notifInAudience(x, ME, undefined)).toBe(true));
  });
});

/* A tap on a notification is a navigation, and a broadcast link is typed by staff — so
 * the link rules are a security boundary as much as a routing table. */

describe('notifLink — where a tap goes', () => {
  it('opens the exact support thread in the Help Center', () => {
    expect(notifLink(n({ type: 'support', data: { ticketId: 'abc123' } })))
      .toEqual({ href: '/help?thread=abc123#requests', external: false });
  });

  it('encodes a thread id rather than splicing it into the URL', () => {
    expect(helpThreadPath('a/b?c#d')).toBe('/help?thread=a%2Fb%3Fc%23d#requests');
  });

  it('has nowhere to go for a support notification without a thread id', () => {
    expect(notifLink(n({ type: 'support' }))).toBeNull();
  });

  it('follows a broadcast link', () => {
    expect(notifLink(n({ data: { kind: 'broadcast', link: '/pricing' } })))
      .toEqual({ href: '/pricing', external: false });
  });

  it('returns null for a plain notification', () => {
    expect(notifLink(n())).toBeNull();
    expect(notifLink(null)).toBeNull();
  });
});

describe('safeNotifLink — what a staff-typed link may be', () => {
  it('keeps site paths, with query and hash', () => {
    expect(safeNotifLink('/marketers/app')).toEqual({ href: '/marketers/app', external: false });
    expect(safeNotifLink(' /help?topic=selling#faqs ')).toEqual({ href: '/help?topic=selling#faqs', external: false });
  });

  it('brings our own full address back inside the app', () => {
    expect(safeNotifLink('https://www.yotemarket.co.ke/pricing?x=1#y')).toEqual({ href: '/pricing?x=1#y', external: false });
    expect(safeNotifLink('https://yotemarket.co.ke/')).toEqual({ href: '/', external: false });
  });

  it('marks another https site as external', () => {
    expect(safeNotifLink('https://www.uptodown.com/android')).toEqual({ href: 'https://www.uptodown.com/android', external: true });
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://www.yotemarket.co.ke/pricing',     // not https
    '//evil.example/path',                      // protocol-relative: another site
    '/\\evil.example',                          // read as //evil.example by browsers
    '/\t/evil.example',                         // tab stripped → //evil.example
    '/\n/evil.example',
    'https://user:pass@evil.example/',
    'pricing',                                  // relative, no leading slash
    '',
    null,
  ])('refuses %j', (raw) => expect(safeNotifLink(raw)).toBeNull());
});
