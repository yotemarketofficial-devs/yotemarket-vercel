/* breakeven.jsx — Staff console · Finance › Break-even analysis (CONFIDENTIAL).
 *
 * Answers one question: how many paying merchants does YoteMarket need to cover
 * its costs? Platform revenue is subscription-only (merchants keep order value
 * via escrow/release), so the unit is a paying merchant and the lever is ARPU
 * minus what each merchant costs us.
 *
 * Everything here is measured, not modelled: live settled subscription payments
 * and classified ledger entries. Where the ledger can't support a claim, this
 * says so instead of printing a number — see the status banners. That's the same
 * rule as the rest of the live console: no fabricated data, ever.
 *
 * The arithmetic lives in lib/breakeven.js (pure + unit/mutation-tested); this
 * file only renders it.
 */
import React from 'react';
import { Card, SectionHead, Stat, Icon, Btn, kes } from './ui.jsx';
import { summariseMonth, breakEven, projectNet, monthKey, BEHAVIOUR_LABEL } from '../../lib/breakeven.js';
const { useState, useMemo } = React;

const pct = (n) => `${n >= 0 ? '' : '−'}${Math.abs(Math.round(n))}%`;
const MONTH_LABEL = (k) => {
  if (!k) return '';
  const [y, m] = k.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
};

/* The status banner is the honest core of this screen: three of the four states
   are refusals to give a number, each with the specific thing to go fix. */
function StatusBanner({ be, month, unclassified, unclassifiedCount }) {
  const box = (tone, icon, title, body) => (
    <div className="rounded-xl p-4 flex gap-3" style={{ background: `var(--${tone}-bg)` }}>
      <Icon name={icon} style={{ color: `var(--${tone})` }} className="mt-0.5 flex-shrink-0" />
      <div>
        <div className="font-bold text-sm t1">{title}</div>
        <div className="text-sm t2 mt-0.5">{body}</div>
      </div>
    </div>
  );
  if (be.status === 'no_subscribers') {
    return box('amber', 'circle-question', 'No active subscriptions to measure',
      'Break-even is revenue per paying merchant — with none live there is nothing to average. This will fill in as merchants subscribe.');
  }
  if (be.status === 'unreachable') {
    return box('red', 'triangle-exclamation', 'Break-even is unreachable at these unit economics',
      `Each merchant brings ${kes(be.arpu)} but costs ${kes(be.variablePerSub)} to serve — a contribution of ${kes(be.contribution)}. No number of merchants covers the fixed costs; the price or the per-merchant cost has to change first.`);
  }
  if (be.status === 'no_costs') {
    return box('amber', 'circle-info', `No fixed costs recorded for ${MONTH_LABEL(month)}`,
      'Without rent, payroll and infrastructure in the ledger this would read as profitable. Record this month\'s fixed costs (or classify the entries below) for a real break-even point.');
  }
  if (unclassified > 0) {
    return box('amber', 'circle-exclamation', `${kes(unclassified)} of costs are unclassified`,
      `${unclassifiedCount} expense${unclassifiedCount === 1 ? '' : 's'} this month have no cost behaviour set, so they're excluded from the maths below. The real break-even point is higher than shown until they're classified.`);
  }
  return null;
}

/* Progress toward break-even. Deliberately shows the shortfall in MERCHANTS —
   the number the team can actually act on — not just a currency gap. */
function Gauge({ be }) {
  if (be.status !== 'ok') return null;
  const past = be.gap <= 0;
  const progress = Math.min(100, (be.subs / be.breakEvenSubs) * 100);
  return (
    <Card className="p-6">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
        <h3 className="font-bold t1">Progress to break-even</h3>
        <span className="text-sm font-semibold" style={{ color: past ? 'var(--green)' : 'var(--amber)' }}>
          {past ? `${Math.abs(be.gap)} merchant${Math.abs(be.gap) === 1 ? '' : 's'} clear` : `${be.gap} more merchant${be.gap === 1 ? '' : 's'} needed`}
        </span>
      </div>
      <div className="text-sm t3 mb-4">
        {be.subs} of {be.breakEvenSubs} paying merchants · {kes(be.revenue)} of {kes(be.breakEvenRevenue)} monthly
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: past ? 'var(--green)' : 'var(--pri)' }} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5" style={{ borderTop: '1px solid var(--line)' }}>
        <Fig label="ARPU" value={kes(be.arpu)} sub="per merchant / month" />
        <Fig label="Variable cost" value={kes(be.variablePerSub)} sub="per merchant / month" />
        <Fig label="Contribution" value={kes(be.contribution)} sub="each merchant adds" tone="var(--green)" />
        <Fig label="Fixed costs" value={kes(be.fixed)} sub="per month" tone="var(--red)" />
      </div>
    </Card>
  );
}
function Fig({ label, value, sub, tone }) {
  return (
    <div>
      <div className="text-xs font-semibold t3 uppercase tracking-wide">{label}</div>
      <div className="text-lg font-bold num" style={{ color: tone || 'var(--t1)' }}>{value}</div>
      <div className="text-xs t3">{sub}</div>
    </div>
  );
}

/* What-if: holds today's MEASURED contribution and fixed costs and asks what net
   looks like at another merchant count. It extrapolates real numbers rather than
   inventing a curve — and refuses entirely when there's no contribution figure. */
function Scenario({ be }) {
  const start = be.status === 'ok' ? be.breakEvenSubs : be.subs;
  const [n, setN] = useState(Math.max(1, start));
  if (be.contribution == null) return null;
  const max = Math.max(50, Math.ceil(start * 3));
  const net = projectNet(be, n);
  const delta = net - be.net;
  return (
    <Card className="p-6">
      <h3 className="font-bold t1 mb-1">What if we had…</h3>
      <p className="text-xs t3 mb-4">Holds today&apos;s measured ARPU ({kes(be.arpu)}) and per-merchant cost ({kes(be.variablePerSub)}). Not a forecast — a straight-line read of today&apos;s unit economics.</p>
      <div className="flex justify-between items-baseline mb-2">
        <label htmlFor="be-scenario" className="text-xs font-semibold t3 uppercase tracking-wide">Paying merchants</label>
        <span className="text-sm font-bold t1 num">{n}</span>
      </div>
      <input id="be-scenario" type="range" min="0" max={max} value={n} onChange={(e) => setN(Number(e.target.value))} className="w-full" />
      <div className="rounded-xl p-4 mt-4" style={{ background: net >= 0 ? 'var(--green-bg)' : 'var(--red-bg)' }}>
        <div className="text-xs font-semibold t3 uppercase tracking-wide">Monthly net at {n} merchants</div>
        <div className="text-2xl font-bold num" style={{ color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>{kes(net)}</div>
        <div className="text-xs t2 mt-1">
          {delta === 0 ? 'Same as today.' : `${delta > 0 ? '+' : '−'}${kes(Math.abs(delta))} vs today's ${kes(be.net)}`}
        </div>
      </div>
    </Card>
  );
}

/* Where the money goes this month — the classified split the maths actually used. */
function CostSplit({ sum, month }) {
  const total = sum.fixed + sum.variable + sum.oneoff + sum.unclassified;
  const rows = [
    ['fixed', sum.fixed, 'var(--red)'],
    ['variable', sum.variable, 'var(--amber)'],
    ['oneoff', sum.oneoff, 'var(--blue)'],
  ].filter(([, v]) => v > 0);
  if (sum.unclassified > 0) rows.push(['unclassified', sum.unclassified, 'var(--t3)']);
  return (
    <Card className="p-6">
      <h3 className="font-bold t1 mb-1">Recorded costs · {MONTH_LABEL(month)}</h3>
      <p className="text-xs t3 mb-4">{sum.counted} expense {sum.counted === 1 ? 'entry' : 'entries'} · one-off costs are excluded from the monthly run rate.</p>
      {total === 0 ? (
        <div className="text-sm t3 py-6 text-center">No expenses recorded for this month.</div>
      ) : (
        <div className="space-y-3">
          {rows.map(([k, v, tone]) => (
            <div key={k}>
              <div className="flex justify-between text-sm mb-1">
                <span className="t2">{BEHAVIOUR_LABEL[k] || 'Unclassified'}</span>
                <span className="font-semibold t1 num">{kes(v)} <span className="t3 font-normal">· {pct((v / total) * 100)}</span></span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                <div className="h-full rounded-full" style={{ width: `${(v / total) * 100}%`, background: tone }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/**
 * `entries` + `live` come straight from listFinanceEntries — the same payload the
 * ledger screen renders, so the two can never disagree.
 */
export function BreakEven({ entries, live, loading, onReload }) {
  const month = monthKey(new Date());
  const sum = useMemo(() => summariseMonth(entries, month), [entries, month]);
  const be = useMemo(() => breakEven({
    fixedMonthly: sum.fixed,
    variableMonthly: sum.variable,
    // Live, settled M-Pesa subscription payments this month — the only revenue
    // the platform actually books.
    revenueMonth: live.subscriptionRevenueMonth || 0,
    activeSubs: live.activeSubscriptions || 0,
  }), [sum, live]);

  return (
    <div className="fadeup space-y-5">
      <SectionHead icon="scale-balanced" title="Break-even analysis" sub={`Measured from the ledger and live subscriptions · ${MONTH_LABEL(month)}`}
        action={<Btn kind="ghost" size="md" icon={loading ? 'spinner' : 'rotate'} onClick={onReload} disabled={loading}>Refresh</Btn>} />

      <StatusBanner be={be} month={month} unclassified={sum.unclassified} unclassifiedCount={sum.unclassifiedCount} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Break-even merchants"
          value={be.breakEvenSubs != null ? String(be.breakEvenSubs) : '—'}
          sub={be.breakEvenSubs != null ? `${kes(be.breakEvenRevenue)} monthly` : 'Not enough data'}
          icon="bullseye" tone={be.status === 'ok' ? 'pri' : 'amber'} />
        <Stat label="Paying merchants now" value={String(be.subs)} sub="On a live plan" icon="id-card" tone="blue" />
        <Stat label="Monthly net" value={kes(be.net)} sub={`${kes(be.revenue)} in · ${kes(be.fixed + be.variable)} out`}
          icon={be.net >= 0 ? 'arrow-trend-up' : 'arrow-trend-down'} tone={be.net >= 0 ? 'green' : 'red'} />
      </div>

      <Gauge be={be} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CostSplit sum={sum} month={month} />
        <Scenario be={be} />
      </div>

      <p className="text-xs t3 flex items-start gap-1.5">
        <Icon name="circle-info" className="mt-0.5" />
        <span>
          A merchant is the unit because platform revenue is subscription-only — order value flows to merchants via escrow &amp; release, so it never nets out here.
          Fixed and variable costs come from how each expense is classified in the ledger below; one-off costs are excluded.
          Revenue is live settled M-Pesa subscription payments for {MONTH_LABEL(month)}.
        </span>
      </p>
    </div>
  );
}
