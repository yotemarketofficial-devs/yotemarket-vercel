/* subscription-state.js — what a merchant's plan is worth RIGHT NOW.
 *
 * WHY THIS EXISTS: `subscriptions/{uid}.status` is not a live fact. It is a field that a
 * once-a-day sweep (`renewSubscriptions`, 08:00 Africa/Nairobi) rewrites to "expired" when
 * the renewal date has passed. Between the moment a plan lapses and the next morning's
 * sweep, the document still reads `status: "active"` with a renewal date in the past — so
 * a console that prints `status` prints something that stopped being true up to 24 hours
 * ago. That is the staleness: not a caching bug, a clock the data does not carry.
 *
 * The gates already know better. `entitlements.tierRank()` drops an active-but-expired
 * subscription to rank 0, and the server mirror (`subTierRank`) does the same. So the
 * merchant's FEATURES stop at the renewal instant while the staff console still shows them
 * as a paying customer. This module closes that gap by deriving the same answer the gate
 * derives, from the renewal timestamp rather than from the stored label.
 *
 * Pure and dateable — `now` is an argument — because "is this overdue" is exactly the kind
 * of question that is untestable once it reads the wall clock for itself.
 */
import { tierRank, tierName, planUnlocks } from './entitlements.js';

/** Matches the backend's own reminder window, so "due soon" here means the same thing it
 *  means in the push notification the merchant already got. */
export const DUE_SOON_DAYS = 3;
const DAY = 86400000;

/**
 * A renewal date, whatever shape it arrived in → epoch ms, or 0.
 *
 * Firestore timestamps cross the wire as a different shape depending on who serialised
 * them: a callable that returns `_ms(ts)` sends a plain number, an untouched admin-SDK
 * value arrives as `{_seconds}`, the client SDK hands back a Timestamp with `.toMillis()`.
 * Accepting one and silently scoring the rest as "no renewal date" is how an overdue plan
 * reads as healthy, so all of them are handled here in one place.
 */
export function renewalMs(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') { const t = Date.parse(v); return Number.isNaN(t) ? 0 : t; }
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (v.seconds != null) return Number(v.seconds) * 1000;
  if (v._seconds != null) return Number(v._seconds) * 1000;
  return 0;
}

/* The five states a plan can actually be in, in the order a person triages them. `tone`
   is the Pill tone, so the table and the drawer cannot drift apart on colour. */
const STATES = {
  lapsed:    { label: 'Lapsed',    tone: 'red',   rank: 0 },
  due:       { label: 'Due soon',  tone: 'amber', rank: 1 },
  active:    { label: 'Active',    tone: 'ok',    rank: 2 },
  cancelled: { label: 'Cancelled', tone: 'blue',  rank: 3 },
  none:      { label: 'No plan',   tone: 'amber', rank: 4 },
};

/** Sort key — what a person wants at the top of a billing screen: money at risk first. */
export const stateOrder = (key) => (STATES[key] || STATES.none).rank;

/**
 * Derive the live billing state of one subscription row.
 *
 * `sub` is whatever the staff callable returned: at minimum `{ plan, status }`, and — once
 * the backend sends it — `renewsAt`. Without a renewal timestamp this can only repeat what
 * the server said, which is flagged as `dated: true` rather than dressed up as live.
 *
 * Returns { key, label, tone, days, overdue, dueSoon, stale, dated, renewsAt, rank,
 *           tierName, unlocks, serverStatus }.
 *   days     — whole days until renewal; negative once it has passed.
 *   stale    — the stored status still says active but the date has gone by. THE gap this
 *              module exists for: services have already stopped, the label has not caught up.
 *   dated    — no renewal timestamp in the payload, so this is the server's word, not a
 *              derivation. The screen says so instead of implying it checked.
 */
export function billingState(sub, now = Date.now()) {
  const raw = String((sub && (sub.statusRaw || sub.status)) || '').toLowerCase();
  const ms = renewalMs(sub && sub.renewsAt);
  const plan = (sub && sub.plan) || null;

  // The gate's own verdict, asked exactly the way the dashboard asks it. Passing the
  // timestamp through means an active-but-expired plan scores 0 here too.
  const rank = tierRank({ status: raw, plan, renewsAt: ms || null });

  const days = ms ? Math.floor((ms - now) / DAY) : null;
  const expired = Boolean(ms) && ms <= now;

  let key;
  if (raw === 'cancelled' || raw === 'canceled') key = 'cancelled';
  else if (!raw || raw === 'none') key = 'none';
  else if (raw === 'active') key = expired ? 'lapsed' : (days !== null && days <= DUE_SOON_DAYS ? 'due' : 'active');
  else key = 'lapsed'; // expired / overdue / past_due / suspended — all "not paying right now"

  return {
    key,
    label: STATES[key].label,
    tone: STATES[key].tone,
    days,
    overdue: key === 'lapsed',
    dueSoon: key === 'due',
    // Active on paper, past its date in fact — the sweep has not run yet.
    stale: raw === 'active' && expired,
    dated: !ms,
    renewsAt: ms || null,
    rank,
    tierName: tierName(rank),
    // What this plan is buying while it is paid up — and therefore precisely what stops
    // when it is not. Read from the entitlement matrix, never re-listed by hand here.
    unlocks: planUnlocks(tierTargetRank(sub, rank)),
    serverStatus: raw || null,
  };
}

/* What the plan WOULD unlock if it were paid up. For a live plan that is its own rank; for
   a lapsed one the rank is 0, and listing "nothing" would answer a question nobody asked —
   what matters is what they have just lost. */
function tierTargetRank(sub, liveRank) {
  if (liveRank > 0) return liveRank;
  return tierRank({ status: 'active', plan: sub && sub.plan });
}

/** Whole days, phrased for a person. `null` days → no date to phrase. */
export function renewalPhrase(st) {
  if (!st || st.days === null) return null;
  const d = st.days;
  if (d === 0) return 'renews today';
  if (d > 0) return `renews in ${d} day${d === 1 ? '' : 's'}`;
  const n = Math.abs(d);
  return `overdue by ${n} day${n === 1 ? '' : 's'}`;
}

/**
 * Roll a page of subscriptions up into the figures a billing screen leads with.
 *
 * MRR counts only plans that are actually live — a lapsed plan is not recurring revenue,
 * and counting it is how a revenue figure keeps climbing through a month of churn.
 */
export function billingTotals(rows, now = Date.now()) {
  const t = { mrr: 0, atRisk: 0, active: 0, due: 0, lapsed: 0, cancelled: 0, none: 0, stale: 0, total: 0 };
  (rows || []).forEach((r) => {
    const st = r.state || billingState(r, now);
    const amount = Number(r.amount) || 0;
    t.total += 1;
    t[st.key] = (t[st.key] || 0) + 1;
    if (st.key === 'active' || st.key === 'due') t.mrr += amount;
    if (st.key === 'due' || st.key === 'lapsed') t.atRisk += amount;
    if (st.stale) t.stale += 1;
  });
  return t;
}
