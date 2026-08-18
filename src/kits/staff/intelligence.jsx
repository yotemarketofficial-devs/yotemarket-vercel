/* intelligence.jsx — Staff portal: Business Intelligence. A live cross-platform
   commercial data repository plus an AI-generated executive brief built from the
   same figures.

   The headline block is OUR business: recurring subscription revenue, what it
   costs to serve the delivery allotment those plans buy, and retention. Merchant
   sales appear only in a separate, explicitly-labelled block — the platform takes
   no cut of trade, so that money is never ours and must never be read as growth. */
import React from 'react';
import { Card, SectionHead, Btn, Icon, Stat, Bar, kes } from './ui.jsx';
import Markdown from '../../components/Markdown.jsx';
import { platformIntelligence, platformInsights } from '../../lib/firebase.js';
const { useState, useEffect, useCallback } = React;

const num = (n) => Number(n || 0).toLocaleString('en-KE');
const fmtWhen = (ms) => ms ? new Date(ms).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

export function Intelligence(){
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [insights, setInsights] = useState('');
  const [thinking, setThinking] = useState(false);
  const [genAt, setGenAt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await platformIntelligence(); setData(r.data || null); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Could not load platform data.' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setThinking(true); setMsg(null);
    try { const r = await platformInsights(); setInsights(r.insights || ''); setGenAt(Date.now()); if (r.data) setData(r.data); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Could not generate insights.' }); }
    finally { setThinking(false); }
  };

  const d = data || {};
  const topStores = d.topStores || [];
  const byCategory = d.byCategory || [];
  const maxCat = byCategory.reduce((m, c) => Math.max(m, c.stores || 0), 0) || 1;
  const fulfHub = d.byFulfillment?.hub || 0;
  const fulfPickup = d.byFulfillment?.store_pickup || 0;
  const fulfTotal = fulfHub + fulfPickup || 1;

  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="chart-pie" title="Business intelligence" sub="Live commercial data across the platform, and an AI executive brief"
        action={<Btn kind="soft" size="md" icon={loading ? 'spinner' : 'rotate'} onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Btn>} />
      {msg && <div className="text-sm flex items-center gap-2" style={{ color: msg.ok ? 'var(--green)' : 'var(--red)' }}><Icon name={msg.ok ? 'circle-check' : 'circle-exclamation'} />{msg.text}</div>}

      {/* ── Platform revenue: the money YoteMarket actually earns ─────────────── */}
      <div>
        <h3 className="text-sm font-bold t1 mb-2 flex items-center gap-2"><Icon name="crown" style={{ color:'var(--pri)' }} />Our revenue</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Recurring revenue" value={kes(d.mrr)} sub={`MRR · ${num(d.activeSubscriptions)} active plans`} icon="repeat" tone="pri" />
          <Stat label="Collected this month" value={kes(d.subscriptionRevenueMonth)} sub={`${kes(d.subscriptionRevenue)} all-time`} icon="money-bill-wave" tone="green" />
          <Stat label="Revenue per merchant" value={kes(d.arpu)} sub="ARPU / month" icon="user-tag" tone="blue" />
          <Stat label="Gross margin (month)" value={kes(d.grossMarginMonth)} sub={`after ${kes(d.riderCostMonth)} rider payouts`} icon="scale-balanced" tone={Number(d.grossMarginMonth) < 0 ? 'red' : 'amber'} />
        </div>
      </div>

      {/* ── Retention + the delivery obligation plans create ──────────────────── */}
      <div>
        <h3 className="text-sm font-bold t1 mb-2 flex items-center gap-2"><Icon name="heart-pulse" style={{ color:'var(--pri)' }} />Retention &amp; capacity</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Renewals due" value={num(d.renewalsDue7)} sub="within 7 days" icon="calendar-day" tone="amber" />
          <Stat label="Churn (30 days)" value={`${Number(d.churnPct) || 0}%`} sub={`${num(d.lapsed30)} plans lapsed`} icon="user-slash" tone={Number(d.churnPct) > 10 ? 'red' : 'blue'} />
          <Stat label="Allotment used" value={d.allotIncluded ? `${Number(d.allotPct) || 0}%` : '—'} sub={`${num(d.allotUsed)} of ${num(d.allotIncluded)} deliveries`} icon="box-open" tone="pri" />
          <Stat label="Runs completed" value={num(d.runsCompleted)} sub={`${num(d.runsCompletedMonth)} this month`} icon="motorcycle" tone="green" />
        </div>
      </div>

      {/* ── Marketplace scale. Merchant sales are the MERCHANTS' money: we take no
             commission, so this is a health/retention signal, never our income. ── */}
      <div>
        <h3 className="text-sm font-bold t1 mb-1 flex items-center gap-2"><Icon name="store" style={{ color:'var(--pri)' }} />Marketplace activity</h3>
        <p className="text-xs t3 mb-2">Merchant trade volume — their money, not platform revenue. Tracked because a store that stops selling stops renewing.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Live stores" value={num(d.verifiedStores)} sub={`${num(d.totalStores)} total · ${num(d.suspendedStores)} suspended`} icon="shop" tone="blue" />
          <Stat label="Orders" value={num(d.orders)} sub={`${num(d.delivered)} delivered · ${num(d.pending)} open`} icon="bag-shopping" tone="amber" />
          <Stat label="Merchant sales" value={kes(d.merchantSales)} sub={`${num(d.paidOrders)} paid orders · ${kes(d.merchantSalesMonth)} this month`} icon="cart-shopping" tone="green" />
          <Stat label="Avg order value" value={kes(d.avgOrderValue)} sub={`${num(d.activeShoppers)} shoppers · ${num(d.scouts)} scouts`} icon="receipt" tone="pri" />
        </div>
      </div>

      {/* AI brief */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'var(--pri-soft)', color:'var(--pri)' }}><Icon name="wand-magic-sparkles" /></div>
            <div><h3 className="font-bold t1">AI executive brief</h3><p className="text-sm t3">Grounded in the live figures above — insights, risks &amp; recommendations.</p></div>
          </div>
          <Btn kind="primary" size="md" icon={thinking ? 'spinner' : 'wand-magic-sparkles'} onClick={generate} disabled={thinking || loading}>{thinking ? 'Analysing…' : (insights ? 'Regenerate' : 'Generate insights')}</Btn>
        </div>
        {thinking && (
          <div className="flex items-center gap-3 rounded-xl p-4" style={{ background:'var(--pri-soft)', border:'1px solid var(--pri-line)' }}>
            <Icon name="spinner" className="fa-spin" style={{ color:'var(--pri)', fontSize:18 }} />
            <div>
              <div className="text-sm font-semibold" style={{ color:'var(--pri)' }}>YoteAI is analysing the platform…</div>
              <div className="text-xs t3">Reading the live figures and writing your executive brief — this can take a few seconds.</div>
            </div>
          </div>
        )}
        {insights && !thinking && (
          <div style={{ borderTop:'1px solid var(--line)', paddingTop:16 }}>
            <div className="flex items-center gap-2 mb-3">
              <Icon name="wand-magic-sparkles" style={{ color:'var(--pri)' }} />
              <span className="text-xs font-semibold" style={{ color:'var(--pri)' }}>Generated by YoteAI</span>
              {genAt && <span className="text-xs t3">· {fmtWhen(genAt)}</span>}
            </div>
            <div className="text-sm t1 leading-relaxed"><Markdown text={insights} /></div>
          </div>
        )}
        {!insights && !thinking && <div className="text-sm t3" style={{ borderTop:'1px solid var(--line)', paddingTop:16 }}>No brief yet — tap “Generate insights” to have YoteAI analyse the current numbers.</div>}
      </Card>

      {/* data repository detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <h3 className="font-bold t1 mb-1">Top stores by sales</h3>
          <p className="text-xs t3 mb-3">Their takings — our best predictor of who renews</p>
          {topStores.length === 0 ? <div className="text-sm t3 py-6 text-center">No sales yet.</div> : (
            <div className="space-y-2">
              {topStores.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ border:'1px solid var(--line)' }}>
                  <span className="num text-sm font-bold t3 w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0"><div className="font-semibold t1 text-sm truncate">{s.store}</div><div className="text-xs t3">{num(s.orders)} order{s.orders !== 1 ? 's' : ''}</div></div>
                  <div className="num font-bold t1 text-sm">{kes(s.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-5">
          <div>
            <h3 className="font-bold t1 mb-3">Stores by category</h3>
            {byCategory.length === 0 ? <div className="text-sm t3">No stores yet.</div> : (
              <div className="space-y-2.5">
                {byCategory.slice(0, 8).map((c, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1"><span className="t2 capitalize">{c.category}</span><span className="num t3">{num(c.stores)}</span></div>
                    <Bar pct={(c.stores / maxCat) * 100} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold t1 mb-3">Fulfilment split</h3>
            <div className="flex justify-between text-xs mb-1"><span className="t2">Hub delivery</span><span className="num t3">{num(fulfHub)} · {Math.round(fulfHub / fulfTotal * 100)}%</span></div>
            <Bar pct={fulfHub / fulfTotal * 100} color="var(--blue)" />
            <div className="flex justify-between text-xs mb-1 mt-3"><span className="t2">Store pickup</span><span className="num t3">{num(fulfPickup)} · {Math.round(fulfPickup / fulfTotal * 100)}%</span></div>
            <Bar pct={fulfPickup / fulfTotal * 100} color="var(--amber)" />
          </div>
        </Card>
      </div>

      {d.generatedAt && <div className="text-xs t3 text-center">Data snapshot · {fmtWhen(d.generatedAt)} · figures in KES</div>}
    </div>
  );
}
