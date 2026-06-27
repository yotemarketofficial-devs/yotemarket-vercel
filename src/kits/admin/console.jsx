// console.jsx — YoteMarket Internal Operations Console (STAFF & ADMINS ONLY).
// Surfaces the confidential pricing & unit-economics logic from the shared economics module.
import React from 'react';
import { Icon, Card, Logo } from './primitives.jsx';
import { YM_ECON, ymPaidKm, ymRunPayout, ymSubTier, ymRunEconomics } from '../mobile/economics.js';
import { grantFreeMonths, listPromos, createPromo, setPromoActive } from '../../lib/firebase.js';

const { useState: useS } = React;
const kes = n => 'KSh ' + Number(Math.round(n)).toLocaleString('en-KE');
const BAND_KEYS = ['A', 'B', 'C'];
const PLANS = YM_ECON.planOrder;

const STAFF = { name: 'Operations · A. Kamau', role: 'Admin', initials: 'AK' };

const NAV = [
  { key: 'overview', icon: 'gauge-high',  label: 'Overview' },
  { key: 'promos',   icon: 'tags',        label: 'Promotions' },
  { key: 'ratecard', icon: 'table-cells', label: 'Subscription rate card' },
  { key: 'riderpay', icon: 'motorcycle',  label: 'Rider pay models' },
  { key: 'unit',     icon: 'scale-balanced', label: 'Unit economics' },
  { key: 'fees',     icon: 'id-badge',    label: 'Badges & software' },
  { key: 'calc',     icon: 'calculator',  label: 'Run calculator' },
];

/* ---------- small shared bits ---------- */
function SectionHead({ icon, title, sub }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center text-lg flex-shrink-0"><Icon name={icon} /></div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 leading-tight">{title}</h2>
        {sub && <p className="text-sm text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function BandTabs({ band, onChange }) {
  return (
    <div className="inline-flex bg-gray-100 rounded-lg p-1 mb-5">
      {BAND_KEYS.map(k => {
        const b = YM_ECON.bands[k];
        const active = band === k;
        return (
          <button key={k} onClick={() => onChange(k)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${active ? 'bg-white text-primary shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}>
            Band {k} · {b.label}
          </button>
        );
      })}
    </div>
  );
}

const ConfidentialTag = () => (
  <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-xs font-semibold">
    <Icon name="lock" /> Confidential · staff only
  </span>
);

/* ---------- OVERVIEW ---------- */
function Overview() {
  const rules = [
    { icon: 'file-signature', title: 'Contractor model', items: ['Riders, vans & trucks on zero-hour contracts', 'Platform pays per-run payouts only', 'No fuel, insurance or maintenance liability'] },
    { icon: 'ruler-horizontal', title: 'Distance charging rule', items: ['Paid Km = (upper bound of distance tier) − 2', 'e.g. 0–5 km tier → 3 paid km', 'Upper-bound assumption is deliberately conservative'] },
  ];
  const notes = [
    'Batching density is the primary profit lever',
    'Distance risk is capped through subscription pricing',
    'Long-haul routes materially subsidise urban operations',
    'Badge fees self-fund a transit-insurance buffer (zero P&L impact)',
    'Software-only tiers expand the market beyond delivery-dependent merchants',
  ];
  const kpis = [
    'Merchants per run (by band)', 'Cost per run vs revenue per run', 'Subscription mix (Starter / Growth / Pro)',
    'Route completion & on-time rate', 'Merchant retention & upgrades', 'Badge collection rate & insurance claims ratio',
    'Non-delivery → delivery conversion rate',
  ];
  return (
    <div>
      <SectionHead icon="gauge-high" title="Locked business rules" sub="The fixed assumptions every price and payout below is derived from." />
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {rules.map(r => (
          <Card key={r.title}>
            <div className="flex items-center gap-2.5 mb-3">
              <Icon name={r.icon} className="text-primary" />
              <h3 className="font-bold text-gray-900">{r.title}</h3>
            </div>
            <ul className="space-y-2">
              {r.items.map(it => (
                <li key={it} className="flex gap-2 text-sm text-gray-600"><Icon name="check" className="text-success-500 mt-0.5" /><span>{it}</span></li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <h3 className="font-bold text-gray-900 mb-4">Batching by band</h3>
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr><th className="text-left font-semibold px-4 py-2.5">Band</th><th className="text-left font-semibold px-4 py-2.5">Vehicle</th><th className="text-right font-semibold px-4 py-2.5">Merchants / run</th></tr>
            </thead>
            <tbody>
              {BAND_KEYS.map(k => {
                const b = YM_ECON.bands[k];
                return (
                  <tr key={k} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-900">Band {k} · {b.label}</td>
                    <td className="px-4 py-3 text-gray-600">{b.vehicle}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{b.merchantsPerRun}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-gray-900 mb-3">Strategic notes</h3>
          <ul className="space-y-2.5">
            {notes.map(n => <li key={n} className="flex gap-2.5 text-sm text-gray-600"><Icon name="bolt" className="text-warning-500 mt-0.5" /><span>{n}</span></li>)}
          </ul>
        </Card>
        <Card>
          <h3 className="font-bold text-gray-900 mb-3">KPIs to monitor</h3>
          <ul className="space-y-2.5">
            {kpis.map(n => <li key={n} className="flex gap-2.5 text-sm text-gray-600"><Icon name="chart-line" className="text-primary mt-0.5" /><span>{n}</span></li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/* ---------- RATE CARD ---------- */
function RateCard() {
  const [band, setBand] = useS('A');
  const b = YM_ECON.bands[band];
  return (
    <div>
      <SectionHead icon="table-cells" title="Subscription rate card" sub="Per merchant, per month. Deliveries bundled into each plan." />
      <BandTabs band={band} onChange={setBand} />
      <Card padding="p-0" className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Distance sub-tier</th>
              {PLANS.map(p => <th key={p} className="text-right font-semibold px-4 py-3">{p}</th>)}
            </tr>
          </thead>
          <tbody>
            {b.subTiers.map(st => (
              <tr key={st.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{st.range}</td>
                {PLANS.map(p => (
                  <td key={p} className="px-4 py-3 text-right">
                    <div className="font-bold text-gray-900">{kes(st.plans[p].p)}</div>
                    <div className="text-xs text-gray-400">{st.plans[p].d} deliveries</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-gray-400 mt-3">Unused deliveries do not roll over — they subsidise spare capacity, keeping prices low and rider utilisation stable.</p>
    </div>
  );
}

/* ---------- RIDER PAY MODELS ---------- */
function RiderPay() {
  return (
    <div>
      <SectionHead icon="motorcycle" title="Rider pay models" sub="Per-run payout logic by band. Inflation-adjusted (2025)." />
      <div className="grid lg:grid-cols-3 gap-4">
        {BAND_KEYS.map(k => {
          const b = YM_ECON.bands[k];
          const extra = b.merchantsPerRun - 1;
          const multiTotal = b.pay.multiDrop * extra;
          const fixed = b.pay.base + multiTotal;
          return (
            <Card key={k}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">Band {k} · {b.label}</h3>
                <span className="text-xs text-gray-400">{b.vehicle}</span>
              </div>
              <dl className="space-y-2 text-sm">
                <Row l="Base pay" v={kes(b.pay.base)} />
                <Row l="Distance pay" v={kes(b.pay.perKm) + ' / km'} />
                <Row l={`Multi-drop (${kes(b.pay.multiDrop)} × ${extra})`} v={kes(multiTotal)} />
              </dl>
              <div className="mt-4 bg-primary-50 rounded-lg p-3">
                <div className="text-xs text-primary-700 font-semibold mb-1">Cost per run</div>
                <div className="text-sm font-bold text-gray-900">{kes(fixed)} + (Paid Km × {kes(b.pay.perKm)})</div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
function Row({ l, v }) {
  return <div className="flex justify-between"><dt className="text-gray-500">{l}</dt><dd className="font-semibold text-gray-900">{v}</dd></div>;
}

/* ---------- UNIT ECONOMICS ---------- */
function UnitEconomics() {
  const [band, setBand] = useS('A');
  const [plan, setPlan] = useS('Starter');
  const b = YM_ECON.bands[band];
  return (
    <div>
      <SectionHead icon="scale-balanced" title="Unit economics" sub="Per fully-utilised batched run group, per month." />
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <BandTabs band={band} onChange={setBand} />
        <div className="inline-flex bg-gray-100 rounded-lg p-1 mb-5">
          {PLANS.map(p => (
            <button key={p} onClick={() => setPlan(p)}
              className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${plan === p ? 'bg-white text-primary shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}>{p}</button>
          ))}
        </div>
      </div>
      <Card padding="p-0" className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Sub-tier</th>
              <th className="text-right font-semibold px-4 py-3">Paid km</th>
              <th className="text-right font-semibold px-4 py-3">Revenue</th>
              <th className="text-right font-semibold px-4 py-3">Cost</th>
              <th className="text-right font-semibold px-4 py-3">Margin</th>
            </tr>
          </thead>
          <tbody>
            {b.subTiers.map(st => {
              const e = ymRunEconomics(band, st.id, plan);
              return (
                <tr key={st.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{st.range}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{e.paidKm}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{kes(e.revenue)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{kes(e.cost)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-success-600">{kes(e.margin)}</span>
                    <span className="text-xs text-gray-400 ml-1.5">{e.marginPct}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-gray-400 mt-3">Revenue = plan price × {b.merchantsPerRun} merchants/run · Cost = cost-per-run × {plan === 'Starter' ? 10 : plan === 'Growth' ? 20 : 30} runs (one per delivery).</p>
    </div>
  );
}

/* ---------- BADGES & SOFTWARE ---------- */
function Fees() {
  const badgeUnlocks = { Starter: 'Starter-tier runs', Growth: 'Growth + Starter runs', Pro: 'All delivery tiers' };
  return (
    <div>
      <SectionHead icon="id-badge" title="Rider badges & software-only tiers" sub="One-time rider access fees and non-delivery merchant plans." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-gray-900 mb-1">Delivery tier access (badge) fees</h3>
          <p className="text-xs text-gray-500 mb-4">One-time, per rider, non-refundable.</p>
          <div className="space-y-3">
            {PLANS.map(p => (
              <div key={p} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <div className="font-semibold text-gray-900">{p} badge</div>
                  <div className="text-xs text-gray-500">Unlocks {badgeUnlocks[p]}</div>
                </div>
                <span className="font-bold text-gray-900">{kes(YM_ECON.badges[p])}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2.5 text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg p-3">
            <Icon name="shield-halved" className="text-warning-500 mt-0.5" />
            <span>Pooled exclusively to fund goods-in-transit insurance — <strong>not recognised as platform revenue</strong>.</span>
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-gray-900 mb-1">Software-only (non-delivery) tiers</h3>
          <p className="text-xs text-gray-500 mb-4">Platform tools without any delivery runs. Monthly.</p>
          <div className="space-y-3">
            {Object.entries(YM_ECON.software).map(([tier, s]) => (
              <div key={tier} className="flex items-start justify-between bg-gray-50 rounded-lg px-4 py-3 gap-3">
                <div>
                  <div className="font-semibold text-gray-900">{tier}</div>
                  <div className="text-xs text-gray-500">{s.desc}</div>
                </div>
                <span className="font-bold text-gray-900 whitespace-nowrap">{kes(s.fee)}/mo</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2.5 text-xs text-gray-500 bg-primary-50 rounded-lg p-3">
            <Icon name="arrow-up-right-from-square" className="text-primary mt-0.5" />
            <span>Upgrades to a delivery plan credit the unused software portion pro-rata.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------- RUN CALCULATOR ---------- */
function Calculator() {
  const [band, setBand] = useS('A');
  const b = YM_ECON.bands[band];
  const [subId, setSubId] = useS(b.subTiers[0].id);
  const [plan, setPlan] = useS('Growth');
  const [drops, setDrops] = useS(b.merchantsPerRun);

  // keep sub-tier & drops valid when band changes
  React.useEffect(() => {
    setSubId(YM_ECON.bands[band].subTiers[0].id);
    setDrops(YM_ECON.bands[band].merchantsPerRun);
  }, [band]);

  const st = ymSubTier(band, subId) || b.subTiers[0];
  const paidKm = ymPaidKm(st.ub);
  const pay = ymRunPayout(band, paidKm, drops);
  const econ = ymRunEconomics(band, st.id, plan);

  const seg = (val, set, opts, fmt) => (
    <div className="inline-flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1">
      {opts.map(o => (
        <button key={o} onClick={() => set(o)}
          className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${val === o ? 'bg-white text-primary shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}>{fmt ? fmt(o) : o}</button>
      ))}
    </div>
  );

  return (
    <div>
      <SectionHead icon="calculator" title="Run economics calculator" sub="Model any batched run live — payout, revenue, and margin." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Band</label>
              {seg(band, setBand, BAND_KEYS, k => 'Band ' + k)}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Distance sub-tier</label>
              {seg(subId, setSubId, b.subTiers.map(s => s.id), id => (b.subTiers.find(s => s.id === id) || {}).range)}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Plan</label>
              {seg(plan, setPlan, PLANS)}
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Drops on this run</label>
                <span className="text-sm font-bold text-gray-900">{drops} / {b.merchantsPerRun}</span>
              </div>
              <input type="range" min="1" max={b.merchantsPerRun} value={drops} onChange={e => setDrops(Number(e.target.value))}
                className="w-full accent-primary" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-primary-900 to-primary-700 text-white">
          <div className="text-xs uppercase tracking-wide text-white/60 mb-1">Margin · full batch / month</div>
          <div className="text-3xl font-bold">{kes(econ.margin)}</div>
          <div className="text-sm text-white/70 mb-5">{econ.marginPct}% margin on {kes(econ.revenue)} revenue</div>

          <div className="space-y-2.5 text-sm border-t border-white/15 pt-4">
            <CalcRow l="Paid km" v={paidKm + ' km'} />
            <CalcRow l="Base pay" v={kes(pay.base)} />
            <CalcRow l={`Multi-drop × ${Math.max(0, drops - 1)}`} v={kes(pay.multi)} />
            <CalcRow l={`Distance (${paidKm} × ${kes(b.pay.perKm)})`} v={kes(pay.distance)} />
            <div className="flex justify-between border-t border-white/15 pt-2.5 font-bold">
              <span>Payout this run</span><span>{kes(pay.total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-xs text-white/60">Runs / month</div>
              <div className="text-lg font-bold">{econ.runsPerMonth}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-xs text-white/60">Monthly rider cost</div>
              <div className="text-lg font-bold">{kes(econ.cost)}</div>
            </div>
          </div>
        </Card>
      </div>
      <p className="text-xs text-gray-400 mt-3">Payout uses the locked Band {band} model: base + {kes(b.pay.multiDrop)} × (drops−1) + Paid Km × {kes(b.pay.perKm)}. Revenue assumes a full {b.merchantsPerRun}-merchant batch on the {plan} plan.</p>
    </div>
  );
}
function CalcRow({ l, v }) {
  return <div className="flex justify-between text-white/85"><span>{l}</span><span className="font-semibold text-white">{v}</span></div>;
}

/* ---------- SHELL ---------- */
/* ---------- Promotions & offers (admin actions: free months, coupons) ---------- */
function Promotions() {
  const [promos, setPromos] = useS([]);
  const [loading, setLoading] = useS(true);
  const [msg, setMsg] = useS('');
  const [months, setMonths] = useS(1);
  const [granting, setGranting] = useS(false);
  const [form, setForm] = useS({ code: '', type: 'percent', value: '', name: '', maxRedemptions: '', expiresAt: '' });
  const [creating, setCreating] = useS(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try { const r = await listPromos(); setPromos(r.promos || []); } catch (e) { setMsg(e.message || 'Could not load promotions.'); } finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const grant = async () => {
    if (!window.confirm(`Grant ${months} free month(s) to ALL merchants? This activates or extends every merchant's subscription.`)) return;
    setGranting(true); setMsg('');
    try { const r = await grantFreeMonths({ months: Number(months) }); setMsg(`✓ Granted ${months} free month(s) to ${r.granted} merchant(s).`); load(); }
    catch (e) { setMsg(e.message || 'Grant failed.'); } finally { setGranting(false); }
  };
  const create = async () => {
    setCreating(true); setMsg('');
    try {
      await createPromo({
        code: form.code, type: form.type, value: Number(form.value),
        name: form.name || undefined,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : undefined,
      });
      setForm({ code: '', type: 'percent', value: '', name: '', maxRedemptions: '', expiresAt: '' });
      setMsg('✓ Coupon created.'); load();
    } catch (e) { setMsg(e.message || 'Could not create coupon.'); } finally { setCreating(false); }
  };
  const toggle = async (p) => { try { await setPromoActive({ id: p.id, active: !p.active }); load(); } catch (e) { setMsg(e.message || 'Failed.'); } };
  const remove = async (p) => { if (!window.confirm(`Delete ${p.code || p.name}?`)) return; try { await setPromoActive({ id: p.id, remove: true }); load(); } catch (e) { setMsg(e.message || 'Failed.'); } };
  const offer = (p) => p.type === 'percent' ? `${p.value}% off` : p.type === 'fixed' ? `${kes(p.value)} off` : `${p.value} free month${p.value > 1 ? 's' : ''}`;
  const inp = 'border border-gray-200 rounded-lg px-3 py-2 text-sm w-full';

  return (
    <div>
      <SectionHead icon="tags" title="Promotions & offers" sub="Subscription discounts, free months and coupon codes for merchants." />
      {msg && <div className="mb-5 text-sm rounded-lg px-4 py-3 bg-primary-50 text-primary-700">{msg}</div>}

      <Card className="p-5 mb-6">
        <div className="flex items-center gap-3 mb-2"><div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><Icon name="gift" /></div><h3 className="font-bold text-gray-900">Free month campaign</h3></div>
        <p className="text-sm text-gray-500 mb-4">Activate or extend every merchant's subscription by the chosen number of months — free. Idempotent: re-running the same monthly campaign won't double-grant.</p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-600">Months</span>
          <select value={months} onChange={e => setMonths(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">{[1, 2, 3, 6].map(m => <option key={m} value={m}>{m}</option>)}</select>
          <button onClick={grant} disabled={granting} className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"><Icon name={granting ? 'spinner' : 'gift'} className={granting ? 'fa-spin mr-2' : 'mr-2'} />{granting ? 'Granting…' : `Grant ${months} free month${months > 1 ? 's' : ''} to all merchants`}</button>
        </div>
      </Card>

      <Card className="p-5 mb-6">
        <h3 className="font-bold text-gray-900 mb-3">Create a coupon</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="CODE e.g. WELCOME20" className={inp} />
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inp}>
            <option value="percent">% off subscription</option>
            <option value="fixed">KSh off subscription</option>
            <option value="free_months">Free months</option>
          </select>
          <input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value.replace(/[^0-9.]/g, '') }))} inputMode="numeric" placeholder={form.type === 'percent' ? 'Percent (e.g. 20)' : form.type === 'fixed' ? 'KSh off' : 'Months'} className={inp} />
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name (optional)" className={inp} />
          <input value={form.maxRedemptions} onChange={e => setForm(f => ({ ...f, maxRedemptions: e.target.value.replace(/[^0-9]/g, '') }))} inputMode="numeric" placeholder="Max redemptions (optional)" className={inp} />
          <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className={inp} />
        </div>
        <button onClick={create} disabled={creating || !form.code || !form.value} className="mt-4 bg-primary text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60">{creating ? 'Creating…' : 'Create coupon'}</button>
      </Card>

      <Card className="p-5">
        <h3 className="font-bold text-gray-900 mb-3">All promotions</h3>
        {loading ? <div className="text-sm text-gray-400 py-6 text-center"><Icon name="spinner" className="fa-spin mr-2" />Loading…</div>
          : promos.length === 0 ? <div className="text-sm text-gray-400 py-6 text-center">No promotions yet.</div>
            : (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="text-left text-gray-400 border-b border-gray-100"><th className="py-2 pr-3">Code / name</th><th className="py-2 pr-3">Offer</th><th className="py-2 pr-3">Used</th><th className="py-2 pr-3">Status</th><th className="py-2"></th></tr></thead>
                <tbody>{promos.map(p => (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-3"><span className="font-semibold text-gray-900">{p.code || p.name}</span>{p.kind === 'campaign' && <span className="ml-2 text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">campaign</span>}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{offer(p)}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{p.kind === 'campaign' ? `${p.grantedCount} granted` : `${p.redemptions}${p.maxRedemptions ? `/${p.maxRedemptions}` : ''}`}</td>
                    <td className="py-2.5 pr-3">{p.active ? <span className="text-xs bg-green-100 text-green-700 rounded px-2 py-0.5">Active</span> : <span className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5">Off</span>}</td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      {p.kind !== 'campaign' && <button onClick={() => toggle(p)} className="text-xs text-primary font-semibold mr-3">{p.active ? 'Disable' : 'Enable'}</button>}
                      <button onClick={() => remove(p)} className="text-xs text-red-500 font-semibold">Delete</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
      </Card>
    </div>
  );
}

const SECTIONS = { overview: Overview, promos: Promotions, ratecard: RateCard, riderpay: RiderPay, unit: UnitEconomics, fees: Fees, calc: Calculator };

export default function AdminConsole() {
  const [active, setActive] = useS('overview');
  const Active = SECTIONS[active] || Overview;
  const label = (NAV.find(n => n.key === active) || {}).label;

  return (
    <div className="min-h-screen flex flex-col" data-screen-label={'Admin — ' + label} style={{ background: '#F8FAFC', color: '#374151' }}>
      {/* confidential strip */}
      <div className="bg-red-600 text-white text-xs font-semibold text-center py-1.5 px-4">
        <Icon name="triangle-exclamation" className="mr-1.5" />
        CONFIDENTIAL — internal staff &amp; admins only. Not visible to merchants, riders, or shoppers.
      </div>

      {/* top bar */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size={30} />
            <span className="hidden sm:inline-block text-sm text-gray-400 border-l border-gray-200 pl-3 ml-1">Operations Console</span>
          </div>
          <div className="flex items-center gap-4">
            <ConfidentialTag />
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">{STAFF.initials}</div>
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-gray-900">{STAFF.name}</div>
                <div className="text-xs text-gray-500">{STAFF.role}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
          <aside className="hidden md:block">
            <div className="bg-white rounded-xl shadow p-4 sticky top-24">
              <nav className="flex flex-col gap-1">
                {NAV.map(n => {
                  const on = active === n.key;
                  return (
                    <button key={n.key} onClick={() => setActive(n.key)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${on ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                      <Icon name={n.icon} className={`w-5 text-center ${on ? 'text-primary' : 'text-gray-500'}`} />
                      <span className="text-left">{n.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          <div>
            {/* mobile section switcher */}
            <div className="md:hidden -mx-4 px-4 mb-5 overflow-x-auto">
              <div className="flex gap-2">
                {NAV.map(n => (
                  <button key={n.key} onClick={() => setActive(n.key)}
                    className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm font-semibold ${active === n.key ? 'bg-primary text-white' : 'bg-white text-gray-600 shadow-xs'}`}>{n.label}</button>
                ))}
              </div>
            </div>
            <Active />
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-white py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-xs text-gray-400 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© 2026 YoteMarket Limited — Internal Operations</span>
          <span>Source: Internal Pricing &amp; Unit Economics v2 · single source of truth: economics.js</span>
        </div>
      </footer>
    </div>
  );
}
