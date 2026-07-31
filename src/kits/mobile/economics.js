// economics.js — YoteMarket pricing & unit-economics SINGLE SOURCE OF TRUTH
// Transcribed from "Internal Pricing & Unit Economics v2". All money in KSh.
// Shared by the staff console and the mobile kit so the model stays consistent.

/* ---- Locked business rules ----
 * Riders/vans/trucks = zero-hour contractors; platform pays only per-run payouts.
 * Distance charging rule:  Paid Km = (upper bound of distance tier) − 2.
 */
export function ymPaidKm(upperBoundKm) { return Math.max(0, upperBoundKm - 2); }

/* ---- Weight (locked 2026-07-24) ----
 * The billing unit is a DELIVERY, not a parcel: 1 delivery = ≤10 kg AND ≤3 parcels, and
 * WEIGHT IS SUPREME — it outranks parcel count and everything else (2 parcels at 10 kg is
 * 20 kg, so it splits at two, never three). The 15→10 kg change was made precisely because
 * it makes the per-run maxima fall out of merchantsPerRun (5/10/20 × 10 kg = 50/100/200 kg),
 * so no separately-invented vehicle capacity number is needed.
 * Weight decides WHICH deliveries join a run, never HOW MANY — a too-heavy candidate is
 * skipped in favour of a lighter one, never a reason to dispatch a run under-filled. */
export const YM_WEIGHT = {
  perDeliveryKg: 10,      // hard cap on one delivery unit — supreme over parcel count
  parcelsPerDelivery: 3,  // ceiling heavy goods never reach
};
/** Implied per-run weight ceiling for a band = deliveries per run × the 10 kg unit cap. */
export function ymRunWeightKg(bandKey) {
  const b = YM_ECON.bands[bandKey];
  return b ? b.merchantsPerRun * YM_WEIGHT.perDeliveryKg : 0;
}
/** How many delivery UNITS a consignment of `kg` occupies (weight supreme, min 1). */
export function ymDeliveryUnits(kg) {
  return Math.max(1, Math.ceil((Number(kg) || 0) / YM_WEIGHT.perDeliveryKg));
}

export const YM_ECON = {
  // Batching by band: how many merchants (drops) aggregate into one batched run.
  bands: {
    A: {
      key: 'A', label: 'Urban', vehicle: 'Motorbike', merchantsPerRun: 5,
      pay: { base: 70, perKm: 25, multiDrop: 15 }, // multi-drop = 15 × (merchants − 1)
      subTiers: [
        { id: 'a05',   range: '0–5 km',   ub: 5,  plans: { Starter: { d: 10, p: 1500 }, Growth: { d: 20, p: 3000 }, Pro: { d: 30, p: 4200 } } },
        { id: 'a515',  range: '5–15 km',  ub: 15, plans: { Starter: { d: 10, p: 2000 }, Growth: { d: 20, p: 3500 }, Pro: { d: 30, p: 5000 } } },
        { id: 'a1530', range: '15–30 km', ub: 30, plans: { Starter: { d: 10, p: 3500 }, Growth: { d: 20, p: 6000 }, Pro: { d: 30, p: 9000 } } },
      ],
    },
    B: {
      key: 'B', label: 'Regional', vehicle: 'Van / Probox', merchantsPerRun: 10,
      pay: { base: 150, perKm: 25, multiDrop: 30 },
      subTiers: [
        { id: 'b3040', range: '30–40 km', ub: 40, plans: { Starter: { d: 10, p: 6500 },  Growth: { d: 20, p: 11000 }, Pro: { d: 30, p: 16000 } } },
        { id: 'b4050', range: '40–50 km', ub: 50, plans: { Starter: { d: 10, p: 9000 },  Growth: { d: 20, p: 16000 }, Pro: { d: 30, p: 23500 } } },
        { id: 'b5060', range: '50–60 km', ub: 60, plans: { Starter: { d: 10, p: 12000 }, Growth: { d: 20, p: 22000 }, Pro: { d: 30, p: 32000 } } },
      ],
    },
    C: {
      key: 'C', label: 'Long Haul', vehicle: 'Lorry / Pickup', merchantsPerRun: 20,
      pay: { base: 300, perKm: 25, multiDrop: 60 },
      subTiers: [
        { id: 'c6070', range: '60–70 km', ub: 70, plans: { Starter: { d: 10, p: 20000 }, Growth: { d: 20, p: 36000 }, Pro: { d: 30, p: 52000 } } },
        { id: 'c7080', range: '70–80 km', ub: 80, plans: { Starter: { d: 10, p: 24000 }, Growth: { d: 20, p: 47000 }, Pro: { d: 30, p: 70000 } } },
        { id: 'c8090', range: '80–90 km', ub: 90, plans: { Starter: { d: 10, p: 28000 }, Growth: { d: 20, p: 55000 }, Pro: { d: 30, p: 82000 } } },
      ],
    },
  },

  // Rider badge — a MONTHLY per-rider qualification subscription (NOT one-time);
  // ring-fenced to fund goods-in-transit insurance, NOT platform revenue. The tier
  // qualifies the rider for the jobs they receive (by distance, vehicle class, goods
  // value & rating); no rider receives jobs without an active badge.
  badges: { Starter: 200, Growth: 500, Pro: 700 },

  // Non-delivery (software-only) monthly tiers — no delivery runs included.
  software: {
    Entry:  { fee: 500,  desc: 'Basic platform access, no delivery features' },
    Growth: { fee: 700,  desc: 'Enhanced software tools, no delivery features' },
    Pro:    { fee: 1000, desc: 'Full software suite, no delivery features' },
  },

  planOrder: ['Starter', 'Growth', 'Pro'],
};

/* Per-run rider payout for a batched run in a given band. */
export function ymRunPayout(bandKey, paidKm, drops) {
  const b = YM_ECON.bands[bandKey];
  const n = drops == null ? b.merchantsPerRun : drops;
  const base = b.pay.base;
  const multi = b.pay.multiDrop * Math.max(0, n - 1);
  const distance = paidKm * b.pay.perKm;
  return {
    base, multi, distance, drops: n,
    total: base + multi + distance,
    breakdown: [
      ['Base', base],
      ['Multi-drop ×' + Math.max(0, n - 1), multi],
      ['Distance · ' + paidKm + ' km', distance],
    ],
  };
}

/* Look up a subscription plan { d, p } and its sub-tier within a band. */
export function ymSubTier(bandKey, subTierId) {
  return (YM_ECON.bands[bandKey].subTiers || []).find(s => s.id === subTierId);
}
export function ymPlanPrice(bandKey, subTierId, plan) {
  const st = ymSubTier(bandKey, subTierId);
  return st ? st.plans[plan] : null;
}

/* Unit economics for one batched run GROUP over a month. */
export function ymRunEconomics(bandKey, subTierId, plan = 'Starter') {
  const b = YM_ECON.bands[bandKey];
  const st = ymSubTier(bandKey, subTierId);
  const pl = st.plans[plan];
  const paidKm = ymPaidKm(st.ub);
  const costPerRun = ymRunPayout(bandKey, paidKm).total; // full run (all merchants)
  const runsPerMonth = pl.d;                              // deliveries per merchant
  const revenue = pl.p * b.merchantsPerRun;
  const cost = costPerRun * runsPerMonth;
  return {
    revenue, cost, margin: revenue - cost,
    marginPct: Math.round(((revenue - cost) / revenue) * 100),
    paidKm, costPerRun, runsPerMonth,
  };
}

/* ── Shopper-paid single delivery ────────────────────────────────────────────
 * When a merchant's plan doesn't cover a delivery (no plan, allotment spent, or the
 * point is outside their paid reach), the shopper buys that ONE delivery. Its price
 * comes from the same locked table: each band's subscription price ÷ the deliveries it
 * bundles = the cost of one delivery at that distance. Starter is used deliberately —
 * a one-off buyer doesn't get a volume plan's rate.
 *
 * The server (firebase/functions/index.js singleDeliveryFee) is authoritative; this is
 * the shared copy so the staff console shows exactly what shoppers are charged. */

/** Locked ladder: [{ km: band ceiling, price: cost of ONE delivery at that ceiling }]. */
export function ymDeliveryLadder() {
  const out = [];
  for (const bandKey of Object.keys(YM_ECON.bands)) {
    for (const t of YM_ECON.bands[bandKey].subTiers || []) {
      out.push({ band: bandKey, id: t.id, range: t.range, km: t.ub, price: t.plans.Starter.p / t.plans.Starter.d });
    }
  }
  return out.sort((a, b) => a.km - b.km);
}

/** Marginal KSh/km inside each band — the rate actually charged across those km. */
export function ymDeliveryPerKm() {
  let prevKm = 0, prevPrice = 0;
  return ymDeliveryLadder().map((s) => {
    const perKm = (s.price - prevPrice) / (s.km - prevKm);
    const row = { ...s, fromKm: prevKm, perKm };
    prevKm = s.km; prevPrice = s.price;
    return row;
  });
}

/** What a shopper pays for a single delivery of `km`, PRORATED by actual distance.
 *  Charges each band's marginal rate only across the km inside it, so the price is
 *  smooth and monotonic and lands exactly on the locked price at every band ceiling. */
export function ymSingleDeliveryFee(km) {
  const d = Math.max(0, Number(km) || 0);
  const ladder = ymDeliveryLadder();
  if (!ladder.length) return 0;
  let prevKm = 0, prevPrice = 0, fee = 0;
  for (const step of ladder) {
    const rate = (step.price - prevPrice) / (step.km - prevKm);
    if (d <= step.km) return Math.max(1, Math.round(prevPrice + (d - prevKm) * rate));
    fee = step.price; prevKm = step.km; prevPrice = step.price;
  }
  const last = ladder[ladder.length - 1];
  const prev = ladder.length > 1 ? ladder[ladder.length - 2] : { km: 0, price: 0 };
  const tail = (last.price - prev.price) / (last.km - prev.km);
  return Math.max(1, Math.round(fee + (d - last.km) * tail));
}

/** Step-by-step working for a shopper-paid delivery of `km` — one row per band the
 *  trip passes through, so the arithmetic can be shown rather than asserted.
 *  Returns { rows:[{from,to,km,perKm,amount,range,band}], total }. */
export function ymDeliveryFeeBreakdown(km) {
  const d = Math.max(0, Number(km) || 0);
  const ladder = ymDeliveryLadder();
  const rows = [];
  let prevKm = 0, prevPrice = 0, total = 0;
  for (const step of ladder) {
    const perKm = (step.price - prevPrice) / (step.km - prevKm);
    const to = Math.min(d, step.km);
    if (to > prevKm) {
      const span = to - prevKm;
      const amount = span * perKm;
      total += amount;
      rows.push({ band: step.band, range: step.range, from: prevKm, to, km: span, perKm, amount });
    }
    prevKm = step.km; prevPrice = step.price;
    if (d <= step.km) break;
  }
  if (d > prevKm) { // past the longest band — final marginal rate continues
    const last = ladder[ladder.length - 1], prev = ladder[ladder.length - 2] || { km: 0, price: 0 };
    const perKm = (last.price - prev.price) / (last.km - prev.km);
    const span = d - prevKm, amount = span * perKm;
    total += amount;
    rows.push({ band: last.band, range: 'beyond ' + last.km + ' km', from: prevKm, to: d, km: span, perKm, amount, tail: true });
  }
  return { rows, total: Math.max(1, Math.round(total)) };
}

/* ── Enterprise — the premium tier (mirrors firebase/functions/index.js) ──────────
 * Quote-based & staff-activated (no self-serve STK price): everything in Pro + a high
 * monthly delivery allotment + "Top brand" placement. The quote is GROUNDED in the
 * standard tiers — each distance sub-tier's marginal package rate (its Pro plan, price ÷
 * deliveries) × volume, less any negotiated discount. Kept here so economics.js stays the
 * single source of truth; the server copy stays authoritative. */
export const ENTERPRISE = { deliveriesCap: 150, months: 1 };

/* Find a delivery sub-tier by id across all bands; returns it tagged with its band. */
export function ymSubTierAny(subTierId) {
  for (const bandKey of Object.keys(YM_ECON.bands)) {
    const st = (YM_ECON.bands[bandKey].subTiers || []).find((s) => s.id === subTierId);
    if (st) return { ...st, band: bandKey };
  }
  return null;
}

/* Enterprise per-package + per-package-per-km rate card — one row per delivery sub-tier. */
export function ymEnterpriseRateCard() {
  const rows = [];
  for (const bandKey of Object.keys(YM_ECON.bands)) {
    for (const t of YM_ECON.bands[bandKey].subTiers || []) {
      const perPackage = t.plans.Pro.p / t.plans.Pro.d; // marginal (highest-volume) rate
      rows.push({
        subTier: t.id, band: bandKey, range: t.range, km: t.ub,
        perPackage: Math.round(perPackage),
        perPackagePerKm: Math.round((perPackage / t.ub) * 100) / 100,
      });
    }
  }
  return rows;
}

/* Derive an Enterprise monthly quote from the unit economics + volume + discount. */
export function ymEnterpriseQuote({ subTier, packages, discountPct = 0 } = {}) {
  const t = ymSubTierAny(subTier);
  if (!t) return null;
  const pkgs = Math.max(1, Math.round(Number(packages) || ENTERPRISE.deliveriesCap));
  const perPackage = t.plans.Pro.p / t.plans.Pro.d;
  const disc = Math.min(90, Math.max(0, Number(discountPct) || 0));
  const gross = perPackage * pkgs;
  const monthly = Math.round(gross * (1 - disc / 100));
  return {
    subTier, band: t.band, range: t.range, km: t.ub, packages: pkgs,
    perPackage: Math.round(perPackage),
    perPackagePerKm: Math.round((perPackage / t.ub) * 100) / 100,
    gross: Math.round(gross), discountPct: disc, monthly, deliveriesCap: pkgs,
  };
}
