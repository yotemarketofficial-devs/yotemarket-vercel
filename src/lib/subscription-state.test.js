/* Unit tests for the live billing state.
 *
 * The case that matters most is the one the staff console got wrong: a subscription whose
 * stored status still says "active" because the nightly sweep has not run, but whose
 * renewal date has passed — so the merchant's features have ALREADY stopped. Every
 * assertion about `stale` is guarding that window.
 */
import { describe, it, expect } from 'vitest';
import { billingState, billingTotals, renewalMs, renewalPhrase, stateOrder, DUE_SOON_DAYS } from './subscription-state.js';

const NOW = Date.UTC(2026, 8, 16, 9, 0, 0); // 16 Sep 2026, fixed so nothing reads the clock
const DAY = 86400000;
const at = (days) => NOW + days * DAY;

describe('renewalMs — every shape a renewal date arrives in', () => {
  it('reads a plain number of milliseconds', () => {
    expect(renewalMs(1789000000000)).toBe(1789000000000);
  });
  it('reads a client-SDK Timestamp', () => {
    expect(renewalMs({ toMillis: () => 42000 })).toBe(42000);
  });
  it('reads both admin-SDK serialisations', () => {
    expect(renewalMs({ seconds: 42 })).toBe(42000);
    expect(renewalMs({ _seconds: 42 })).toBe(42000);
  });
  it('reads a Date and an ISO string', () => {
    expect(renewalMs(new Date(NOW))).toBe(NOW);
    expect(renewalMs(new Date(NOW).toISOString())).toBe(NOW);
  });
  it('gives 0 for nothing, rather than NaN', () => {
    expect(renewalMs(null)).toBe(0);
    expect(renewalMs(undefined)).toBe(0);
    expect(renewalMs('not a date')).toBe(0);
    expect(renewalMs({})).toBe(0);
  });
});

describe('billingState — a plan that is genuinely paid up', () => {
  const st = billingState({ plan: 'Pro', status: 'active', renewsAt: at(20), amount: 16000 }, NOW);

  it('is active, with the days left counted', () => {
    expect(st.key).toBe('active');
    expect(st.days).toBe(20);
    expect(st.overdue).toBe(false);
  });
  it('carries the tier the gate would grant', () => {
    expect(st.rank).toBe(3);
    expect(st.tierName).toBe('Pro');
  });
  it('is not stale — the stored status and the date agree', () => {
    expect(st.stale).toBe(false);
    expect(st.dated).toBe(false);
  });
});

describe('billingState — the stale window the console was lying in', () => {
  // Stored status: active. Renewal: yesterday. The sweep runs at 08:00, so this document
  // can sit in this state for the best part of a day.
  const st = billingState({ plan: 'Growth', status: 'active', renewsAt: at(-1) }, NOW);

  it('reports the plan as lapsed, not as active', () => {
    expect(st.key).toBe('lapsed');
    expect(st.overdue).toBe(true);
  });
  it('flags it as stale so the screen can say WHY it disagrees with the server', () => {
    expect(st.stale).toBe(true);
    expect(st.serverStatus).toBe('active');
  });
  it('drops the capability rank to nothing — matching what the gate already does', () => {
    expect(st.rank).toBe(0);
    expect(st.tierName).toBe('No plan');
  });
  it('still lists what the plan WOULD unlock, because that is what has just stopped', () => {
    expect(st.unlocks.length).toBeGreaterThan(0);
    expect(st.unlocks).toContain('Point of Sale');
  });
  it('counts the days it has been overdue', () => {
    expect(st.days).toBe(-1);
    expect(renewalPhrase(st)).toBe('overdue by 1 day');
  });
});

describe('billingState — due soon', () => {
  it('warns inside the same window the backend sends its reminder in', () => {
    expect(billingState({ plan: 'Pro', status: 'active', renewsAt: at(DUE_SOON_DAYS) }, NOW).key).toBe('due');
    expect(billingState({ plan: 'Pro', status: 'active', renewsAt: at(DUE_SOON_DAYS + 1) }, NOW).key).toBe('active');
  });
  it('keeps the tier — due is not lapsed, and they are still paid up', () => {
    const st = billingState({ plan: 'Pro', status: 'active', renewsAt: at(1) }, NOW);
    expect(st.rank).toBe(3);
    expect(st.overdue).toBe(false);
    expect(renewalPhrase(st)).toBe('renews in 1 day');
  });
  it('renewing today is due, not overdue', () => {
    const st = billingState({ plan: 'Pro', status: 'active', renewsAt: at(0) + 3600000 }, NOW);
    expect(st.key).toBe('due');
    expect(renewalPhrase(st)).toBe('renews today');
  });
});

describe('billingState — statuses the old screen flattened into "overdue"', () => {
  it('tells cancelled apart from lapsed', () => {
    const st = billingState({ plan: 'Pro', status: 'cancelled' }, NOW);
    expect(st.key).toBe('cancelled');
    expect(st.rank).toBe(0);
  });
  it('treats expired, past_due and suspended as lapsed', () => {
    ['expired', 'past_due', 'overdue', 'suspended'].forEach((s) => {
      expect(billingState({ plan: 'Growth', status: s }, NOW).key).toBe('lapsed');
    });
  });
  it('has a state for no subscription at all', () => {
    expect(billingState(null, NOW).key).toBe('none');
    expect(billingState({}, NOW).key).toBe('none');
  });
  it('a lapsed plan is triaged above a healthy one', () => {
    expect(stateOrder('lapsed')).toBeLessThan(stateOrder('due'));
    expect(stateOrder('due')).toBeLessThan(stateOrder('active'));
  });
});

describe('billingState — a payload with no renewal timestamp', () => {
  // What today's staffListSubscriptions actually sends: a pre-formatted date string and a
  // status collapsed to active/overdue. Nothing can be derived, and the screen must not
  // pretend otherwise.
  const st = billingState({ plan: 'Starter', status: 'active', next: '14 Jul' }, NOW);

  it('repeats the server verdict', () => {
    expect(st.key).toBe('active');
  });
  it('marks itself dated rather than claiming to have checked', () => {
    expect(st.dated).toBe(true);
    expect(st.days).toBeNull();
    expect(st.stale).toBe(false);
    expect(renewalPhrase(st)).toBeNull();
  });
});

describe('billingTotals', () => {
  const rows = [
    { plan: 'Pro', status: 'active', renewsAt: at(20), amount: 16000 },
    { plan: 'Growth', status: 'active', renewsAt: at(2), amount: 11000 },   // due soon
    { plan: 'Growth', status: 'active', renewsAt: at(-2), amount: 11000 },  // stale → lapsed
    { plan: 'Starter', status: 'expired', renewsAt: at(-40), amount: 1500 },
    { plan: 'Pro', status: 'cancelled', amount: 16000 },
  ];
  const t = billingTotals(rows, NOW);

  it('counts recurring revenue from live plans only', () => {
    expect(t.mrr).toBe(16000 + 11000);
  });
  it('separates the money that is about to stop', () => {
    expect(t.atRisk).toBe(11000 + 11000 + 1500);
  });
  it('counts each state, and how many the server is still calling active', () => {
    expect(t.active).toBe(1);
    expect(t.due).toBe(1);
    expect(t.lapsed).toBe(2);
    expect(t.cancelled).toBe(1);
    expect(t.stale).toBe(1);
    expect(t.total).toBe(5);
  });
  it('handles an empty page without inventing a figure', () => {
    expect(billingTotals([], NOW).mrr).toBe(0);
    expect(billingTotals(null, NOW).total).toBe(0);
  });
});
