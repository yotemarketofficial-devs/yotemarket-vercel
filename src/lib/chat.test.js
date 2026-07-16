/* Unit tests for the pure chat logic.
 *
 * Every function here is one that broke on a real user this week, or that I added
 * to fix that breakage:
 *   - conversationRole   → a store's customer chats leaked into the owner's personal inbox
 *   - visibleMessages    → a "deleted" chat replayed its old history on re-open
 *   - offerItems/Total   → an offer arrived as plain text with nothing to act on
 * They're pure, so they're cheap to pin. The parts that talk to Firestore
 * (sendChatMessage, subscribeConversations) are covered by the rules tests in
 * firebase/tests instead.
 */
import { describe, it, expect, vi } from 'vitest';

// chat.js pulls in firebase.js, which boots the SDK at module load. We only want
// the pure helpers, so stub the backend out entirely.
vi.mock('./firebase.js', () => ({ db: null, firebaseEnabled: false }));

const {
  conversationId, chatEnabled, tsMillis, otherParticipant,
  conversationRole, visibleMessages, offerItems, offerTotal,
  sameDayMs, dayLabel,
} = await import('./chat.js');

const SHOPPER = 'shopper_1';
const MERCHANT = 'merchant_1';

describe('conversationId — one stable thread per (store, shopper)', () => {
  it('is deterministic, so re-opening a store returns the same thread', () => {
    expect(conversationId('store_1', SHOPPER)).toBe('store_1__shopper_1');
    expect(conversationId('store_1', SHOPPER)).toBe(conversationId('store_1', SHOPPER));
  });
  it('separates stores and shoppers', () => {
    expect(conversationId('store_1', SHOPPER)).not.toBe(conversationId('store_2', SHOPPER));
    expect(conversationId('store_1', SHOPPER)).not.toBe(conversationId('store_1', 'other'));
  });
});

describe('chatEnabled — live chat needs a real, non-guest account', () => {
  it('is false without a backend', () => {
    // firebaseEnabled is mocked false above.
    expect(chatEnabled({ uid: SHOPPER })).toBe(false);
  });
  it('is false for no user, a guest, or the guest uid', () => {
    expect(chatEnabled(null)).toBe(false);
    expect(chatEnabled({ uid: 'guest' })).toBe(false);
    expect(chatEnabled({ uid: SHOPPER, isGuest: true })).toBe(false);
  });
});

describe('tsMillis — Firestore timestamps arrive in several shapes', () => {
  it('reads a real Timestamp', () => {
    expect(tsMillis({ toMillis: () => 1700000000000 })).toBe(1700000000000);
  });
  it('reads the serialized shapes (seconds / _seconds)', () => {
    expect(tsMillis({ seconds: 1700000000 })).toBe(1700000000000);
    expect(tsMillis({ _seconds: 1700000000 })).toBe(1700000000000);
  });
  it('returns 0 for a pending server timestamp, which is how we spot unsent messages', () => {
    expect(tsMillis(null)).toBe(0);
    expect(tsMillis(undefined)).toBe(0);
    expect(tsMillis({})).toBe(0);
  });
});

describe('otherParticipant', () => {
  const conv = { participants: [SHOPPER, MERCHANT] };
  it('finds the person who is not me', () => {
    expect(otherParticipant(conv, SHOPPER)).toBe(MERCHANT);
    expect(otherParticipant(conv, MERCHANT)).toBe(SHOPPER);
  });
  it('returns empty rather than undefined when there is nobody', () => {
    expect(otherParticipant({ participants: [SHOPPER] }, SHOPPER)).toBe('');
    expect(otherParticipant({}, SHOPPER)).toBe('');
  });
});

/* The leak: a store owner browsing as a shopper saw their store's customer
   conversations in their personal Messages inbox, because both surfaces asked
   for "conversations containing my uid" with no notion of which side I'm on. */
describe('conversationRole — which side of a chat am I on', () => {
  const roles = {
    participants: [SHOPPER, MERCHANT],
    info: { [SHOPPER]: { role: 'shopper' }, [MERCHANT]: { role: 'merchant' } },
  };

  it('reads my own role when the thread records it', () => {
    expect(conversationRole(roles, SHOPPER)).toBe('shopper');
    expect(conversationRole(roles, MERCHANT)).toBe('merchant');
  });

  it('infers my role from the other party when mine is missing (legacy threads)', () => {
    const onlyOther = { participants: [SHOPPER, MERCHANT], info: { [MERCHANT]: { role: 'merchant' } } };
    expect(conversationRole(onlyOther, SHOPPER)).toBe('shopper');
    const onlyShopper = { participants: [SHOPPER, MERCHANT], info: { [SHOPPER]: { role: 'shopper' } } };
    expect(conversationRole(onlyShopper, MERCHANT)).toBe('merchant');
  });

  it('falls back to shopper when nothing is known, rather than exposing a store inbox', () => {
    expect(conversationRole({ participants: [SHOPPER, MERCHANT] }, SHOPPER)).toBe('shopper');
    expect(conversationRole({}, SHOPPER)).toBe('shopper');
    expect(conversationRole(null, SHOPPER)).toBe('shopper');
  });

  it('keeps the two sides of one thread distinct — the whole point of the fix', () => {
    expect(conversationRole(roles, SHOPPER)).not.toBe(conversationRole(roles, MERCHANT));
  });
});

/* The replay: "delete for me" only hid the inbox row, so re-opening the store
   showed every old message again. hiddenAt is now a per-user clear point. */
describe('visibleMessages — a deleted chat re-opens clean', () => {
  const t = (ms) => ({ toMillis: () => ms });
  const msgs = [
    { id: 'a', at: t(1000), text: 'old' },
    { id: 'b', at: t(2000), text: 'also old' },
    { id: 'c', at: t(4000), text: 'after I cleared' },
  ];

  it('shows everything when I have never deleted the thread', () => {
    expect(visibleMessages(msgs, { hiddenAt: {} }, SHOPPER)).toHaveLength(3);
    expect(visibleMessages(msgs, {}, SHOPPER)).toHaveLength(3);
    expect(visibleMessages(msgs, null, SHOPPER)).toHaveLength(3);
  });

  it('hides only what came before my clear point', () => {
    const conv = { hiddenAt: { [SHOPPER]: t(3000) } };
    expect(visibleMessages(msgs, conv, SHOPPER).map((m) => m.id)).toEqual(['c']);
  });

  it('is per-user — the other party keeps their full history', () => {
    const conv = { hiddenAt: { [SHOPPER]: t(3000) } };
    expect(visibleMessages(msgs, conv, MERCHANT)).toHaveLength(3);
  });

  it('always shows a message I just sent (no server timestamp yet)', () => {
    const conv = { hiddenAt: { [SHOPPER]: t(3000) } };
    const pending = [...msgs, { id: 'd', at: null, text: 'sending…' }];
    expect(visibleMessages(pending, conv, SHOPPER).map((m) => m.id)).toEqual(['c', 'd']);
  });

  it('hides everything when I cleared after the last message', () => {
    expect(visibleMessages(msgs, { hiddenAt: { [SHOPPER]: t(9000) } }, SHOPPER)).toEqual([]);
  });
});

/* The bug: sendChatMessage carried `product` and `order` but not `offer`, so the
   customer saw an offer as plain text with nothing to act on. These pin the model
   the offer UI reads — including the legacy single-product shape. */
describe('offerItems / offerTotal — bundles and legacy singles', () => {
  const bundle = {
    items: [
      { productId: 'p1', productName: 'Dress', qty: 2 },
      { productId: 'p2', productName: 'Sandals', qty: 1 },
    ],
    price: 4500, // the negotiated total for the whole bundle
  };
  const legacy = { productId: 'p1', productName: 'Dress', price: 2500, qty: 2 };

  it('reads a bundle’s lines', () => {
    expect(offerItems(bundle)).toHaveLength(2);
    expect(offerItems(bundle)[0].productName).toBe('Dress');
  });

  it('treats a legacy single offer as a one-line bundle', () => {
    const items = offerItems(legacy);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ productId: 'p1', qty: 2 });
  });

  it('returns nothing for an empty or missing offer instead of throwing', () => {
    expect(offerItems({})).toEqual([]);
    expect(offerItems(null)).toEqual([]);
    expect(offerItems({ items: [] })).toEqual([]);
  });

  it('takes a bundle’s price as the agreed TOTAL, not a unit price', () => {
    expect(offerTotal(bundle)).toBe(4500);
  });

  it('multiplies a legacy single’s unit price by its qty', () => {
    expect(offerTotal(legacy)).toBe(5000);
  });

  it('is 0 for a missing or priceless offer', () => {
    expect(offerTotal(null)).toBe(0);
    expect(offerTotal({})).toBe(0);
  });

  it('never lets a one-line bundle be read as unit × qty (the shapes must not blur)', () => {
    const single = { items: [{ productId: 'p1', qty: 3 }], price: 1000 };
    expect(offerTotal(single)).toBe(1000); // the agreed total — NOT 3000
  });

  it('ignores a stray top-level qty on a bundle — it must never multiply the total', () => {
    // A counter built by spreading an older offer can drag a legacy top-level
    // `qty` along. For a bundle, `price` is already the agreed total: multiplying
    // by that stray field would overcharge the buyer.
    const strayQty = { items: [{ productId: 'p1', qty: 2 }], price: 4500, qty: 2 };
    expect(offerTotal(strayQty)).toBe(4500); // NOT 9000
  });
});

describe('day dividers', () => {
  const DAY = 86400000;
  it('spots same and different calendar days', () => {
    const a = new Date(2026, 6, 16, 9, 0).getTime();
    const b = new Date(2026, 6, 16, 23, 30).getTime();
    expect(sameDayMs(a, b)).toBe(true);
    expect(sameDayMs(a, a + DAY)).toBe(false);
  });
  it('treats a missing timestamp as not-a-day rather than matching everything', () => {
    expect(sameDayMs(0, 0)).toBe(false);
    expect(sameDayMs(Date.now(), 0)).toBe(false);
  });
  it('labels today and yesterday in words, older days by date', () => {
    expect(dayLabel(Date.now())).toBe('Today');
    expect(dayLabel(Date.now() - DAY)).toBe('Yesterday');
    expect(dayLabel(new Date(2020, 0, 15).getTime())).toMatch(/Jan/);
    expect(dayLabel(0)).toBe('');
  });
});
