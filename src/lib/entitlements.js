/* entitlements.js — SINGLE SOURCE OF TRUTH for what each merchant plan unlocks.
   ────────────────────────────────────────────────────────────────────────────
   The platform sells two plan ladders (see kits/dashboard/pricing.js):
     • delivery plans  — Starter / Growth / Pro, priced by distance band
     • software plans   — Entry / Growth / Pro (SaaS-only, no delivery)
   Both collapse onto ONE capability rank so a feature gate works for either:

     No plan = 0 · Entry|Starter = 1 · Growth = 2 · Pro = 3

   There is NO "Free" tier: Entry (rank 1) is the floor. Any free offer or scout
   activation code provisions the Entry software package, so every provisioned
   merchant is at least Entry; rank 0 means no active plan (lapsed / not yet set up).
   Delivery plans are premium commitments (KSh 1,500–82,000/mo), so ANY active
   delivery plan is floored at Growth (rank 2) — it unlocks the software suite.

   ⇩ EDIT THE MATRIX BELOW to change packaging — it's the ONLY place feature→tier
   lives on the client. A server mirror (firebase/functions ENTITLEMENTS) enforces
   the same map for defense-in-depth; keep the two in sync (like subscription
   pricing already is — see [[subscriptions]]). */

// Plan name → base capability rank.
export const TIER_RANK = { Entry: 1, Starter: 1, Promo: 1, Growth: 2, Pro: 3 };
export const TIER_NAMES = { 0: 'No plan', 1: 'Entry', 2: 'Growth', 3: 'Pro' };

// feature key → gate. minTier is the lowest rank that unlocks it.
export const FEATURES = {
  yotefeed:   { label: 'YoteFeed video selling', minTier: 1, icon: 'fa-clapperboard', blurb: 'Post shoppable short videos to win and convert customers.' },
  pos:        { label: 'Point of Sale',          minTier: 2, icon: 'fa-cash-register', blurb: 'Ring up in-store sales on a fast POS terminal.' },
  broadcasts: { label: 'Follower broadcasts',    minTier: 2, icon: 'fa-tower-broadcast', blurb: 'Send shoppable posts and offers to your followers.' },
  team:       { label: 'Team & staff seats',     minTier: 2, icon: 'fa-user-group', blurb: 'Add cashiers and managers with their own secure logins.' },
  insights:   { label: 'YoteMarket Insight',     minTier: 2, icon: 'fa-lightbulb', blurb: 'AI analytics on your sales, pricing and demand.' },
  featured:   { label: 'Featured placement',     minTier: 3, icon: 'fa-star', blurb: 'Priority storefront placement + Top-brand eligibility.' },
  pickupHub:  { label: 'Pickup-hub eligibility', minTier: 3, icon: 'fa-warehouse', blurb: 'Become a neighbourhood pickup hub and earn on collections.' },
};

// Dashboard screen key → feature it requires (used by the router gate + sidebar lock).
export const SCREEN_FEATURE = { pos: 'pos', insight: 'insights', feed: 'yotefeed', followers: 'broadcasts', team: 'team' };

function renewMs(sub) {
  const r = sub && sub.renewsAt; if (!r) return 0;
  if (typeof r.toMillis === 'function') return r.toMillis();
  if (r.seconds != null) return r.seconds * 1000;
  if (r._seconds != null) return r._seconds * 1000;
  return 0;
}

/** The merchant's capability rank (0–3) from their subscription doc. */
export function tierRank(sub) {
  if (!sub || sub.status !== 'active') return 0;
  const ms = renewMs(sub);
  if (ms && ms < Date.now()) return 0; // active-but-expired → no plan
  const base = TIER_RANK[sub.plan] || 0;
  if (base > 0 && sub.kind === 'delivery') return Math.max(base, 2); // delivery floor = Growth
  return base;
}

export const tierName = (rank) => TIER_NAMES[rank] || 'No plan';

/** Can a subscription (by its data) use `feature`? Unknown features are ungated. */
export function can(sub, feature) {
  const f = FEATURES[feature];
  if (!f) return true;
  return tierRank(sub) >= f.minTier;
}

/** Same check from an already-resolved rank (e.g. the store's denormalized planTier). */
export function canRank(rank, feature) {
  const f = FEATURES[feature];
  if (!f) return true;
  return Number(rank || 0) >= f.minTier;
}

/** Cheapest plan name that unlocks `feature` — for upgrade copy. */
export const requiredTierName = (feature) => TIER_NAMES[FEATURES[feature] ? FEATURES[feature].minTier : 1] || 'Entry';

/** Feature labels a given rank unlocks (for "what you get" lists on the plan page). */
export function planUnlocks(rank) {
  return Object.values(FEATURES).filter((f) => rank >= f.minTier).map((f) => f.label);
}
