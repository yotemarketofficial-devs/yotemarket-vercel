/* command.jsx — Command Center: the console home.
   Consolidates what was scattered across the notifications bell and the overview
   into one actionable surface: a unified ACTION CENTER (every pending staff queue
   with a jump-to link) on top of the live platform KPIs. Deep charts stay in the
   separate Analytics section. `go(sectionKey)` navigates the shell. */
import React from 'react';
import { KPIS, FUNNEL } from './data.js';
import { Card, SectionHead, Stat, Btn, Pill, Icon } from './ui.jsx';
import {
  useStaffResource, fetchOverview,
  fetchReports, fetchReviewReports, fetchPayouts, fetchMerchantFollows, fetchDeletionRequests, fetchSupportTickets,
} from './service.js';
import { staffListPayoutChanges } from '../../lib/firebase.js';
const { useState, useEffect } = React;

/* Every actionable queue, in priority order. Each resolves to a count + the
   section a click should jump to. */
const QUEUES = [
  { key:'support',    icon:'headset',       label:'Support tickets',        desc:'Open Help Center requests to answer',      tone:'red',   load: async () => (await fetchSupportTickets('open')).tickets },
  { key:'moderation', icon:'comment-slash', label:'Chat reports',          desc:'Reported conversations awaiting review',   tone:'red',   load:fetchReports },
  { key:'reviews',    icon:'star-half-stroke', label:'Review reports',      desc:'Flagged product reviews to triage',        tone:'red',   load:fetchReviewReports },
  { key:'approvals',  icon:'store-slash',   label:'Store-closure requests', desc:'Merchants asking to close their store',     tone:'amber', load: async () => (await fetchDeletionRequests()).filter((c) => c.status === 'pending') },
  { key:'scouts',     icon:'wallet',        label:'Scout payouts',          desc:'Payout requests to approve & send',         tone:'amber', load:fetchPayouts },
  { key:'scouts',     icon:'user-check',    label:'Merchant-follow proofs', desc:'Scout task proofs to verify',              tone:'amber', load:fetchMerchantFollows },
  { key:'wallet',     icon:'right-left',    label:'Payout-change requests', desc:'Merchant M-Pesa detail changes to approve', tone:'blue',  load: async () => { const r = await staffListPayoutChanges(); return (r && r.requests) || []; } },
];

function useActionCenter() {
  const [rows, setRows] = useState(null); // null = loading
  useEffect(() => {
    let alive = true;
    Promise.allSettled(QUEUES.map((q) => q.load())).then((res) => {
      if (!alive) return;
      setRows(QUEUES.map((q, i) => ({
        ...q,
        count: res[i].status === 'fulfilled' && Array.isArray(res[i].value) ? res[i].value.length : 0,
      })));
    });
    return () => { alive = false; };
  }, []);
  return rows;
}

function ActionCenter({ go }) {
  const rows = useActionCenter();
  const loading = rows === null;
  const pending = (rows || []).filter((r) => r.count > 0);
  const total = pending.reduce((a, r) => a + r.count, 0);
  const toneBg = { red:'var(--red-bg)', amber:'var(--amber-bg)', blue:'var(--blue-bg)' };
  const toneFg = { red:'var(--red)', amber:'var(--amber)', blue:'var(--blue)' };
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid var(--line)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:'var(--pri-soft)', color:'var(--pri)' }}><Icon name="bolt" /></div>
          <div><div className="font-bold t1 leading-tight">Action center</div><div className="text-xs t3">Everything that needs a person</div></div>
        </div>
        {!loading && (total > 0
          ? <Pill tone="amber">{total} pending</Pill>
          : <Pill tone="ok">All clear</Pill>)}
      </div>
      {loading ? (
        <div className="px-5 py-8 text-center t3 text-sm"><Icon name="spinner" className="fa-spin mr-2" />Checking the queues…</div>
      ) : pending.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background:'var(--green-bg)', color:'var(--green)' }}><Icon name="circle-check" className="text-xl" /></div>
          <div className="font-semibold t1">Inbox zero</div>
          <div className="text-sm t3 mt-1">No pending reports, payouts or requests across the platform.</div>
        </div>
      ) : (
        <div>
          {pending.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5" style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: toneBg[r.tone], color: toneFg[r.tone] }}><Icon name={r.icon} /></div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold t1 text-sm flex items-center gap-2">{r.label}<span className="num text-xs font-bold text-white rounded-full px-1.5 min-w-[20px] text-center" style={{ background: toneFg[r.tone] }}>{r.count}</span></div>
                <div className="text-xs t3 truncate">{r.desc}</div>
              </div>
              <Btn kind="soft" size="sm" iconRight="arrow-right" onClick={() => go(r.key)}>Review</Btn>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* Merchant funnel health — REAL conversion rates derived from the live activation
   funnel (staffOverview): signed up → listed ≥2 → first sale → repeat seller. */
function Health({ funnel }) {
  const f = (Array.isArray(funnel) && funnel.length) ? funnel : FUNNEL;
  const v = (i) => (f[i] ? Number(f[i].v) || 0 : 0);
  const signed = v(0); const listed = v(1); const sale = v(2); const repeat = v(3);
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const metrics = [
    { label:'Activation rate', sub:'made a first sale', val:`${pct(sale, signed)}%`, tone:'green', icon:'rocket' },
    { label:'Listing rate',    sub:'listed ≥2 items',   val:`${pct(listed, signed)}%`, tone:'pri',  icon:'box' },
    { label:'Repeat sellers',  sub:'sold more than once', val:`${pct(repeat, sale)}%`, tone:'blue', icon:'repeat' },
    { label:'Signed-up stores', sub:'total merchants',   val: signed.toLocaleString(), tone:'amber', icon:'store' },
  ];
  const tones = { green:['var(--green-bg)','var(--green)'], pri:['var(--pri-soft)','var(--pri)'], blue:['var(--blue-bg)','var(--blue)'], amber:['var(--amber-bg)','var(--amber)'] };
  return (
    <Card className="p-6">
      <h3 className="font-bold t1 mb-1">Merchant funnel</h3>
      <p className="text-xs t3 mb-4">Live conversion across the merchant lifecycle</p>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((m) => { const c = tones[m.tone]; return (
          <div key={m.label} className="rounded-xl p-4" style={{ background:'var(--surface2)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ background:c[0], color:c[1] }}><Icon name={m.icon} /></div>
            <div className="text-xl font-bold t1 num">{m.val}</div><div className="text-xs t1 font-semibold">{m.label}</div><div className="text-[11px] t3">{m.sub}</div>
          </div>
        ); })}
      </div>
    </Card>
  );
}

export function CommandCenter({ go = () => {} }) {
  const { data, live } = useStaffResource(fetchOverview, { kpis: KPIS });
  const kpis = data.kpis || KPIS;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="fadeup space-y-6">
      <SectionHead icon="gauge-high" title={`${greeting} — Command center`}
        sub={live ? 'Live platform pulse and everything awaiting action' : 'Sample data — connect the backend for live figures'} />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><ActionCenter go={go} /></div>
        <Health funnel={data.funnel} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold t1">Platform KPIs</h3>
          <Btn kind="ghost" size="sm" iconRight="arrow-right" onClick={() => go('analytics')}>Full analytics</Btn>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => <Stat key={k.label} {...k} delta={k.delta} deltaUp={k.up} />)}
        </div>
      </div>
    </div>
  );
}
