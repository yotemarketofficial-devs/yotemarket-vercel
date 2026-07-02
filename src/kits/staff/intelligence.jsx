/* intelligence.jsx — Staff portal: Business Intelligence. A live cross-platform
   commercial data repository (GMV, subscription revenue, merchants, top stores,
   categories) plus an AI-generated executive brief built from that same data. */
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

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await platformIntelligence(); setData(r.data || null); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Could not load platform data.' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setThinking(true); setMsg(null);
    try { const r = await platformInsights(); setInsights(r.insights || ''); if (r.data) setData(r.data); }
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

      {/* headline commercial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="GMV (all-time)" value={kes(d.gmv)} sub={`${num(d.paidOrders)} paid orders`} icon="sack-dollar" tone="green" />
        <Stat label="GMV this month" value={kes(d.gmvMonth)} icon="arrow-trend-up" tone="pri" />
        <Stat label="Platform revenue" value={kes(d.subscriptionRevenue)} sub="Subscriptions (all-time)" icon="crown" tone="amber" />
        <Stat label="Revenue this month" value={kes(d.subscriptionRevenueMonth)} sub="Subscription income" icon="calendar-day" tone="blue" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active merchants" value={num(d.activeSubscriptions)} sub={`${num(d.merchants)} registered`} icon="store" tone="pri" />
        <Stat label="Live stores" value={num(d.verifiedStores)} sub={`${num(d.totalStores)} total · ${num(d.suspendedStores)} suspended`} icon="shop" tone="blue" />
        <Stat label="Orders" value={num(d.orders)} sub={`${num(d.delivered)} delivered · ${num(d.pending)} open`} icon="bag-shopping" tone="amber" />
        <Stat label="Avg order value" value={kes(d.avgOrderValue)} sub={`${num(d.activeShoppers)} shoppers · ${num(d.scouts)} scouts`} icon="receipt" tone="green" />
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
        {thinking && <div className="text-sm t3 flex items-center gap-2"><Icon name="spinner" /> Reading the platform data and writing the brief…</div>}
        {insights
          ? <div className="text-sm t1 leading-relaxed" style={{ borderTop:'1px solid var(--line)', paddingTop:16 }}><Markdown text={insights} /></div>
          : !thinking && <div className="text-sm t3" style={{ borderTop:'1px solid var(--line)', paddingTop:16 }}>No brief yet — tap “Generate insights” to have YoteAI analyse the current numbers.</div>}
      </Card>

      {/* data repository detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <h3 className="font-bold t1 mb-3">Top stores by revenue</h3>
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
