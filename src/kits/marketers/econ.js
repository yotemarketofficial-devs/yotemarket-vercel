/* econ.js — Marketer referral payout logic (scout-facing). Mirrors production so the
   math the scout sees equals what they're paid. No platform margins or rider coefficients. */

export const MK_CONFIG = {
  qualifyThreshold: 10,    // first N verified merchants = qualification stage
  qualifyBonus: 300,       // flat KSH at qualification
  checkpoints: [30, 60, 90], // measured in BONUS merchants (beyond first N)
  highRate: 20,            // KSH/merchant once a checkpoint is reached
  lowRate: 10,             // KSH/merchant below the next checkpoint
  minWithdrawal: 500,      // KSH minimum balance to withdraw
};

export function calcEarnings(merchants, cfg = MK_CONFIG) {
  const { qualifyThreshold, qualifyBonus, checkpoints, highRate, lowRate, minWithdrawal } = cfg;
  if (merchants < qualifyThreshold) {
    return { qualified:false, qualifyPay:0, bonusMerchants:0, highRateCount:0,
      lowRateCount:0, bonusPay:0, total:0, withdrawable:false, toQualify:qualifyThreshold - merchants };
  }
  const bonusMerchants = merchants - qualifyThreshold;
  let cp = 0;
  for (const c of checkpoints) if (bonusMerchants >= c) cp = c;
  const highRateCount = cp;
  const lowRateCount = bonusMerchants - cp;
  const bonusPay = highRateCount * highRate + lowRateCount * lowRate;
  const total = qualifyBonus + bonusPay;
  return { qualified:true, qualifyPay:qualifyBonus, bonusMerchants, highRateCount,
    lowRateCount, bonusPay, total, withdrawable: total >= minWithdrawal, toQualify:0 };
}

export function merchantsToWithdrawal(merchants, cfg = MK_CONFIG) {
  if (calcEarnings(merchants, cfg).withdrawable) return 0;
  for (let m = merchants + 1; m <= merchants + 300; m++)
    if (calcEarnings(m, cfg).withdrawable) return m - merchants;
  return null;
}

export function nextCheckpoint(merchants, cfg = MK_CONFIG) {
  const { qualifyThreshold, checkpoints } = cfg;
  for (const c of checkpoints) {
    const totalMerchantsAt = c + qualifyThreshold;
    if (merchants < totalMerchantsAt) {
      const cur = calcEarnings(merchants, cfg).total;
      const at = calcEarnings(totalMerchantsAt, cfg).total;
      return { checkpointBonusCount:c, totalMerchantsAt, need: totalMerchantsAt - merchants,
        gain: at - cur, newTotal: at };
    }
  }
  return null;
}

// A scout works in cycles: at MK_BATCH_SIZE activated merchants the batch
// completes (full checkpoint payout) and the count restarts. Lifetime "total
// referred" still keeps growing — only the activation cycle resets.
export const MK_BATCH_SIZE = 100;
export function calcBatchedEarnings(merchants, cfg = MK_CONFIG) {
  const full = Math.floor(merchants / MK_BATCH_SIZE);
  const rem = merchants % MK_BATCH_SIZE;
  return full * calcEarnings(MK_BATCH_SIZE, cfg).total + calcEarnings(rem, cfg).total;
}
export function cycleInfo(merchants) {
  return { batches: Math.floor(merchants / MK_BATCH_SIZE), inCycle: merchants % MK_BATCH_SIZE, batchSize: MK_BATCH_SIZE };
}

export const ksh = (n) => 'KSH ' + Math.round(n).toLocaleString('en-KE');
// a merchant is verified once they follow >=3 socials AND list >=2 items
export const isVerified = (m) => (m.socials >= 3 && m.items >= 2);
