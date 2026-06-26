/* screens.jsx — Staff console screens. CONFIDENTIAL · internal staff only.
   Each screen reads live data through ./service.js (staff-gated Cloud Functions)
   and falls back to the bundled demo data when the backend isn't reachable. */
import React from 'react';
import { KPIS, GMV_TREND, SUB_MIX, FUNNEL, MERCHANTS, APPLICANTS, SCOUTS, PAYOUT_REQUESTS, RUNS, FLEET, WALLET, SUBSCRIPTIONS } from './data.js';
import { Card, SectionHead, Seg, Btn, Pill, Avatar, Stat, Bar, Icon, kes } from './ui.jsx';
import {
  useStaffResource, fetchOverview, fetchMerchants, setMerchantStatus,
  fetchRuns, fetchSubscriptions, fetchReports, fetchTranscript,
  moderateConversation, resolveReport, setStaffRole,
} from './service.js';
const { useState: useSS, useEffect: useES } = React;

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
export function Approvals(){
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
            <div className="min-w-0 flex-1">
              <div className="font-bold t1 flex items-center gap-2">{m.shop}
                {verified && <Pill tone="ok">Verified</Pill>}
                {suspended && <Pill tone="red">Suspended</Pill>}
              </div>
              <div className="text-xs t3">{m.owner}{m.county?` · ${m.county}`:''}{m.band?` · Band ${m.band}`:''}{m.plan?` · ${m.plan}`:''}{m.scout?` · scout ${m.scout}`:''}</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Chk ok={m.docs} label="KYC docs" />
              <Chk ok={m.items>=2} label={`${m.items||0} items`} />
              <Chk ok={m.socials>=3} label={`${m.socials||0} socials`} />
            </div>
            <div className="flex gap-2">
              {!verified && !suspended && <Btn kind="success" size="sm" icon="circle-check" onClick={()=>apply(m.id,'verify','verified')} disabled={m._busy} title={ready?'':'Readiness checklist incomplete'}>Verify</Btn>}
              {suspended
                ? <Btn kind="soft" size="sm" icon="rotate-left" onClick={()=>apply(m.id,'reinstate','verified')} disabled={m._busy}>Reinstate</Btn>
                : <Btn kind="danger" size="sm" icon="ban" onClick={()=>apply(m.id,'suspend','suspended')} disabled={m._busy}>Suspend</Btn>}
            </div>
          </div>
        </Card>);
      })}
      {shown.length===0 && <Card className="p-10 text-center t3"><Icon name="inbox" className="text-3xl mb-2"/><div>Nothing here.</div></Card>}
    </div>
  </div>);
}
function Chk({ ok, label }){
  return <span className="pill" style={{background: ok?'var(--green-bg)':'var(--surface2)', color: ok?'var(--green-fg)':'var(--t3)'}}><Icon name={ok?'check':'minus'}/>{label}</span>;
}

/* ============ MARKETER APPLICATIONS (hiring funnel) ============ */
const STAGES = ['New','Review','Shortlist','Interview'];
export function Applications(){
  const byStage = s => APPLICANTS.filter(a=>a.stage===s);
  return (<div className="fadeup space-y-6">
    <SectionHead icon="briefcase" title="Marketer applications" sub="The hiring funnel — the leaderboard is the application" />
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
                <div><div className="num font-bold t1">{a.verified}</div><div className="text-[10px] t3 uppercase">verified</div></div>
                <span className="text-xs t3 num">{a.applied}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <Btn kind="primary" size="sm" className="flex-1">Advance</Btn>
                <Btn kind="ghost" size="sm"><Icon name="ellipsis"/></Btn>
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  </div>);
}

/* ============ SCOUTS + PAYOUT APPROVALS ============ */
export function Scouts(){
  const [reqs,setReqs] = useSS(PAYOUT_REQUESTS);
  const resolve = id => setReqs(rs=>rs.filter(r=>r.id!==id));
  return (<div className="fadeup space-y-6">
    <SectionHead icon="people-group" title="Scout management" sub="Monitor scout performance and approve M-Pesa payout requests" />
    <div className="grid lg:grid-cols-5 gap-6">
      {/* payout approvals */}
      <div className="lg:col-span-2 space-y-3">
        <h3 className="font-bold t1 flex items-center gap-2">Payout requests {reqs.length>0 && <span className="num text-xs text-white rounded-full px-2 py-0.5" style={{background:'var(--amber)'}}>{reqs.length}</span>}</h3>
        {reqs.map(r=>(
          <Card key={r.id} className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar src={r.photo} name={r.scout} size={38} />
              <div className="flex-1 min-w-0"><div className="font-semibold t1 text-sm">{r.scout}</div><div className="text-xs t3 num">{r.phone} · {r.date}</div></div>
              <div className="num font-bold t1">{kes(r.amount)}</div>
            </div>
            <div className="flex gap-2">
              <Btn kind="success" size="sm" className="flex-1" icon="mobile-alt" onClick={()=>resolve(r.id)}>Approve & send</Btn>
              <Btn kind="soft" size="sm" onClick={()=>resolve(r.id)}>Hold</Btn>
            </div>
          </Card>
        ))}
        {reqs.length===0 && <Card className="p-8 text-center t3"><Icon name="circle-check" className="text-2xl mb-2" style={{color:'var(--green)'}}/><div>All payouts cleared.</div></Card>}
      </div>
      {/* scout table */}
      <Card className="p-0 overflow-hidden lg:col-span-3">
        <h3 className="font-bold t1 p-5 pb-3">Top scouts</h3>
        <div className="overflow-x-auto no-bar"><table className="w-full text-sm" style={{minWidth:420}}>
          <thead><tr className="t3" style={{textAlign:'left',background:'var(--surface2)'}}>
            <th className="px-5 py-2.5 font-semibold">Scout</th><th className="px-4 py-2.5 font-semibold text-right">Verified</th>
            <th className="px-4 py-2.5 font-semibold text-right">Balance</th><th className="px-5 py-2.5 font-semibold text-right">Pending</th>
          </tr></thead>
          <tbody>{SCOUTS.map(s=>(
            <tr key={s.id} style={{borderTop:'1px solid var(--line)'}}>
              <td className="px-5 py-3"><div className="flex items-center gap-2.5"><Avatar src={s.photo} name={s.name} size={30}/><div><div className="font-semibold t1">{s.name}</div><div className="text-xs t3">{s.county}</div></div></div></td>
              <td className="px-4 py-3 text-right num font-semibold t1">{s.verified}</td>
              <td className="px-4 py-3 text-right num t2">{kes(s.balance)}</td>
              <td className="px-5 py-3 text-right num" style={{color: s.pending>0?'var(--amber)':'var(--t3)'}}>{s.pending>0?kes(s.pending):'—'}</td>
            </tr>))}</tbody>
        </table></div>
      </Card>
    </div>
  </div>);
}

/* ============ ORDERS & LOGISTICS ============ */
export function Logistics(){
  const { data, live } = useStaffResource(fetchRuns, { runs:RUNS, fleet:FLEET });
  const runs = data.runs || RUNS;
  const fleet = data.fleet || FLEET;
  const tone = { in_transit:'blue', delivered:'ok', delayed:'red' };
  const label = { in_transit:'In transit', delivered:'Delivered', delayed:'Delayed' };
  return (<div className="fadeup space-y-6">
    <SectionHead icon="truck-fast" title="Orders & logistics" sub={live ? 'Live batched-run operations across all bands' : 'Sample runs — connect the backend for live operations'} />
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
