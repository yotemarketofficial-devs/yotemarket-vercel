/* Unit tests for the plan-gating matrix.
 *
 * This decides what a merchant has paid for, so a wrong answer either gives away
 * premium features or locks a paying merchant out of their own store. The server
 * mirrors this map in functions/index.js (ENT_FEATURE_MIN) — if you change a
 * minTier here, change it there too.
 */
import { describe, it, expect } from 'vitest';
import {
  TIER_RANK, FEATURES, SCREEN_FEATURE,
  tierRank, tierName, can, canRank, requiredTierName, planUnlocks,
} from './entitlements.js';

const active = (plan, renewsAt) => ({ status: 'active', plan, ...(renewsAt ? { renewsAt } : {}) });
const inMs = (ms) => ({ toMillis: () => ms });

describe('tierRank — what a subscription doc is worth', () => {
  it('maps each plan name straight to its rank', () => {
    expect(tierRank(active('Entry'))).toBe(1);
    expect(tierRank(active('Growth'))).toBe(2);
    expect(tierRank(active('Pro'))).toBe(3);
    expect(tierRank(active('Enterprise'))).toBe(4);
  });

  it('treats a delivery plan as its software tier (Starter = Entry)', () => {
    expect(tierRank(active('Starter'))).toBe(TIER_RANK.Entry);
  });

  it('gives no plan at all a rank of 0', () => {
    expect(tierRank(null)).toBe(0);
    expect(tierRank(undefined)).toBe(0);
    expect(tierRank({})).toBe(0);
  });

  it('ignores a subscription that is not active', () => {
    expect(tierRank({ status: 'cancelled', plan: 'Pro' })).toBe(0);
    expect(tierRank({ status: 'past_due', plan: 'Pro' })).toBe(0);
  });

  it('ignores an active-but-expired subscription', () => {
    // The renewal date has passed — active is stale, so they get nothing.
    expect(tierRank(active('Pro', inMs(Date.now() - 86400000)))).toBe(0);
  });

  it('honours an active subscription that has not expired', () => {
    expect(tierRank(active('Pro', inMs(Date.now() + 86400000)))).toBe(3);
  });

  it('gives an unrecognised plan name nothing rather than guessing', () => {
    expect(tierRank(active('Platinum'))).toBe(0);
  });
});

describe('can — feature gates', () => {
  it('locks Insight below Growth', () => {
    expect(can(active('Entry'), 'insights')).toBe(false);
    expect(can(active('Growth'), 'insights')).toBe(true);
    expect(can(active('Pro'), 'insights')).toBe(true);
  });

  it('locks Deal Assist to Pro and above', () => {
    expect(can(active('Growth'), 'dealAssist')).toBe(false);
    expect(can(active('Pro'), 'dealAssist')).toBe(true);
    expect(can(active('Enterprise'), 'dealAssist')).toBe(true);
  });

  it('reserves Top-brand placement for Enterprise', () => {
    expect(can(active('Pro'), 'topBrand')).toBe(false);
    expect(can(active('Enterprise'), 'topBrand')).toBe(true);
  });

  it('gives an unplanned merchant nothing', () => {
    for (const f of Object.keys(FEATURES)) expect(can(null, f)).toBe(false);
  });

  it('leaves unknown features ungated rather than accidentally locking the app', () => {
    expect(can(null, 'somethingNotInTheMatrix')).toBe(true);
  });
});

describe('canRank — the same check from a denormalized store tier', () => {
  it('agrees with can() for every feature at every rank', () => {
    const plans = [[0, null], [1, 'Entry'], [2, 'Growth'], [3, 'Pro'], [4, 'Enterprise']];
    for (const f of Object.keys(FEATURES)) {
      for (const [rank, plan] of plans) {
        expect(canRank(rank, f)).toBe(can(plan ? active(plan) : null, f));
      }
    }
  });

  it('treats a missing rank as no plan', () => {
    expect(canRank(undefined, 'pos')).toBe(false);
    expect(canRank(null, 'pos')).toBe(false);
  });
});

describe('the matrix stays coherent', () => {
  it('gates every screen on a feature that exists', () => {
    for (const feature of Object.values(SCREEN_FEATURE)) {
      expect(FEATURES[feature], `SCREEN_FEATURE -> ${feature}`).toBeDefined();
    }
  });

  it('names the cheapest plan that unlocks a feature', () => {
    expect(requiredTierName('insights')).toBe('Growth');
    expect(requiredTierName('dealAssist')).toBe('Pro');
    expect(requiredTierName('topBrand')).toBe('Enterprise');
  });

  it('unlocks more as the rank climbs, never less', () => {
    const counts = [0, 1, 2, 3, 4].map((r) => planUnlocks(r).length);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    expect(planUnlocks(4).length).toBe(Object.keys(FEATURES).length); // Enterprise gets everything
    expect(planUnlocks(0)).toEqual([]);
  });

  it('has a sane minTier on every feature', () => {
    for (const [key, f] of Object.entries(FEATURES)) {
      expect(f.minTier, key).toBeGreaterThanOrEqual(1);
      expect(f.minTier, key).toBeLessThanOrEqual(4);
      expect(f.label, key).toBeTruthy();
    }
  });

  it('reports tier names, and something sane for a bad rank', () => {
    expect(tierName(3)).toBe('Pro');
    expect(tierName(0)).toBe('No plan');
    expect(tierName(99)).toBe('No plan');
  });
});
