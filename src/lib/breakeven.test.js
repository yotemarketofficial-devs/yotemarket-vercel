/**
 * breakeven.test.js — the break-even arithmetic.
 *
 * The dangerous failures here aren't crashes, they're plausible numbers. A
 * break-even point that's quietly wrong gets budgeted against. So most of these
 * assert that we REFUSE to answer when the data can't support one, and that the
 * boundaries (contribution exactly zero, no subscribers, no costs) land on the
 * safe side.
 */
import {describe, it, expect} from 'vitest';
import {monthKey, entryMonth, summariseMonth, breakEven, projectNet} from './breakeven.js';

describe('monthKey', () => {
  it('formats a date as YYYY-MM, zero-padded', () => {
    expect(monthKey(new Date(2026, 0, 15))).toBe('2026-01'); // month is 0-indexed — off-by-one bait
    expect(monthKey(new Date(2026, 11, 1))).toBe('2026-12');
  });
  it('returns null for an unparseable date', () => {
    expect(monthKey('not a date')).toBeNull();
    expect(monthKey(NaN)).toBeNull();
  });
});

describe('entryMonth', () => {
  it('prefers the staff-entered date over when it was recorded', () => {
    // Staff backdating rent to the month it belongs to must win, or the cost
    // lands in the wrong month and both months' break-even are wrong.
    const e = {date: '2026-03-31', createdAt: new Date(2026, 6, 1).getTime()};
    expect(entryMonth(e)).toBe('2026-03');
  });
  it('falls back to createdAt when there is no date', () => {
    expect(entryMonth({createdAt: new Date(2026, 6, 9).getTime()})).toBe('2026-07');
  });
  it('ignores a malformed date string rather than trusting it', () => {
    expect(entryMonth({date: 'March', createdAt: new Date(2026, 6, 9).getTime()})).toBe('2026-07');
  });
  it('returns null when there is nothing to date it by', () => {
    expect(entryMonth({})).toBeNull();
    expect(entryMonth(null)).toBeNull();
  });
});

describe('summariseMonth', () => {
  const M = '2026-07';
  const exp = (amount, behaviour, date = '2026-07-05') => ({type: 'expense', amount, behaviour, date});

  it('splits expenses by behaviour', () => {
    const s = summariseMonth([exp(50000, 'fixed'), exp(3000, 'variable'), exp(80000, 'oneoff')], M);
    expect(s).toMatchObject({fixed: 50000, variable: 3000, oneoff: 80000, unclassified: 0, counted: 3});
  });

  it('counts unclassified expenses SEPARATELY, never as fixed', () => {
    // The whole point: an unclassified cost must not inflate fixed costs, or the
    // break-even target silently rises on money that may not recur.
    const s = summariseMonth([exp(50000, 'fixed'), exp(9000, undefined), exp(1000, 'nonsense')], M);
    expect(s.fixed).toBe(50000);
    expect(s.unclassified).toBe(10000);
    expect(s.unclassifiedCount).toBe(2);
  });

  it('ignores revenue entries — this summarises COSTS', () => {
    const s = summariseMonth([{type: 'revenue', amount: 999999, behaviour: 'fixed', date: '2026-07-01'}], M);
    expect(s).toMatchObject({fixed: 0, counted: 0});
  });

  it('excludes other months', () => {
    const s = summariseMonth([exp(50000, 'fixed', '2026-06-30'), exp(7000, 'fixed', '2026-07-01')], M);
    expect(s.fixed).toBe(7000); // June's rent is not July's rent
  });

  it('handles empty / absent input', () => {
    expect(summariseMonth([], M).counted).toBe(0);
    expect(summariseMonth(undefined, M).counted).toBe(0);
  });

  it('ignores zero and negative amounts rather than letting them subtract', () => {
    const s = summariseMonth([exp(0, 'fixed'), exp(-5000, 'fixed'), exp(100, 'fixed')], M);
    expect(s.fixed).toBe(100);
    expect(s.counted).toBe(1);
  });
});

describe('breakEven', () => {
  it('computes the subscriber count needed, rounding UP', () => {
    // 100k fixed, ARPU 2000, no variable → 50 exactly.
    const be = breakEven({fixedMonthly: 100000, variableMonthly: 0, revenueMonth: 40000, activeSubs: 20});
    expect(be.status).toBe('ok');
    expect(be.arpu).toBe(2000);
    expect(be.contribution).toBe(2000);
    expect(be.breakEvenSubs).toBe(50);
    expect(be.gap).toBe(30);
    expect(be.breakEvenRevenue).toBe(100000);
  });

  it('rounds a fractional break-even UP — you cannot have 0.4 of a merchant', () => {
    // 100k / 3000 = 33.33 → 34. Rounding down would report a target that does
    // NOT actually break even.
    const be = breakEven({fixedMonthly: 100000, variableMonthly: 0, revenueMonth: 30000, activeSubs: 10});
    expect(be.contribution).toBe(3000);
    expect(be.breakEvenSubs).toBe(34);
  });

  it('subtracts variable cost from ARPU to get contribution', () => {
    // ARPU 2000, variable 500/sub → contribution 1500 → 100000/1500 = 66.67 → 67
    const be = breakEven({fixedMonthly: 100000, variableMonthly: 5000, revenueMonth: 20000, activeSubs: 10});
    expect(be.arpu).toBe(2000);
    expect(be.variablePerSub).toBe(500);
    expect(be.contribution).toBe(1500);
    expect(be.breakEvenSubs).toBe(67);
  });

  it('reports a NEGATIVE gap once past break-even', () => {
    const be = breakEven({fixedMonthly: 10000, variableMonthly: 0, revenueMonth: 200000, activeSubs: 100});
    expect(be.breakEvenSubs).toBe(5);
    expect(be.gap).toBe(-95); // 95 merchants clear of break-even
    expect(be.net).toBe(190000);
  });

  it('refuses to divide when there are no subscribers', () => {
    // ARPU would be 0/0 = NaN, and NaN would render as a real-looking blank.
    const be = breakEven({fixedMonthly: 100000, variableMonthly: 0, revenueMonth: 0, activeSubs: 0});
    expect(be.status).toBe('no_subscribers');
    expect(be.arpu).toBeNull();
    expect(be.breakEvenSubs).toBeNull();
  });

  it('calls it UNREACHABLE when variable cost exceeds ARPU', () => {
    // Every extra merchant loses money — no subscriber count breaks even. A
    // naive divide gives a NEGATIVE target, which would render as a goal.
    const be = breakEven({fixedMonthly: 100000, variableMonthly: 30000, revenueMonth: 20000, activeSubs: 10});
    expect(be.contribution).toBe(-1000);
    expect(be.status).toBe('unreachable');
    expect(be.breakEvenSubs).toBeNull();
  });

  it('calls it UNREACHABLE at exactly zero contribution (boundary)', () => {
    // contribution === 0 → fixed/0 = Infinity. `<= 0` not `< 0` is what catches
    // this; a mutation to `< 0` sails through every other case in this file.
    const be = breakEven({fixedMonthly: 100000, variableMonthly: 20000, revenueMonth: 20000, activeSubs: 10});
    expect(be.contribution).toBe(0);
    expect(be.status).toBe('unreachable');
    expect(be.breakEvenSubs).toBeNull();
  });

  it('refuses to report break-even when no fixed costs are recorded', () => {
    // Early in the month this is "not entered yet", not "we have no rent".
    // Reporting 0 would flash as profitable and get believed.
    const be = breakEven({fixedMonthly: 0, variableMonthly: 1000, revenueMonth: 50000, activeSubs: 10});
    expect(be.status).toBe('no_costs');
    expect(be.breakEvenSubs).toBeNull();
    expect(be.contribution).toBe(4900); // still tells you the unit economics
  });

  it('computes net as revenue minus BOTH cost kinds', () => {
    const be = breakEven({fixedMonthly: 50000, variableMonthly: 10000, revenueMonth: 40000, activeSubs: 20});
    expect(be.net).toBe(-20000);
  });

  it('coerces junk input to safe numbers instead of propagating NaN', () => {
    const be = breakEven({fixedMonthly: 'abc', variableMonthly: null, revenueMonth: undefined, activeSubs: 5});
    expect(be.fixed).toBe(0);
    expect(be.revenue).toBe(0);
    expect(Number.isNaN(be.net)).toBe(false);
  });

  it('never returns a negative cost from negative input', () => {
    const be = breakEven({fixedMonthly: -100000, variableMonthly: -5, revenueMonth: 10000, activeSubs: 5});
    expect(be.fixed).toBe(0);
    expect(be.variable).toBe(0);
  });
});

describe('projectNet', () => {
  const be = breakEven({fixedMonthly: 100000, variableMonthly: 0, revenueMonth: 40000, activeSubs: 20});

  it('projects net at a hypothetical subscriber count', () => {
    expect(projectNet(be, 50)).toBe(0);       // exactly break-even
    expect(projectNet(be, 100)).toBe(100000); // 100×2000 − 100000
    expect(projectNet(be, 0)).toBe(-100000);  // just the fixed costs
  });

  it('refuses to project without a real contribution figure', () => {
    const none = breakEven({fixedMonthly: 1000, variableMonthly: 0, revenueMonth: 0, activeSubs: 0});
    expect(projectNet(none, 50)).toBeNull();
    expect(projectNet(null, 50)).toBeNull();
  });

  it('agrees with breakEvenSubs — projecting at the target nets zero or better', () => {
    // Ties the two functions together: if either drifts, this fails.
    const cases = [
      {fixedMonthly: 100000, variableMonthly: 5000, revenueMonth: 20000, activeSubs: 10},
      {fixedMonthly: 37500, variableMonthly: 1234, revenueMonth: 90000, activeSubs: 41},
    ];
    for (const c of cases) {
      const b = breakEven(c);
      expect(projectNet(b, b.breakEvenSubs)).toBeGreaterThanOrEqual(0);
      expect(projectNet(b, b.breakEvenSubs - 1)).toBeLessThan(0);
    }
  });
});
