/* screens.jsx — Staff console screens. CONFIDENTIAL · internal staff only.
   Each screen reads live data through ./service.js (staff-gated Cloud Functions)
   and falls back to the bundled demo data when the backend isn't reachable. */
import React from 'react';
import { KPIS, GMV_TREND, SUB_MIX, FUNNEL, MERCHANTS, APPLICANTS, SCOUTS, PAYOUT_REQUESTS, RUNS, FLEET, WALLET, SUBSCRIPTIONS } from './data.js';
import { Card, SectionHead, Seg, Btn, Pill, Avatar, Stat, Bar, Icon, kes } from './ui.jsx';
import {
  useStaffResource, fetchOverview, fetchMerchants, setMerchantStatus,
  enterpriseQuote, setEnterprise,
  fetchRuns, optimizeRuns, fetchSubscriptions, fetchReports, fetchTranscript,
  moderateConversation, resolveReport, setStaffRole,
  fetchMarketers, setMarketerStage, fetchPayouts, resolvePayout,
  fetchMerchantFollows, resolveMerchantFollow, snapshotScoutFloors,
  fetchReviewReports, removeReview, dismissReviewReport,
  cleanupSeededTestAccounts,
  fetchDeletionRequests, resolveDeletionRequest,
} from './service.js';

// Official YoteMarket socials — the accounts a referred merchant must follow.
const YOTE_SOCIALS = {
  tiktok: 'https://www.tiktok.com/@yotemarketofficial',
  instagram: 'https://www.instagram.com/yotemarketofficial',
  facebook: 'https://www.facebook.com/yotemarketofficial',
  linkedin: 'https://www.linkedin.com/company/yotemarket',
};
import { staffListPayoutChanges, staffResolvePayoutChange } from '../../lib/firebase.js';

const payoutLabelStaff = (p) => {
  if (!p) return 'Not set';
  const t = p.type || (p.method === 'b2b' ? 'paybill' : 'phone');
  if (t === 'phone') return `M-Pesa ${p.phone}`;
  if (t === 'pochi') return `Pochi ${p.phone}`;
  if (t === 'till') return `Till ${p.till}`;
  if (t === 'paybill') return `Paybill ${p.paybill} · Acc ${p.account}`;
  return 'Set';
};

/* Staff review of merchant payout-change requests (staff approval required). */
function PayoutChangeReview(){
  const { useState, useEffect, useCallback } = React;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await staffListPayoutChanges(); setRows(r.requests || []); } catch (e) { /* backend off */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const resolve = async (id, approve) => {
    try { await staffResolvePayoutChange({ id, approve }); setMsg({ ok:true, text: approve ? 'Payout change approved.' : 'Request rejected.' }); load(); }
    catch (e) { setMsg({ ok:false, text: e.message || 'Failed.' }); }
  };
  if (!loading && rows.length === 0) return null;
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3"><h3 className="font-bold t1">Payout-change requests</h3>{rows.length > 0 && <Pill tone="amber">{rows.length} pending</Pill>}</div>
      {msg && <div className="px-5 pb-2 text-sm flex items-center gap-2" style={{ color: msg.ok ? 'var(--green)' : 'var(--red)' }}><Icon name={msg.ok ? 'circle-check' : 'circle-exclamation'} />{msg.text}</div>}
      <div className="divide-y" style={{ borderColor:'var(--line)' }}>
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-4" style={{ borderTop:'1px solid var(--line)' }}>
            <div className="flex-1 min-w-0">
              <div className="font-semibold t1 text-sm truncate">{r.storeName || r.merchantId}</div>
              <div className="text-xs t3 mt-0.5">{payoutLabelStaff(r.current)} <Icon name="arrow-right" className="mx-1" /> <span className="t1 font-semibold">{payoutLabelStaff(r.requested)}</span></div>
            </div>
            <Btn kind="soft" size="sm" onClick={()=>resolve(r.id, false)}>Reject</Btn>
            <Btn kind="primary" size="sm" onClick={()=>resolve(r.id, true)}>Approve</Btn>
          </div>
        ))}
      </div>
    </Card>
  );
}
const { useState: useSS, useEffect: useES } = React;

/* ── Record audit — click any merchant/store/scout to inspect its full record ── */
const prettyKey = (k) => k.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase()).trim();
function AuditField({ k, v }){
  let display;
  if (v == null || v === '') display = <span className="t3">—</span>;
  else if (typeof v === 'boolean') display = v ? 'Yes' : 'No';
  else if (v && (v.seconds != null || v._seconds != null)) display = new Date((v.seconds ?? v._seconds) * 1000).toLocaleString('en-KE');
  else if (Array.isArray(v)) display = v.length ? v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ') : <span className="t3">—</span>;
  else if (typeof v === 'object') display = <span className="num text-xs" style={{ whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{JSON.stringify(v)}</span>;
  else display = String(v);
  return (
    <div className="flex gap-3 py-2" style={{ borderTop:'1px solid var(--line)' }}>
      <span className="t3 text-xs" style={{ width:132, flexShrink:0 }}>{prettyKey(k)}</span>
      <span className="t1 text-sm font-medium" style={{ flex:1, minWidth:0, wordBreak:'break-word' }}>{display}</span>
    </div>
  );
}
export function RecordAudit({ title, subtitle, record, onClose, hide = [] }){
  const skip = new Set(['_busy', 'photo', 'avatar', ...hide]);
  const entries = Object.entries(record || {}).filter(([k]) => !skip.has(k));
  return (
    <div onClick={onClose} className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background:'rgba(8,12,24,.55)', backdropFilter:'blur(3px)' }}>
      <div onClick={(e)=>e.stopPropagation()} className="w-full rounded-2xl overflow-hidden flex flex-col" style={{ maxWidth:520, maxHeight:'86vh', background:'var(--surface)', border:'1px solid var(--line)', boxShadow:'0 24px 60px -18px rgba(0,0,0,.5)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid var(--line)' }}>
          <div className="min-w-0"><div className="font-bold t1 truncate">{title || 'Record'}</div>{subtitle && <div className="text-xs t3 truncate">{subtitle}</div>}</div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center t3 flex-shrink-0" style={{ background:'var(--surface2)' }} aria-label="Close"><Icon name="xmark"/></button>
        </div>
        <div className="px-5 py-1 overflow-y-auto">
          {entries.length ? entries.map(([k, v]) => <AuditField key={k} k={k} v={v} />) : <div className="py-6 text-center t3">No details.</div>}
        </div>
        <div className="px-5 py-3 text-[11px] t3" style={{ borderTop:'1px solid var(--line)' }}><Icon name="lock" className="mr-1"/> Confidential · staff audit view</div>
      </div>
    </div>
  );
}

/* ============ ANALYTICS OVERVIEW ============ */
const OVERVIEW_FALLBACK = { kpis:KPIS, gmvTrend:GMV_TREND, subMix:SUB_MIX, funnel:FUNNEL };
export function Analytics(){
  const { data, live } = useStaffResource(fetchOverview, OVERVIEW_FALLBACK);
  const kpis = data.kpis || KPIS;
  const gmv = data.gmvTrend || GMV_TREND;
  const subMix = data.subMix || SUB_MIX;
  const funnel = data.funnel || FUNNEL;
  const max = Math.max(...gmv.map(d=>d.v), 1);
  return (<div className="fadeup space-y-6">
    <SectionHead icon="gauge-high" title="Platform overview" sub={live ? 'Live KPIs across the YoteMarket ecosystem' : 'Sample KPIs — connect the backend for live data'} />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map(k=><Stat key={k.label} {...k} delta={k.delta} deltaUp={k.up} />)}
    </div>
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-5"><h3 className="font-bold t1">GMV trend</h3><span className="text-xs t3">KSh millions · last 12 months</span></div>
        <div className="flex items-end gap-2 h-44">
          {gmv.map((d,i)=>(
            <div key={i} className="flex-1 h-full flex flex-col items-center gap-2">
              <div className="flex-1 w-full flex items-end">
                <div className="w-full rounded-t-md transition-all" style={{height:`${(d.v/max)*100}%`, background: i===gmv.length-1?'var(--pri)':'var(--pri-soft)', minHeight:6}} />
              </div>
              <span className="text-[10px] t3">{d.m}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-bold t1 mb-4">Subscription mix</h3>
        <div className="space-y-4">{subMix.map(s=>(
          <div key={s.plan}>
            <div className="flex justify-between text-sm mb-1.5"><span className="font-semibold t1">{s.plan}</span><span className="t3 num">{s.count} · {s.pct}%</span></div>
            <Bar pct={s.pct} color={s.color} />
          </div>))}</div>
        <div className="mt-5 pt-4" style={{borderTop:'1px solid var(--line)'}}>
          <div className="text-sm t3">Total active subscriptions</div>
          <div className="text-2xl font-bold t1 num">{subMix.reduce((a,s)=>a+s.count,0).toLocaleString()}</div>
        </div>
      </Card>
    </div>
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="font-bold t1 mb-4">Merchant activation funnel</h3>
        <div className="space-y-3">{funnel.map((f,i)=>{ const pct=(f.v/funnel[0].v)*100; return (
          <div key={f.stage}>
            <div className="flex justify-between text-sm mb-1.5"><span className="t2">{f.stage}</span><span className="num font-semibold t1">{f.v.toLocaleString()}</span></div>
            <Bar pct={pct} color={`color-mix(in srgb, var(--pri) ${100-i*16}%, var(--green))`} />
          </div>); })}</div>
      </Card>
      <Card className="p-6">
        <h3 className="font-bold t1 mb-4">Operational health</h3>
        <div className="grid grid-cols-2 gap-4">
          <Mini label="Route completion" v="96.2%" tone="green" icon="route" />
          <Mini label="Avg drops / run" v="6.4" tone="pri" icon="layer-group" />
          <Mini label="Merchant retention" v="91%" tone="blue" icon="repeat" />
          <Mini label="Insurance claims" v="0.4%" tone="amber" icon="shield-halved" />
        </div>
      </Card>
    </div>
  </div>);
}
function Mini({ label, v, tone, icon }){
  const tones={green:['var(--green-bg)','var(--green)'],pri:['var(--pri-soft)','var(--pri)'],blue:['var(--blue-bg)','var(--blue)'],amber:['var(--amber-bg)','var(--amber)']};
  const c=tones[tone];
  return (<div className="rounded-xl p-4" style={{background:'var(--surface2)'}}>
    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{background:c[0],color:c[1]}}><Icon name={icon}/></div>
    <div className="text-xl font-bold t1 num">{v}</div><div className="text-xs t3">{label}</div></div>);
}

/* ============ MERCHANT VERIFICATION & OVERSIGHT ============ */
export function Approvals({ isAdmin }){
  const { data, live } = useStaffResource(()=>fetchMerchants('all'), MERCHANTS);
  const [rows,setRows] = useSS(null);
  useES(()=>{ setRows(data); }, [data]);
  const [filter,setFilter] = useSS('pending');
  const list = rows || [];

  const apply = async (id, action, nextStatus) => {
    const prev = list.find(r=>r.id===id)?.status;
    setRows(rs=>(rs||[]).map(r=>r.id===id?{...r,status:nextStatus,_busy:true}:r));
    try { await setMerchantStatus(id, action); }
    catch { setRows(rs=>(rs||[]).map(r=>r.id===id?{...r,status:prev}:r)); }
    finally { setRows(rs=>(rs||[]).map(r=>r.id===id?{...r,_busy:false}:r)); }
  };

  // Flagship pick — shows as a circle-logo on the storefront's Featured stores row.
  const toggleFeature = async (m) => {
    const next = !m.featured;
    setRows(rs=>(rs||[]).map(r=>r.id===m.id?{...r,featured:next,_busy:true}:r));
    try { await setMerchantStatus(m.id, next?'feature':'unfeature'); }
    catch { setRows(rs=>(rs||[]).map(r=>r.id===m.id?{...r,featured:!next}:r)); }
    finally { setRows(rs=>(rs||[]).map(r=>r.id===m.id?{...r,_busy:false}:r)); }
  };

  // Manual "Top brand" placement (staff override) — the storefront Top-brands rail.
  // Effective topBrand = this staff toggle OR an active Enterprise subscription.
  const toggleTopBrand = async (m) => {
    if (m.enterprise && m.topBrand) { window.alert('This store is on Enterprise, which already grants Top-brand placement. Deactivate Enterprise to remove it.'); return; }
    const next = !m.topBrand;
    setRows(rs=>(rs||[]).map(r=>r.id===m.id?{...r,topBrand:next,topBrandStaff:next,_busy:true}:r));
    try { await setMerchantStatus(m.id, next?'topbrand':'untopbrand'); }
    catch { setRows(rs=>(rs||[]).map(r=>r.id===m.id?{...r,topBrand:!next,topBrandStaff:!next}:r)); }
    finally { setRows(rs=>(rs||[]).map(r=>r.id===m.id?{...r,_busy:false}:r)); }
  };

  // Enterprise activation modal (quote-based; price grounded in per-package-per-km).
  const [entFor, setEntFor] = useSS(null);
  const [auditM, setAuditM] = useSS(null); // click a store to inspect its full record
  const onEnterpriseDone = (m, patch) => setRows(rs=>(rs||[]).map(r=>r.id===m.id?{...r,...patch}:r));

  // Store-closure requests (merchant asks to close → staff approve/reject).
  const { data: delReqs, reload: reloadDel } = useStaffResource(fetchDeletionRequests, []);
  const [delBusy, setDelBusy] = useSS(null);
  const resolveClosure = async (id, approve) => {
    if (approve && !window.confirm('Approve closure? This removes the store from the marketplace, closes the merchant account and ends the subscription.')) return;
    const note = approve ? '' : (window.prompt('Reason for declining (optional):') || '');
    setDelBusy(id);
    try { await resolveDeletionRequest(id, approve, note); reloadDel(); }
    catch (e) { window.alert(e.message || 'Could not resolve.'); }
    finally { setDelBusy(null); }
  };
  const pendingClosures = (delReqs || []).filter(r=>r.status==='pending');

  const isPending = s => s==='pending' || s==='review';
  const shown = list.filter(r=> filter==='all' || (filter==='pending' ? isPending(r.status) : r.status===filter));
  const count = s => list.filter(r=> s==='pending' ? isPending(r.status) : r.status===s).length;

  return (<div className="fadeup space-y-6">
    <SectionHead icon="user-check" title="Merchant verification & oversight" sub={live ? 'Verify KYC + storefront readiness; suspend stores that breach policy' : 'Sample queue — connect the backend for live stores'}
      action={<Seg value={filter} onChange={setFilter} options={['pending','verified','suspended','all']} fmt={o=>o[0].toUpperCase()+o.slice(1)} />} />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Awaiting verification" value={count('pending')} icon="hourglass-half" tone="amber" />
      <Stat label="Verified" value={count('verified')} icon="circle-check" tone="green" />
      <Stat label="Suspended" value={count('suspended')} icon="ban" tone="red" />
      <Stat label="Total stores" value={list.length} icon="store" tone="pri" />
    </div>
    <div className="space-y-3">
      {shown.map(m=>{
        const ready = m.docs && m.items>=2 && m.socials>=3;
        const suspended = m.status==='suspended';
        const verified = m.status==='verified';
        return (<Card key={m.id} className="p-4" style={suspended?{opacity:.7}:null}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:'var(--pri-soft)',color:'var(--pri)'}}><Icon name="store"/></div>
            <div className="min-w-0 flex-1" onClick={()=>setAuditM(m)} style={{ cursor:'pointer' }} title="View full record (audit)">
              <div className="font-bold t1 flex items-center gap-2" style={{ textDecoration:'underline', textDecorationColor:'var(--line)', textUnderlineOffset:3 }}>{m.shop}
                {verified && <Pill tone="ok">Verified</Pill>}
                {suspended && <Pill tone="red">Suspended</Pill>}
                {m.featured && <Pill tone="blue">Featured</Pill>}
                {m.enterprise && <Pill tone="amber">Enterprise</Pill>}
                {m.topBrand && !m.enterprise && <Pill tone="amber">Top brand</Pill>}
              </div>
              <div className="text-xs t3">{m.owner}{m.county?` · ${m.county}`:''}{m.band?` · Band ${m.band}`:''}{m.plan?` · ${m.plan}`:''}{m.scout?` · scout ${m.scout}`:''}</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Chk ok={m.docs} label="KYC docs" />
              <Chk ok={m.items>=2} label={`${m.items||0} items`} />
              <Chk ok={m.socials>=3} label={`${m.socials||0} socials`} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {!verified && !suspended && <Btn kind="success" size="sm" icon="circle-check" onClick={()=>apply(m.id,'verify','verified')} disabled={m._busy} title={ready?'':'Readiness checklist incomplete'}>Verify</Btn>}
              {!suspended && <Btn kind={m.featured?'primary':'soft'} size="sm" icon="star" onClick={()=>toggleFeature(m)} disabled={m._busy} title="Show as a flagship store on the storefront home">{m.featured?'Featured':'Feature'}</Btn>}
              {!suspended && <Btn kind={m.enterprise?'primary':'soft'} size="sm" icon="crown" onClick={()=>setEntFor(m)} disabled={m._busy} title="Enterprise tier — all Pro features + high delivery allotment + Top-brand placement (quote-based, staff-activated)">{m.enterprise?'Enterprise':'Enterprise…'}</Btn>}
              {!suspended && <Btn kind={m.topBrand?'primary':'soft'} size="sm" icon="award" onClick={()=>toggleTopBrand(m)} disabled={m._busy} title="Manually place this store in the storefront Top-brands rail (independent of Enterprise)">Top brand</Btn>}
              {suspended
                ? <Btn kind="soft" size="sm" icon="rotate-left" onClick={()=>apply(m.id,'reinstate','verified')} disabled={m._busy}>Reinstate</Btn>
                : <Btn kind="danger" size="sm" icon="ban" onClick={()=>apply(m.id,'suspend','suspended')} disabled={m._busy}>Suspend</Btn>}
            </div>
          </div>
        </Card>);
      })}
      {shown.length===0 && <Card className="p-10 text-center t3"><Icon name="inbox" className="text-3xl mb-2"/><div>Nothing here.</div></Card>}
    </div>

    {pendingClosures.length > 0 && (
      <div className="space-y-3">
        <h3 className="font-bold t1 flex items-center gap-2">Store-closure requests <span className="num text-xs text-white rounded-full px-2 py-0.5" style={{background:'var(--red)'}}>{pendingClosures.length}</span></h3>
        {pendingClosures.map(r=>(
          <Card key={r.id} className="p-4" style={{border:'1px solid var(--red)'}}>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:'rgba(239,68,68,.12)',color:'var(--red)'}}><Icon name="store-slash"/></div>
              <div className="min-w-0 flex-1">
                <div className="font-bold t1">{r.storeName || r.storeId}</div>
                <div className="text-xs t3">{r.reason ? `“${r.reason}”` : 'No reason given'}{r.createdAt?` · ${new Date(r.createdAt).toLocaleDateString('en-KE',{ day:'numeric', month:'short' })}`:''}</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Btn kind="soft" size="sm" icon="xmark" onClick={()=>resolveClosure(r.id,false)} disabled={delBusy===r.id}>Decline</Btn>
                <Btn kind="danger" size="sm" icon="trash" onClick={()=>resolveClosure(r.id,true)} disabled={delBusy===r.id}>{delBusy===r.id?'Working…':'Approve closure'}</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )}

    {entFor && <EnterpriseModal m={entFor} onClose={()=>setEntFor(null)} onDone={onEnterpriseDone} />}
    {auditM && <RecordAudit title={auditM.shop} subtitle={`${auditM.owner || ''}${auditM.county ? ` · ${auditM.county}` : ''}`} record={auditM} onClose={()=>setAuditM(null)} />}
  </div>);
}
function Chk({ ok, label }){
  return <span className="pill" style={{background: ok?'var(--green-bg)':'var(--surface2)', color: ok?'var(--green-fg)':'var(--t3)'}}><Icon name={ok?'check':'minus'}/>{label}</span>;
}

/* Enterprise activation — quote-based. The monthly price is GROUNDED in the delivery
   unit economics (price per package, per package per km) from the live rate card; the
   server recomputes authoritatively on activate. Staff-only surface. */
function EnterpriseModal({ m, onClose, onDone }){
  const [card, setCard] = useSS(null);      // rate card rows (per delivery sub-tier)
  const [err, setErr] = useSS(null);
  const [subTier, setSubTier] = useSS('a05');
  const [packages, setPackages] = useSS(150);
  const [disc, setDisc] = useSS(0);
  const [busy, setBusy] = useSS(false);

  useES(() => { let live=true; enterpriseQuote().then(d=>{ if(live) setCard(d.rateCard); }).catch(e=>{ if(live) setErr(e.message||'Could not load rate card'); }); return ()=>{ live=false; }; }, []);

  const row = (card||[]).find(r=>r.subTier===subTier) || (card||[])[0];
  const pkgs = Math.max(1, Math.round(Number(packages)||0));
  const d = Math.min(90, Math.max(0, Number(disc)||0));
  const gross = row ? row.perPackage * pkgs : 0;
  const monthly = Math.round(gross * (1 - d/100));

  const activate = async () => {
    setBusy(true);
    try { const r = await setEnterprise(m.id, true, { subTier, packages: pkgs, discountPct: d });
      onDone(m, { enterprise:true, topBrand:true, plan:'Enterprise' });
      onClose(); void r;
    } catch (e) { setErr(e.message||'Activation failed'); setBusy(false); }
  };
  const deactivate = async () => {
    if (!window.confirm(`Deactivate Enterprise for ${m.shop}? Top-brand placement is removed (unless a manual Top-brand override is set).`)) return;
    setBusy(true);
    try { await setEnterprise(m.id, false); onDone(m, { enterprise:false, topBrand: !!m.topBrandStaff, plan:'' }); onClose(); }
    catch (e) { setErr(e.message||'Could not deactivate'); setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(8,10,24,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} className="card" style={{ width:'100%', maxWidth:560, maxHeight:'88vh', overflowY:'auto', padding:22 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'rgba(245,181,48,.16)', color:'var(--amber, #f4b530)' }}><Icon name="crown"/></div>
          <div className="min-w-0 flex-1"><div className="font-bold t1">Enterprise · {m.shop}</div><div className="text-xs t3">All Pro features + high delivery allotment + Top-brand placement</div></div>
          <Btn kind="soft" size="sm" icon="xmark" onClick={onClose}>Close</Btn>
        </div>

        {err && <div className="text-xs mt-2 mb-1" style={{ color:'var(--red)' }}>{err}</div>}

        {m.enterprise ? (
          <div className="mt-3 space-y-3">
            <Pill tone="amber">Currently on Enterprise</Pill>
            <p className="text-xs t3">This store already has an active Enterprise subscription and Top-brand placement. You can deactivate it below.</p>
            <Btn kind="danger" size="sm" icon={busy?'spinner':'ban'} onClick={deactivate} disabled={busy}>{busy?'Working…':'Deactivate Enterprise'}</Btn>
          </div>
        ) : !card ? (
          <div className="text-xs t3 mt-4">Loading unit-economics rate card…</div>
        ) : (
          <div className="mt-3">
            <div className="text-xs t3 mb-2">Price is grounded in the delivery unit economics — <b>price per package per kilometre</b> — from the live rate card. Pick the merchant's distance band + monthly package volume; the server recomputes the exact price on activate.</div>

            {/* Rate card */}
            <div style={{ overflowX:'auto', border:'1px solid var(--line)', borderRadius:12, marginBottom:16 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5, whiteSpace:'nowrap' }}>
                <thead><tr style={{ textAlign:'left', color:'var(--t3)' }}>
                  <th style={{ padding:'8px 10px' }}>Band · range</th><th style={{ padding:'8px 10px', textAlign:'right' }}>Ksh / package</th><th style={{ padding:'8px 10px', textAlign:'right' }}>Ksh / pkg / km</th>
                </tr></thead>
                <tbody>
                  {card.map(r=>(
                    <tr key={r.subTier} onClick={()=>setSubTier(r.subTier)} style={{ cursor:'pointer', borderTop:'1px solid var(--line)', background: r.subTier===subTier?'var(--pri-soft)':'transparent' }}>
                      <td style={{ padding:'8px 10px' }}><b>{r.band}</b> · {r.range}</td>
                      <td style={{ padding:'8px 10px', textAlign:'right' }}>{kes(r.perPackage)}</td>
                      <td style={{ padding:'8px 10px', textAlign:'right' }}>{kes(r.perPackagePerKm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs t3">Distance band
                <select value={subTier} onChange={e=>setSubTier(e.target.value)} style={inputStyle}>
                  {card.map(r=><option key={r.subTier} value={r.subTier}>{r.band} · {r.range}</option>)}
                </select>
              </label>
              <label className="text-xs t3">Packages / month
                <input type="number" min="1" value={packages} onChange={e=>setPackages(e.target.value)} style={inputStyle} />
              </label>
              <label className="text-xs t3">Volume discount %
                <input type="number" min="0" max="90" value={disc} onChange={e=>setDisc(e.target.value)} style={inputStyle} />
              </label>
              <div className="text-xs t3">Delivery allotment<div className="font-bold t1 mt-1" style={{ fontSize:15 }}>{pkgs} / month</div></div>
            </div>

            {/* Quote breakdown */}
            <div className="mt-4 p-3 rounded-xl" style={{ background:'var(--surface2)' }}>
              <div className="flex items-center justify-between text-xs t2"><span>{row?`${kes(row.perPackage)}/pkg × ${pkgs} pkgs`:''}</span><span>{kes(gross)}</span></div>
              {d>0 && <div className="flex items-center justify-between text-xs t2 mt-1"><span>Volume discount ({d}%)</span><span style={{ color:'var(--red)' }}>−{kes(gross-monthly)}</span></div>}
              <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop:'1px solid var(--line)' }}><span className="font-bold t1">Monthly</span><span className="font-bold t1" style={{ fontSize:18 }}>{kes(monthly)}</span></div>
              <div className="text-xs t3 mt-1">{row?`Unit economics: ${kes(row.perPackagePerKm)} per package per km · ${row.km} km billed`:''}</div>
            </div>

            <div className="flex gap-2 mt-4">
              <Btn kind="primary" size="sm" icon={busy?'spinner':'crown'} onClick={activate} disabled={busy}>{busy?'Activating…':`Activate · ${kes(monthly)}/mo`}</Btn>
              <Btn kind="soft" size="sm" onClick={onClose} disabled={busy}>Cancel</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
const inputStyle = { display:'block', width:'100%', marginTop:5, padding:'8px 10px', borderRadius:10, border:'1px solid var(--line)', background:'var(--surface)', color:'var(--t1)', fontSize:14, fontFamily:'inherit' };

/* ============ MARKETER APPLICATIONS (hiring funnel) ============ */
const STAGES = ['New','Review','Shortlist','Interview'];
const NEXT_STAGE = { New:'Review', Review:'Shortlist', Shortlist:'Interview', Interview:'active' };
export function Applications(){
  const { data, live } = useStaffResource(fetchMarketers, { applicants: APPLICANTS, scouts: [] });
  const [rows, setRows] = useSS(null);
  useES(()=>{ setRows(data.applicants || []); }, [data]);
  const list = rows || [];
  const byStage = s => list.filter(a=>a.stage===s);

  const move = async (a, stage) => {
    setRows(rs => {
      const rest = (rs||[]).filter(r=>r.id!==a.id);
      return (stage==='active' || stage==='rejected') ? rest : [...rest, { ...a, stage }];
    });
    try { await setMarketerStage(a.id, stage); }
    catch { setRows(rs => [...(rs||[]).filter(r=>r.id!==a.id), a]); }
  };

  return (<div className="fadeup space-y-6">
    <SectionHead icon="briefcase" title="Marketer applications" sub={live ? 'The hiring funnel — advance scouts through to active' : 'Sample funnel — connect the backend for live applicants'} />
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
      {STAGES.map(stage=>(
        <div key={stage} className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="font-bold t1 text-sm">{stage}</span>
            <span className="num text-xs t3 rounded-full px-2 py-0.5" style={{background:'var(--surface2)'}}>{byStage(stage).length}</span>
          </div>
          {byStage(stage).map(a=>(
            <Card key={a.id} className="p-4">
              <div className="flex items-center gap-3">
                <Avatar src={a.photo} name={a.name} size={40} />
                <div className="min-w-0 flex-1"><div className="font-semibold t1 text-sm truncate">{a.name}</div><div className="text-xs t3">{a.county}</div></div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3" style={{borderTop:'1px solid var(--line)'}}>
                <div><div className="num font-bold t1">{a.verified||0}</div><div className="text-[10px] t3 uppercase">verified</div></div>
                <span className="text-xs t3 num">{a.applied}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Btn kind="primary" size="sm" className="flex-1" disabled={a._busy} onClick={()=>move(a, NEXT_STAGE[stage])}>{stage==='Interview'?'Activate':'Advance'}</Btn>
                <Btn kind="ghost" size="sm" disabled={a._busy} onClick={()=>move(a,'rejected')} title="Reject"><Icon name="xmark"/></Btn>
              </div>
            </Card>
          ))}
          {byStage(stage).length===0 && <div className="text-xs t3 px-1 py-4 text-center">—</div>}
        </div>
      ))}
    </div>
  </div>);
}

/* ============ SCOUTS + PAYOUT APPROVALS ============ */
const socialProfileUrl = (platform, handle) => {
  const h = String(handle || '').replace(/^@+/, '');
  if (platform === 'tiktok') return `https://www.tiktok.com/@${h}`;
  if (platform === 'instagram') return `https://www.instagram.com/${h}`;
  if (platform === 'facebook') return `https://www.facebook.com/${h}`;
  if (platform === 'linkedin') return `https://www.linkedin.com/in/${h}`;
  return null;
};

export function Scouts({ isAdmin }){
  const { data: scoutData, live } = useStaffResource(fetchMarketers, { applicants: [], scouts: SCOUTS });
  const { data: payoutData } = useStaffResource(fetchPayouts, PAYOUT_REQUESTS);
  const { data: follows, reload: reloadFollows } = useStaffResource(fetchMerchantFollows, []);
  const scouts = scoutData.scouts || [];
  const followList = follows || [];
  const [reqs,setReqs] = useSS(null);
  const [snapMsg,setSnapMsg] = useSS('');
  const [auditS, setAuditS] = useSS(null); // click a scout to inspect its full record
  useES(()=>{ setReqs(payoutData); }, [payoutData]);
  const list = reqs || [];

  const resolve = async (id, action) => {
    const prev = list;
    setReqs(rs=>(rs||[]).filter(r=>r.id!==id));
    try { await resolvePayout(id, action); }
    catch { setReqs(prev); }
  };
  const resolveFollow = async (id, approve) => {
    const reason = approve ? '' : (window.prompt('Reason for rejecting (optional):') || '');
    try { await resolveMerchantFollow(id, approve, reason); reloadFollows(); }
    catch (e) { window.alert(e.message || 'Could not resolve.'); }
  };
  const snapshot = async () => {
    if (!window.confirm("Snapshot every active scout's current balance as a protected floor? Run once at the activation-pay cutover. Safe to re-run.")) return;
    try { const r = await snapshotScoutFloors(); setSnapMsg(`Floors snapshotted for ${r.updated} scout(s).`); }
    catch (e) { setSnapMsg(e.message || 'Snapshot failed.'); }
  };

  return (<div className="fadeup space-y-6">
    <SectionHead icon="people-group" title="Scout management" sub={live ? 'Approve payouts, verify merchant-follow proofs, monitor performance' : 'Sample data — connect the backend for live scouts'} />

    {isAdmin && <Card className="p-4 flex flex-wrap items-center gap-3">
      <div className="flex-1" style={{minWidth:220}}>
        <div className="font-bold t1 text-sm">Activation-pay cutover</div>
        <div className="text-xs t3">Snapshot current balances as floors so no scout drops when pay switches to first-paid-sale. Run once.</div>
      </div>
      {snapMsg && <span className="text-xs t2">{snapMsg}</span>}
      <Btn kind="soft" size="sm" icon="floppy-disk" onClick={snapshot}>Snapshot floors</Btn>
    </Card>}

    <div className="grid lg:grid-cols-5 gap-6">
      {/* payout approvals */}
      <div className="lg:col-span-2 space-y-3">
        <h3 className="font-bold t1 flex items-center gap-2">Payout requests {list.length>0 && <span className="num text-xs text-white rounded-full px-2 py-0.5" style={{background:'var(--amber)'}}>{list.length}</span>}</h3>
        {list.map(r=>(
          <Card key={r.id} className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar src={r.photo} name={r.scout} size={38} />
              <div className="flex-1 min-w-0"><div className="font-semibold t1 text-sm">{r.scout}</div><div className="text-xs t3 num">{r.phone}{r.date?` · ${r.date}`:''}</div></div>
              <div className="num font-bold t1">{kes(r.amount)}</div>
            </div>
            <div className="flex gap-2">
              <Btn kind="success" size="sm" className="flex-1" icon="mobile-alt" onClick={()=>resolve(r.id,'approve')}>Approve &amp; send</Btn>
              <Btn kind="soft" size="sm" onClick={()=>resolve(r.id,'hold')}>Hold</Btn>
            </div>
          </Card>
        ))}
        {list.length===0 && <Card className="p-8 text-center t3"><Icon name="circle-check" className="text-2xl mb-2" style={{color:'var(--green)'}}/><div>All payouts cleared.</div></Card>}
      </div>
      {/* scout table */}
      <Card className="p-0 overflow-hidden lg:col-span-3">
        <h3 className="font-bold t1 p-5 pb-3">Top scouts</h3>
        <div className="overflow-x-auto no-bar"><table className="w-full text-sm" style={{minWidth:480}}>
          <thead><tr className="t3" style={{textAlign:'left',background:'var(--surface2)'}}>
            <th className="px-5 py-2.5 font-semibold">Scout</th><th className="px-4 py-2.5 font-semibold text-right">Referred</th>
            <th className="px-4 py-2.5 font-semibold text-right">Activated</th>
            <th className="px-4 py-2.5 font-semibold text-right">Balance</th><th className="px-5 py-2.5 font-semibold text-right">Pending</th>
          </tr></thead>
          <tbody>{scouts.map(s=>(
            <tr key={s.id} onClick={()=>setAuditS(s)} style={{borderTop:'1px solid var(--line)', cursor:'pointer'}} title="View full record (audit)">
              <td className="px-5 py-3"><div className="flex items-center gap-2.5"><Avatar src={s.photo} name={s.name} size={30}/><div><div className="font-semibold t1">{s.name}</div><div className="text-xs t3">{s.county}</div></div></div></td>
              <td className="px-4 py-3 text-right num t2">{s.referred ?? '—'}</td>
              <td className="px-4 py-3 text-right num font-semibold t1">{s.verified}</td>
              <td className="px-4 py-3 text-right num t2">{kes(s.balance)}</td>
              <td className="px-5 py-3 text-right num" style={{color: s.pending>0?'var(--amber)':'var(--t3)'}}>{s.pending>0?kes(s.pending):'—'}</td>
            </tr>))}
            {scouts.length===0 && <tr><td colSpan={5} className="px-5 py-8 text-center t3">No active scouts yet.</td></tr>}</tbody>
        </table></div>
      </Card>
    </div>

    {/* merchant-follow verification queue */}
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3 flex-wrap gap-2">
        <h3 className="font-bold t1 flex items-center gap-2">Merchant-follow proofs {followList.length>0 && <span className="num text-xs text-white rounded-full px-2 py-0.5" style={{background:'var(--amber)'}}>{followList.length}</span>}</h3>
        <span className="text-xs t3">Open the handle, confirm they follow us, then approve to credit the scout.</span>
      </div>
      {followList.length===0
        ? <div className="p-8 text-center t3"><Icon name="circle-check" className="text-2xl mb-2" style={{color:'var(--green)'}}/><div>No follow proofs waiting.</div></div>
        : <div className="overflow-x-auto no-bar"><table className="w-full text-sm" style={{minWidth:600}}>
            <thead><tr className="t3" style={{textAlign:'left',background:'var(--surface2)'}}>
              <th className="px-5 py-2.5 font-semibold">Merchant</th><th className="px-4 py-2.5 font-semibold">Platform</th>
              <th className="px-4 py-2.5 font-semibold">Handle</th><th className="px-4 py-2.5 font-semibold text-right">Reward</th>
              <th className="px-5 py-2.5 font-semibold text-right">Verify</th>
            </tr></thead>
            <tbody>{followList.map(f=>{
              const url = socialProfileUrl(f.platform, f.handle);
              return (
              <tr key={f.id} style={{borderTop:'1px solid var(--line)'}}>
                <td className="px-5 py-3"><div className="font-semibold t1">{f.storeName}</div><div className="text-xs t3">{f.date}</div></td>
                <td className="px-4 py-3 t2" style={{textTransform:'capitalize'}}>{f.platform}</td>
                <td className="px-4 py-3">{url
                  ? <a href={url} target="_blank" rel="noreferrer" className="accent font-semibold">@{String(f.handle).replace(/^@+/,'')} <Icon name="arrow-up-right-from-square" className="text-xs"/></a>
                  : <span className="t2">@{f.handle}</span>}</td>
                <td className="px-4 py-3 text-right num t2">{kes(f.reward)}</td>
                <td className="px-5 py-3"><div className="flex gap-2 justify-end">
                  <Btn kind="success" size="sm" icon="check" onClick={()=>resolveFollow(f.id,true)}>Approve</Btn>
                  <Btn kind="soft" size="sm" onClick={()=>resolveFollow(f.id,false)}>Reject</Btn>
                </div></td>
              </tr>);
            })}</tbody>
          </table></div>}
    </Card>
    {auditS && <RecordAudit title={auditS.name} subtitle={auditS.county} record={auditS} onClose={()=>setAuditS(null)} />}
  </div>);
}

/* ============ ORDERS & LOGISTICS ============ */
export function Logistics(){
  const { useState } = React;
  const { data, live, reload } = useStaffResource(fetchRuns, { runs:RUNS, fleet:FLEET });
  const runs = data.runs || RUNS;
  const fleet = data.fleet || FLEET;
  const tone = { in_transit:'blue', delivered:'ok', delayed:'red' };
  const label = { in_transit:'In transit', delivered:'Delivered', delayed:'Delayed' };
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const optimize = async () => {
    setBusy(true); setMsg(null);
    try { const r = await optimizeRuns(); setMsg({ ok:true, text:`Re-optimized ${r.updated} of ${r.runs} open run(s).` }); reload(); }
    catch (e) { setMsg({ ok:false, text:e.message || 'Optimize failed.' }); }
    finally { setBusy(false); }
  };
  return (<div className="fadeup space-y-6">
    <SectionHead icon="truck-fast" title="Orders & logistics" sub={live ? 'Live batched-run operations across all bands' : 'Sample runs — connect the backend for live operations'}
      action={<Btn kind="primary" size="sm" icon={busy?'spinner':'route'} onClick={optimize} disabled={busy}>{busy?'Optimizing…':'Optimize routes'}</Btn>} />
    {msg && <div className="text-sm flex items-center gap-2" style={{ color: msg.ok ? 'var(--green)' : 'var(--red)' }}><Icon name={msg.ok ? 'circle-check' : 'circle-exclamation'} />{msg.text}</div>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Runs in transit" value={runs.filter(r=>r.status==='in_transit').length} icon="motorcycle" tone="blue" />
      <Stat label="Delivered today" value={runs.filter(r=>r.status==='delivered').length} icon="box-open" tone="green" />
      <Stat label="Delayed" value={runs.filter(r=>r.status==='delayed').length} icon="triangle-exclamation" tone="red" />
      <Stat label="Active fleet" value={fleet.reduce((a,f)=>a+f.active,0)} icon="truck" tone="pri" />
    </div>
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="p-0 overflow-hidden lg:col-span-2">
        <h3 className="font-bold t1 p-5 pb-3">Active runs</h3>
        <div className="overflow-x-auto no-bar"><table className="w-full text-sm" style={{minWidth:620}}>
          <thead><tr className="t3" style={{textAlign:'left',background:'var(--surface2)'}}>
            {['Run','Band','Rider','Drops','Distance','ETA','Status'].map(h=><th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>{runs.map(r=>(
            <tr key={r.id} style={{borderTop:'1px solid var(--line)'}}>
              <td className="px-4 py-3 num font-semibold t1">{r.id}</td>
              <td className="px-4 py-3"><span className="pill pill-blue">{r.band}</span></td>
              <td className="px-4 py-3 t2">{r.rider}<div className="text-xs t3">{r.vehicle}</div></td>
              <td className="px-4 py-3 num t1">{r.drops}</td>
              <td className="px-4 py-3 num t2">{r.dist}</td>
              <td className="px-4 py-3 num t2">{r.eta}</td>
              <td className="px-4 py-3"><Pill tone={tone[r.status]}>{label[r.status]}</Pill></td>
            </tr>))}</tbody>
        </table></div>
      </Card>
      <Card className="p-6">
        <h3 className="font-bold t1 mb-4">Fleet by band</h3>
        <div className="space-y-4">{fleet.map(f=>{ const total=f.active+f.idle; return (
          <div key={f.band}>
            <div className="flex justify-between text-sm mb-1.5"><span className="font-semibold t1">Band {f.band} · {f.label.split('·')[1]}</span><span className="num t3">{f.active}/{total}</span></div>
            <Bar pct={(f.active/total)*100} color="var(--green)" />
            <div className="text-xs t3 mt-1">{f.active} active · {f.idle} idle</div>
          </div>); })}</div>
      </Card>
    </div>
  </div>);
}

/* ============ SUBSCRIPTIONS & WALLET ============ */
export function Wallet(){
  const { data, live } = useStaffResource(fetchSubscriptions, { subscriptions:SUBSCRIPTIONS, wallet:WALLET });
  const wallet = data.wallet || WALLET;
  const subs = data.subscriptions || SUBSCRIPTIONS;
  const tone = { active:'ok', overdue:'red' };
  return (<div className="fadeup space-y-6">
    <SectionHead icon="wallet" title="Subscriptions & wallet" sub={live ? 'Platform float, M-Pesa settlement, and merchant billing oversight' : 'Sample billing — connect the backend for live subscriptions'} />
    <PayoutChangeReview />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Platform float" value={wallet.float} icon="vault" tone="pri" />
      <Stat label="M-Pesa settled today" value={wallet.mpesaToday} icon="mobile-alt" tone="green" />
      <Stat label="Pending payouts" value={wallet.pendingPayouts} icon="hourglass-half" tone="amber" />
      <Stat label="Badge insurance fund" value={wallet.badgeFund} icon="shield-halved" tone="blue" />
    </div>
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3"><h3 className="font-bold t1">Merchant subscriptions</h3><Btn kind="soft" size="sm" icon="download">Export</Btn></div>
      <div className="overflow-x-auto no-bar"><table className="w-full text-sm" style={{minWidth:600}}>
        <thead><tr className="t3" style={{textAlign:'left',background:'var(--surface2)'}}>
          {['Shop','Plan','Band','Amount','Next billing','Status'].map(h=><th key={h} className="px-5 py-2.5 font-semibold">{h}</th>)}
        </tr></thead>
        <tbody>{subs.map(s=>(
          <tr key={s.id} style={{borderTop:'1px solid var(--line)'}}>
            <td className="px-5 py-3 font-semibold t1">{s.shop}</td>
            <td className="px-5 py-3 t2">{s.plan}</td>
            <td className="px-5 py-3 t3">{s.band}</td>
            <td className="px-5 py-3 num t1">{kes(s.amount)}<span className="text-xs t3">/mo</span></td>
            <td className="px-5 py-3 num" style={{color: s.status==='overdue'?'var(--red)':'var(--t2)'}}>{s.next}</td>
            <td className="px-5 py-3"><Pill tone={tone[s.status]}>{s.status}</Pill></td>
          </tr>))}</tbody>
      </table></div>
    </Card>
  </div>);
}

/* ============ CHAT MODERATION (reports → transcript → block) ============ */
const REPORTS_DEMO = [
  { id:'r1', convId:'s3__demo-shopper', reason:'Abusive language', reporterName:'Wanjiru K.', reportedName:'Kipenzi Fashion House', at:'2h ago', status:'open', conversationStatus:'active' },
  { id:'r2', convId:'s1__demo-shopper', reason:'Suspected scam / off-platform payment', reporterName:'Otieno M.', reportedName:'Wanjiku Electronics', at:'5h ago', status:'open', conversationStatus:'active' },
];

export function Moderation(){
  const { data, live } = useStaffResource(fetchReports, REPORTS_DEMO);
  const [rows, setRows] = useSS(null);
  useES(()=>{ setRows(data); }, [data]);
  const list = rows || [];
  const [view, setView] = useSS(null); // { convId, loading, conversation, messages, error }

  const openTranscript = async (convId) => {
    setView({ convId, loading:true });
    try { const t = await fetchTranscript(convId); setView({ convId, loading:false, ...t }); }
    catch (e) { setView({ convId, loading:false, error: e.message || 'Could not load transcript.' }); }
  };

  const block = async (convId, blocked) => {
    setRows(rs=>(rs||[]).map(r=>r.convId===convId?{...r, conversationStatus: blocked?'blocked':'active', _busy:true}:r));
    try { await moderateConversation(convId, blocked?'blocked':'active', 'staff moderation'); }
    catch { setRows(rs=>(rs||[]).map(r=>r.convId===convId?{...r, conversationStatus: blocked?'active':'blocked'}:r)); }
    finally { setRows(rs=>(rs||[]).map(r=>r.convId===convId?{...r,_busy:false}:r)); }
  };

  const resolve = async (id, action) => {
    const prev = list;
    setRows(rs=>(rs||[]).filter(r=>r.id!==id));
    try { await resolveReport(id, action); }
    catch { setRows(prev); }
  };

  return (<div className="fadeup space-y-6">
    <SectionHead icon="comment-slash" title="Chat moderation" sub={live ? 'Reported conversations — read the transcript, then block or dismiss' : 'Sample reports — connect the backend for live moderation'} />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Open reports" value={list.filter(r=>r.status!=='resolved').length} icon="flag" tone="amber" />
      <Stat label="Blocked threads" value={list.filter(r=>r.conversationStatus==='blocked').length} icon="ban" tone="red" />
      <Stat label="Reports today" value={list.length} icon="inbox" tone="pri" />
      <Stat label="Avg response" value="18m" icon="clock" tone="green" />
    </div>
    <div className="space-y-3">
      {list.map(r=>{
        const blocked = r.conversationStatus==='blocked';
        return (<Card key={r.id} className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:'var(--red-bg)',color:'var(--red)'}}><Icon name="flag"/></div>
            <div className="min-w-0 flex-1">
              <div className="font-bold t1 flex items-center gap-2">{r.reason}{blocked && <Pill tone="red">Blocked</Pill>}</div>
              <div className="text-xs t3">{r.reporterName} reported {r.reportedName}{r.at?` · ${r.at}`:''}</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Btn kind="soft" size="sm" icon="eye" onClick={()=>openTranscript(r.convId)}>Transcript</Btn>
              {blocked
                ? <Btn kind="soft" size="sm" icon="rotate-left" onClick={()=>block(r.convId,false)} disabled={r._busy}>Unblock</Btn>
                : <Btn kind="danger" size="sm" icon="ban" onClick={()=>block(r.convId,true)} disabled={r._busy}>Block thread</Btn>}
              <Btn kind="ghost" size="sm" icon="check" onClick={()=>resolve(r.id,'dismiss')}>Dismiss</Btn>
            </div>
          </div>
        </Card>);
      })}
      {list.length===0 && <Card className="p-10 text-center t3"><Icon name="circle-check" className="text-3xl mb-2" style={{color:'var(--green)'}}/><div>No open reports — all clear.</div></Card>}
    </div>
    {view && <TranscriptModal view={view} onClose={()=>setView(null)} />}
  </div>);
}

/* ============ REVIEW MODERATION (fraud/abuse reports → remove or dismiss) ====== */
const REVIEW_REPORTS_DEMO = [
  { id:'rr1', reviewId:'p1_x', productId:'p1', storeId:'s1', reviewText:'Terrible, do not buy from here!!! scam', reviewRating:1, reporterName:'Merchant', reason:'Suspected competitor / fake review', at:'1h ago', status:'open' },
  { id:'rr2', reviewId:'p4_y', productId:'p4', storeId:'s3', reviewText:'visit mysite dot com for cheaper', reviewRating:2, reporterName:'Shopper', reason:'Spam / off-platform link', at:'3h ago', status:'open' },
];

export function ReviewModeration(){
  const { data, live } = useStaffResource(fetchReviewReports, REVIEW_REPORTS_DEMO);
  const [rows, setRows] = useSS(null);
  useES(()=>{ setRows(data); }, [data]);
  const list = rows || [];

  const act = async (id, fn, ...args) => {
    const prev = list;
    setRows(rs=>(rs||[]).filter(r=>r.id!==id));
    try { await fn(...args); } catch { setRows(prev); }
  };

  return (<div className="fadeup space-y-6">
    <SectionHead icon="star-half-stroke" title="Review moderation" sub={live ? 'Reported product reviews — remove fraud/abuse (ratings auto-correct) or dismiss' : 'Sample reports — connect the backend for live moderation'} />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Open reports" value={list.filter(r=>r.status!=='resolved').length} icon="flag" tone="amber" />
      <Stat label="Low-star flagged" value={list.filter(r=>(r.reviewRating||0)<=2).length} icon="star" tone="red" />
      <Stat label="Reports today" value={list.length} icon="inbox" tone="pri" />
      <Stat label="Protection" value="Verified" icon="shield-halved" tone="green" />
    </div>
    <div className="space-y-3">
      {list.map(r=>(
        <Card key={r.id} className="p-4">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:'var(--red-bg)',color:'var(--red)'}}><Icon name="flag"/></div>
            <div className="min-w-0 flex-1">
              <div className="font-bold t1 flex items-center gap-2">{r.reason}{r.reviewRating!=null && <Pill tone={r.reviewRating<=2?'red':'amber'}>{r.reviewRating}★</Pill>}</div>
              {r.reviewText && <div className="text-sm t2 mt-1 italic">“{r.reviewText}”</div>}
              <div className="text-xs t3 mt-1">Reported by {r.reporterName}{r.at?` · ${r.at}`:''}{r.productId?` · product ${r.productId}`:''}</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Btn kind="danger" size="sm" icon="trash" onClick={()=>act(r.id, removeReview, r.reviewId, 'staff moderation')}>Remove review</Btn>
              <Btn kind="ghost" size="sm" icon="check" onClick={()=>act(r.id, dismissReviewReport, r.id)}>Dismiss</Btn>
            </div>
          </div>
        </Card>
      ))}
      {list.length===0 && <Card className="p-10 text-center t3"><Icon name="circle-check" className="text-3xl mb-2" style={{color:'var(--green)'}}/><div>No open review reports — all clear.</div></Card>}
    </div>
  </div>);
}

function TranscriptModal({ view, onClose }){
  const fmt = (ms) => { try { return new Date(ms).toLocaleString('en-KE', { day:'numeric', month:'short', hour:'numeric', minute:'2-digit' }); } catch { return ''; } };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="absolute inset-0" style={{background:'rgba(8,12,24,.55)'}} />
      <div className="card relative w-full max-h-[80vh] flex flex-col" style={{maxWidth:560}}>
        <div className="flex items-center justify-between p-4" style={{borderBottom:'1px solid var(--line)'}}>
          <div className="font-bold t1 flex items-center gap-2"><Icon name="comments"/> Conversation transcript</div>
          <button onClick={onClose} className="w-8 h-8 t3" aria-label="Close"><Icon name="xmark"/></button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {view.loading && <div className="text-center t3 py-8"><Icon name="spinner" className="fa-spin text-xl"/></div>}
          {view.error && <div className="text-center py-8" style={{color:'var(--red)'}}>{view.error}</div>}
          {!view.loading && !view.error && (view.messages||[]).length===0 && <div className="text-center t3 py-8">No messages in this thread.</div>}
          {!view.loading && (view.messages||[]).map(m=>(
            <div key={m.id} className="rounded-lg p-3" style={{background:'var(--surface2)'}}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold t2 num">{m.senderId?.slice(0,8) || 'user'}…</span>
                <span className="text-[10px] t3">{m.at?fmt(m.at):''}</span>
              </div>
              <div className="text-sm t1">{m.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ TEAM & ROLES (admin only) ============ */
export function Team(){
  const [email, setEmail] = useSS('');
  const [role, setRole] = useSS('moderator');
  const [busy, setBusy] = useSS(false);
  const [msg, setMsg] = useSS(null); // { ok, text }

  const apply = async () => {
    const e = email.trim();
    if (!e || busy) return;
    setBusy(true); setMsg(null);
    try {
      const r = await setStaffRole(e, role);
      setMsg({ ok:true, text: role==='none' ? `${r.email} removed from staff.` : `${r.email} is now ${role}.` });
      setEmail('');
    } catch (ex) {
      setMsg({ ok:false, text: (ex && ex.message) || 'Could not update role.' });
    } finally { setBusy(false); }
  };

  return (<div className="fadeup space-y-6">
    <SectionHead icon="user-shield" title="Team & roles" sub="Grant or revoke staff access by email — admin only" />
    <Card className="p-6 space-y-4" style={{maxWidth:560}}>
      <div>
        <label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">Staff email</label>
        <input className="ym-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="person@yotemarket.com" />
        <div className="text-xs t3 mt-1.5">The person must have signed in to the app at least once.</div>
      </div>
      <div>
        <label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">Role</label>
        <Seg value={role} onChange={setRole} options={['admin','moderator','none']} fmt={o=> o==='none' ? 'Remove' : o[0].toUpperCase()+o.slice(1)} />
        <div className="text-xs t3 mt-1.5">{role==='admin' ? 'Full access incl. team management.' : role==='moderator' ? 'Console access incl. chat moderation; cannot manage the team.' : 'Revokes all staff access.'}</div>
      </div>
      {msg && <div className="text-sm flex items-center gap-2" style={{color: msg.ok?'var(--green)':'var(--red)'}}><Icon name={msg.ok?'circle-check':'circle-exclamation'}/>{msg.text}</div>}
      <Btn kind={role==='none'?'danger':'primary'} size="md" icon={busy?'spinner':(role==='none'?'user-minus':'user-check')} onClick={apply} disabled={busy}>{busy?'Applying…':(role==='none'?'Remove access':'Grant role')}</Btn>
    </Card>
    <Card className="p-5 flex items-start gap-3" style={{maxWidth:560,background:'var(--surface2)'}}>
      <Icon name="circle-info" style={{color:'var(--pri)'}}/>
      <div className="text-sm t2">Role changes take effect on the person’s next sign-in (or token refresh). Ask them to sign out and back in to the staff console.</div>
    </Card>
  </div>);
}

/* ============ MAINTENANCE (admin — one-off data/cleanup tools) ============ */
export function Maintenance(){
  const [cleanBusy, setCleanBusy] = useSS(false);
  const [cleanDone, setCleanDone] = useSS(null);
  const runCleanup = async () => {
    if (!window.confirm('Permanently delete the 18 seeded non-Google (@yotemarket.com) test accounts and their test stores/products? This cannot be undone. Google sign-in accounts are NOT affected.')) return;
    setCleanBusy(true);
    try { const r = await cleanupSeededTestAccounts(); setCleanDone(r?.counts || {}); }
    catch (e) { setCleanDone({ error: e.message || 'Cleanup failed' }); }
    finally { setCleanBusy(false); }
  };
  return (<div className="fadeup space-y-6">
    <SectionHead icon="screwdriver-wrench" title="Maintenance" sub="One-off data and cleanup operations — handle with care" />
    <Card className="p-5 flex items-start gap-3" style={{maxWidth:640,background:'var(--surface2)'}}>
      <Icon name="triangle-exclamation" style={{color:'var(--amber)'}}/>
      <div className="text-sm t2">These are destructive, irreversible operations reserved for admins. Double-check before running any of them.</div>
    </Card>
    <Card className="p-4" style={{maxWidth:640, border:'1px solid var(--red)'}}>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:'rgba(239,68,68,.12)',color:'var(--red)'}}><Icon name="user-slash"/></div>
        <div className="min-w-0 flex-1">
          <div className="font-bold t1">Delete seeded test accounts</div>
          <div className="text-xs t3">Removes the 18 non-Google (@yotemarket.com) seed accounts and their test stores/products. Google sign-in accounts are untouched.</div>
          {cleanDone && !cleanDone.error && <div className="text-xs mt-1" style={{color:'var(--green)'}}>Done — deleted {cleanDone.auth} accounts, {cleanDone.stores} stores, {cleanDone.products} products.</div>}
          {cleanDone && cleanDone.error && <div className="text-xs mt-1" style={{color:'var(--red)'}}>{cleanDone.error}</div>}
        </div>
        <Btn kind="danger" size="sm" icon={cleanBusy?'spinner':'trash'} onClick={runCleanup} disabled={cleanBusy || (cleanDone && !cleanDone.error)}>{cleanBusy?'Deleting…':((cleanDone && !cleanDone.error)?'Done':'Delete test accounts')}</Btn>
      </div>
    </Card>
  </div>);
}
