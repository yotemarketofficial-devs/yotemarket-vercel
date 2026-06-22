/* screens.jsx — Staff console screens. CONFIDENTIAL · internal staff only. */
import React from 'react';
import { KPIS, GMV_TREND, SUB_MIX, FUNNEL, MERCHANTS, APPLICANTS, SCOUTS, PAYOUT_REQUESTS, RUNS, FLEET, WALLET, SUBSCRIPTIONS } from './data.js';
import { Card, SectionHead, Seg, Btn, Pill, Avatar, Stat, Bar, Icon, kes } from './ui.jsx';
const { useState: useSS } = React;

/* ============ ANALYTICS OVERVIEW ============ */
export function Analytics(){
  const max = Math.max(...GMV_TREND.map(d=>d.v));
  return (<div className="fadeup space-y-6">
    <SectionHead icon="gauge-high" title="Platform overview" sub="Live KPIs across the YoteMarket ecosystem · June 2026" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {KPIS.map(k=><Stat key={k.label} {...k} delta={k.delta} deltaUp={k.up} />)}
    </div>
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-5"><h3 className="font-bold t1">GMV trend</h3><span className="text-xs t3">KSh millions · last 12 months</span></div>
        <div className="flex items-end gap-2 h-44">
          {GMV_TREND.map((d,i)=>(
            <div key={i} className="flex-1 h-full flex flex-col items-center gap-2">
              <div className="flex-1 w-full flex items-end">
                <div className="w-full rounded-t-md transition-all" style={{height:`${(d.v/max)*100}%`, background: i===GMV_TREND.length-1?'var(--pri)':'var(--pri-soft)', minHeight:6}} />
              </div>
              <span className="text-[10px] t3">{d.m}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-bold t1 mb-4">Subscription mix</h3>
        <div className="space-y-4">{SUB_MIX.map(s=>(
          <div key={s.plan}>
            <div className="flex justify-between text-sm mb-1.5"><span className="font-semibold t1">{s.plan}</span><span className="t3 num">{s.count} · {s.pct}%</span></div>
            <Bar pct={s.pct} color={s.color} />
          </div>))}</div>
        <div className="mt-5 pt-4" style={{borderTop:'1px solid var(--line)'}}>
          <div className="text-sm t3">Total active subscriptions</div>
          <div className="text-2xl font-bold t1 num">{SUB_MIX.reduce((a,s)=>a+s.count,0).toLocaleString()}</div>
        </div>
      </Card>
    </div>
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="font-bold t1 mb-4">Merchant activation funnel</h3>
        <div className="space-y-3">{FUNNEL.map((f,i)=>{ const pct=(f.v/FUNNEL[0].v)*100; return (
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

/* ============ MERCHANT APPROVALS ============ */
export function Approvals(){
  const [rows,setRows] = useSS(MERCHANTS);
  const [filter,setFilter] = useSS('pending');
  const act = (id) => setRows(rs=>rs.filter(r=>r.id!==id));
  const shown = rows.filter(r=> filter==='all'||r.status===filter);
  return (<div className="fadeup space-y-6">
    <SectionHead icon="user-check" title="Merchant approvals" sub="Verify KYC docs and storefront readiness before a merchant goes live"
      action={<Seg value={filter} onChange={setFilter} options={['pending','review','all']} fmt={o=>o[0].toUpperCase()+o.slice(1)} />} />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Awaiting approval" value={rows.filter(r=>r.status==='pending').length} icon="hourglass-half" tone="amber" />
      <Stat label="Needs document review" value={rows.filter(r=>r.status==='review').length} icon="file-circle-question" tone="blue" />
      <Stat label="Approved today" value="23" icon="circle-check" tone="green" />
      <Stat label="Avg review time" value="3.2h" icon="clock" tone="pri" />
    </div>
    <div className="space-y-3">
      {shown.map(m=>{
        const ready = m.docs && m.items>=2 && m.socials>=3;
        return (<Card key={m.id} className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background:'var(--pri-soft)',color:'var(--pri)'}}><Icon name="store"/></div>
            <div className="min-w-0 flex-1">
              <div className="font-bold t1">{m.shop}</div>
              <div className="text-xs t3">{m.owner} · {m.county} · Band {m.band} · {m.plan} · scout {m.scout}</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Chk ok={m.docs} label="KYC docs" />
              <Chk ok={m.items>=2} label={`${m.items} items`} />
              <Chk ok={m.socials>=3} label={`${m.socials} socials`} />
            </div>
            <div className="flex gap-2">
              <Btn kind="success" size="sm" icon="check" onClick={()=>act(m.id)} disabled={!ready}>Approve</Btn>
              <Btn kind="soft" size="sm" icon="xmark" onClick={()=>act(m.id)}>Reject</Btn>
            </div>
          </div>
        </Card>);
      })}
      {shown.length===0 && <Card className="p-10 text-center t3"><Icon name="inbox" className="text-3xl mb-2"/><div>Queue clear — nothing waiting.</div></Card>}
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
  const tone = { in_transit:'blue', delivered:'ok', delayed:'red' };
  const label = { in_transit:'In transit', delivered:'Delivered', delayed:'Delayed' };
  return (<div className="fadeup space-y-6">
    <SectionHead icon="truck-fast" title="Orders & logistics" sub="Live batched-run operations across all bands" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Runs in transit" value={RUNS.filter(r=>r.status==='in_transit').length} icon="motorcycle" tone="blue" />
      <Stat label="Delivered today" value="312" icon="box-open" tone="green" />
      <Stat label="Delayed" value={RUNS.filter(r=>r.status==='delayed').length} icon="triangle-exclamation" tone="red" />
      <Stat label="Active fleet" value={FLEET.reduce((a,f)=>a+f.active,0)} icon="truck" tone="pri" />
    </div>
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="p-0 overflow-hidden lg:col-span-2">
        <h3 className="font-bold t1 p-5 pb-3">Active runs</h3>
        <div className="overflow-x-auto no-bar"><table className="w-full text-sm" style={{minWidth:620}}>
          <thead><tr className="t3" style={{textAlign:'left',background:'var(--surface2)'}}>
            {['Run','Band','Rider','Drops','Distance','ETA','Status'].map(h=><th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>{RUNS.map(r=>(
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
        <div className="space-y-4">{FLEET.map(f=>{ const total=f.active+f.idle; return (
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
  const tone = { active:'ok', overdue:'red' };
  return (<div className="fadeup space-y-6">
    <SectionHead icon="wallet" title="Subscriptions & wallet" sub="Platform float, M-Pesa settlement, and merchant billing oversight" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Platform float" value={WALLET.float} icon="vault" tone="pri" />
      <Stat label="M-Pesa settled today" value={WALLET.mpesaToday} icon="mobile-alt" tone="green" />
      <Stat label="Pending payouts" value={WALLET.pendingPayouts} icon="hourglass-half" tone="amber" />
      <Stat label="Badge insurance fund" value={WALLET.badgeFund} icon="shield-halved" tone="blue" />
    </div>
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3"><h3 className="font-bold t1">Merchant subscriptions</h3><Btn kind="soft" size="sm" icon="download">Export</Btn></div>
      <div className="overflow-x-auto no-bar"><table className="w-full text-sm" style={{minWidth:600}}>
        <thead><tr className="t3" style={{textAlign:'left',background:'var(--surface2)'}}>
          {['Shop','Plan','Band','Amount','Next billing','Status'].map(h=><th key={h} className="px-5 py-2.5 font-semibold">{h}</th>)}
        </tr></thead>
        <tbody>{SUBSCRIPTIONS.map(s=>(
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
