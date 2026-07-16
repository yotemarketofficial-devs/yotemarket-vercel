/* entitlements.js — SINGLE SOURCE OF TRUTH for what each merchant plan unlocks.
   ────────────────────────────────────────────────────────────────────────────
   ONE feature ladder = software tiers. A "delivery plan" is just a software tier
   with delivery attached (priced by distance band), so it inherits that tier's
   features. Enterprise is the staff-activated top tier (quote-based). Capability rank:

     No plan = 0 · Entry|Starter = 1 · Growth = 2 · Pro = 3 · Enterprise = 4

   There is NO "Free" tier: Entry (rank 1) is the floor. Any free offer or scout
   activation code provisions the Entry software package, so every provisioned
   merchant is at least Entry; rank 0 means no active plan (lapsed / not yet set up).
   Plan name maps straight to rank — delivery Starter = Entry+delivery (rank 1),
   delivery Growth = Growth+delivery (rank 2), delivery Pro = Pro+delivery (rank 3).

   ⇩ EDIT THE MATRIX BELOW to change packaging — it's the ONLY place feature→tier
   lives on the client. A server mirror (firebase/functions ENTITLEMENTS) enforces
   the same map for defense-in-depth; keep the two in sync (like subscription
   pricing already is — see [[subscriptions]]). */

// Plan name → capability rank. Delivery plans share the software names (Starter =
// Entry-equivalent), so one map covers software, delivery AND enterprise.
export const TIER_RANK = { Entry: 1, Starter: 1, Promo: 1, Growth: 2, Pro: 3, Enterprise: 4 };
export const TIER_NAMES = { 0: 'No plan', 1: 'Entry', 2: 'Growth', 3: 'Pro', 4: 'Enterprise' };

// feature key → gate. minTier is the lowest rank that unlocks it.
export const FEATURES = {
  yotefeed:   { label: 'YoteFeed video selling', minTier: 1, icon: 'fa-clapperboard', blurb: 'Post shoppable short videos to win and convert customers.' },
  pos:        { label: 'Point of Sale',          minTier: 2, icon: 'fa-cash-register', blurb: 'Ring up in-store sales on a fast POS terminal.' },
  broadcasts: { label: 'Follower broadcasts',    minTier: 2, icon: 'fa-tower-broadcast', blurb: 'Send shoppable posts and offers to your followers.' },
  team:       { label: 'Team & staff seats',     minTier: 2, icon: 'fa-user-group', blurb: 'Add cashiers and managers with their own secure logins.' },
  insights:   { label: 'YoteMarket Insight',     minTier: 2, icon: 'fa-lightbulb', blurb: 'AI analytics on your sales, pricing and demand.' },
  dealAssist: { label: 'AI Deal Assist',         minTier: 3, icon: 'fa-handshake', blurb: 'In chat, YoteAI shows what a shopper has in their cart from your store and suggests a price to close the sale.' },
  featured:   { label: 'Featured placement',     minTier: 3, icon: 'fa-star', blurb: 'Priority storefront placement across the marketplace.' },
  pickupHub:  { label: 'Pickup-hub eligibility', minTier: 3, icon: 'fa-warehouse', blurb: 'Become a neighbourhood pickup hub and earn on collections.' },
  topBrand:   { label: 'Top-brand placement',    minTier: 4, icon: 'fa-crown', blurb: 'Reserved Top-brand storefront placement — an Enterprise perk.' },
  multiStore: { label: 'Multiple stores',        minTier: 4, icon: 'fa-layer-group', blurb: 'Own and manage several storefronts under one account.' },
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

/** The merchant's capability rank (0–4) from their subscription doc. Plan name maps
 *  straight to rank — a delivery plan is its software tier + delivery, so no floor. */
export function tierRank(sub) {
  if (!sub || sub.status !== 'active') return 0;
  const ms = renewMs(sub);
  if (ms && ms < Date.now()) return 0; // active-but-expired → no plan
  return TIER_RANK[sub.plan] || 0;
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
