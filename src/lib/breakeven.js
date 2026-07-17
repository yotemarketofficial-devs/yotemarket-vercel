/**
 * breakeven.js — the break-even arithmetic for the staff Finance console.
 *
 * Pure functions over plain data: no Firestore, no React. That split is the same
 * one stock.js makes, and for the same reason — this decides whether the company
 * believes it is profitable, so it has to be testable directly and hard.
 *
 * ── What this is allowed to claim ──────────────────────────────────────────
 * Every number here comes from something real: classified ledger entries and
 * live settled subscription payments. Where the data can't support a claim, the
 * answer is a STATUS, not a number. We do not infer a cost that wasn't recorded,
 * and we do not average a shape the ledger doesn't have. A confident wrong
 * break-even is worse than "not enough data" — someone would spend against it.
 *
 * ── The model ─────────────────────────────────────────────────────────────
 * YoteMarket's platform revenue is subscription-only (merchants keep order value
 * via escrow/release), so a "unit" here is one paying merchant, and:
 *
 *   ARPU          = subscription revenue this month / active subscribers
 *   contribution  = ARPU − variable cost per subscriber
 *   break-even    = fixed monthly costs / contribution      (subscribers needed)
 *
 * ── Why a single month ────────────────────────────────────────────────────
 * The ledger is a transaction log, not a run rate. Summing every `fixed` entry
 * ever recorded would count twelve months of rent as this month's rent. So we
 * scope to ONE month — which is also the only window the live revenue figure
 * covers (listFinanceEntries computes subscriptionRevenueMonth for the current
 * month only). An entry with no explicit date falls back to when it was recorded.
 */

/** Expense cost behaviour. Anything else (including absent) is UNCLASSIFIED and
 *  is deliberately excluded from the maths — see unclassified in breakEven(). */
export const BEHAVIOURS = ['fixed', 'variable', 'oneoff'];

export const BEHAVIOUR_LABEL = {
  fixed: 'Fixed / monthly',
  variable: 'Variable per merchant',
  oneoff: 'One-off',
};

/** YYYY-MM for a Date or ms timestamp. */
export function monthKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Which month does an entry belong to? The staff-entered `date` wins (it's what
 * they mean); otherwise fall back to when the entry was recorded, which is at
 * least a real fact about the entry rather than a guess about the cost.
 */
export function entryMonth(e) {
  if (e && typeof e.date === 'string' && /^\d{4}-\d{2}/.test(e.date)) return e.date.slice(0, 7);
  if (e && e.createdAt) return monthKey(e.createdAt);
  return null;
}

/**
 * Split one month's expenses by cost behaviour.
 *
 * `unclassified` is the load-bearing part: entries recorded before classification
 * existed (or skipped since) are NOT silently folded into fixed costs, because
 * that would inflate the break-even point with money that may not recur. They're
 * counted separately so the console can say the number is incomplete.
 */
export function summariseMonth(entries, month) {
  const out = {fixed: 0, variable: 0, oneoff: 0, unclassified: 0, counted: 0, unclassifiedCount: 0};
  for (const e of Array.isArray(entries) ? entries : []) {
    if (!e || e.type !== 'expense') continue;
    if (entryMonth(e) !== month) continue;
    const amt = Math.max(0, Math.round(Number(e.amount) || 0));
    if (!amt) continue;
    out.counted += 1;
    if (BEHAVIOURS.includes(e.behaviour)) out[e.behaviour] += amt;
    else { out.unclassified += amt; out.unclassifiedCount += 1; }
  }
  return out;
}

/**
 * The break-even point, or an honest reason there isn't one.
 *
 * Statuses, in the order they're checked — each is a case where a number would
 * be a lie:
 *   no_subscribers — nothing to average; ARPU is undefined, not zero.
 *   unreachable    — contribution ≤ 0: every extra merchant loses money, so NO
 *                    subscriber count breaks even. Dividing here would hand back
 *                    a negative or Infinity and render as a target to chase.
 *   no_costs       — no fixed costs recorded for this month. Early in a month
 *                    that's usually "not entered yet", not "we have no rent" —
 *                    so we refuse to report break-even rather than flash a
 *                    profitable-looking zero.
 *   ok             — the maths holds.
 */
export function breakEven({fixedMonthly, variableMonthly, revenueMonth, activeSubs}) {
  const fixed = Math.max(0, Math.round(Number(fixedMonthly) || 0));
  const variable = Math.max(0, Math.round(Number(variableMonthly) || 0));
  const revenue = Math.max(0, Math.round(Number(revenueMonth) || 0));
  const subs = Math.max(0, Math.floor(Number(activeSubs) || 0));

  const net = revenue - fixed - variable;
  const base = {fixed, variable, revenue, subs, net};

  if (subs === 0) return {...base, status: 'no_subscribers', arpu: null, variablePerSub: null, contribution: null, breakEvenSubs: null, gap: null, breakEvenRevenue: null};

  const arpu = revenue / subs;
  const variablePerSub = variable / subs;
  const contribution = arpu - variablePerSub;

  if (contribution <= 0) {
    return {...base, status: 'unreachable', arpu, variablePerSub, contribution, breakEvenSubs: null, gap: null, breakEvenRevenue: null};
  }
  if (fixed === 0) {
    return {...base, status: 'no_costs', arpu, variablePerSub, contribution, breakEvenSubs: null, gap: null, breakEvenRevenue: null};
  }

  const breakEvenSubs = Math.ceil(fixed / contribution);
  return {
    ...base,
    status: 'ok',
    arpu,
    variablePerSub,
    contribution,
    breakEvenSubs,
    gap: breakEvenSubs - subs,          // negative = past break-even, by that many merchants
    breakEvenRevenue: Math.round(breakEvenSubs * arpu),
  };
}

/**
 * Projected monthly net at a hypothetical subscriber count, holding today's
 * measured ARPU and per-merchant variable cost. Only meaningful once breakEven()
 * returned 'ok' or 'unreachable' (i.e. we have a real contribution figure) —
 * returns null otherwise rather than inventing a curve.
 */
export function projectNet(be, subs) {
  if (!be || be.contribution == null) return null;
  const n = Math.max(0, Math.floor(Number(subs) || 0));
  return Math.round(n * be.contribution - be.fixed);
}
