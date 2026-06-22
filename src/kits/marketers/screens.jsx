/* screens.jsx — Marketers app screens (scout-facing). */
import React from 'react';
import { ME, REFERRALS, VERIFIED_COUNT, PENDING_COUNT, TOTAL_REFERRED, LEADERBOARD, PAYOUTS, COUNTIES } from './data.js';
import { calcEarnings, nextCheckpoint, merchantsToWithdrawal, ksh, MK_CONFIG } from './econ.js';
import { Card, Btn, Pill, Avatar, Stat, Bar, Medal, Icon, useTheme, useEarn } from './ui.jsx';
const { useState: useS, useMemo, useRef, useEffect: useE } = React;

/* ============ shared: page header ============ */
function PageHead({ title, sub, action }){
  return (
    <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold t1" style={{letterSpacing:'-.01em'}}>{title}</h1>
        {sub && <p className="t3 text-sm mt-1">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ============ shared: SVG earnings curve ============ */
export function EarningsCurve({ current, height=210 }){
  const e = useEarn();
  const MAX = 115;
  const wrapRef = useRef(null);
  const [w, setW] = useS(640);
  const [hover, setHover] = useS(null);
  useE(() => {
    const el = wrapRef.current; if (!el) return;
    const m = () => setW(el.clientWidth || 640); m();
    const ro = new ResizeObserver(m); ro.observe(el); return () => ro.disconnect();
  }, []);
  const data = useMemo(() => Array.from({length:MAX+1},(_,m)=>({ m, total:calcEarnings(m).total })), []);
  const cpDots = MK_CONFIG.checkpoints.map(c => { const tm=c+MK_CONFIG.qualifyThreshold; return { m:tm, total:calcEarnings(tm).total }; });
  const M = { top:12, right:14, bottom:24, left:46 };
  const iw = Math.max(40, w - M.left - M.right), ih = height - M.top - M.bottom;
  const xMax = MAX, yMax = Math.max(500, Math.ceil(Math.max(...data.map(d=>d.total))/500)*500);
  const X = m => M.left + (m/xMax)*iw, Y = v => M.top + ih - (v/yMax)*ih;
  const path = data.map((d,i)=>`${i?'L':'M'}${X(d.m).toFixed(1)},${Y(d.total).toFixed(1)}`).join(' ');
  const area = `${path} L${X(xMax)},${Y(0)} L${X(0)},${Y(0)} Z`;
  const yTicks = Array.from({length:5},(_,i)=>(yMax/4)*i);
  const xTicks = Array.from({length:Math.floor(xMax/20)+1},(_,i)=>i*20);
  const fmtY = v => v>=1000?`${v/1000}k`:String(v);
  const onMove = ev => { const r=wrapRef.current.getBoundingClientRect(); const m=Math.round(((ev.clientX-r.left)-M.left)/iw*xMax); if(m<0||m>xMax){setHover(null);return;} setHover(data[m]); };
  const line = getCSS('--line2'), mut = getCSS('--t3'), surf = getCSS('--surface');
  return (
    <div ref={wrapRef} style={{position:'relative',width:'100%'}} onMouseMove={onMove} onMouseLeave={()=>setHover(null)}>
      <svg width={w} height={height} style={{display:'block'}}>
        <defs><linearGradient id="ec" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={e.fg} stopOpacity="0.22"/><stop offset="100%" stopColor={e.fg} stopOpacity="0"/>
        </linearGradient></defs>
        {yTicks.map(v=>(<g key={v}><line x1={M.left} x2={M.left+iw} y1={Y(v)} y2={Y(v)} stroke={line} strokeDasharray="2 5"/>
          <text x={M.left-8} y={Y(v)+4} textAnchor="end" fontSize="10.5" fontFamily="JetBrains Mono" fill={mut}>{fmtY(v)}</text></g>))}
        {xTicks.map(m=>(<text key={m} x={X(m)} y={M.top+ih+16} textAnchor="middle" fontSize="10.5" fontFamily="JetBrains Mono" fill={mut}>{m}</text>))}
        <path d={area} fill="url(#ec)"/>
        <path d={path} fill="none" stroke={e.fg} strokeWidth="2.5" strokeLinejoin="round"/>
        {cpDots.map(d=>(<circle key={d.m} cx={X(d.m)} cy={Y(d.total)} r="3.5" fill={getCSS('--green')} stroke={surf} strokeWidth="2"/>))}
        {current!=null && <circle cx={X(current)} cy={Y(calcEarnings(current).total)} r="6" fill={surf} stroke={e.fg} strokeWidth="2.5"/>}
        {hover && <line x1={X(hover.m)} x2={X(hover.m)} y1={M.top} y2={M.top+ih} stroke={mut} strokeDasharray="3 3"/>}
        {hover && <circle cx={X(hover.m)} cy={Y(hover.total)} r="3.5" fill={e.fg}/>}
      </svg>
      {hover && <div style={{position:'absolute',top:6,left:Math.min(Math.max(X(hover.m)+10,M.left),w-130),
        background:'var(--surface2)',border:'1px solid var(--line2)',borderRadius:10,padding:'6px 10px',pointerEvents:'none'}}>
        <div className="t3" style={{fontSize:11}}>{hover.m} merchants</div>
        <div className="num font-bold" style={{fontSize:13,color:e.fg}}>{ksh(hover.total)}</div>
      </div>}
    </div>
  );
}
// read scoped CSS custom properties from the kit wrapper (vars live on .kit-marketers, not :root)
function getCSS(v){ const el = document.querySelector('.kit-marketers') || document.documentElement; return getComputedStyle(el).getPropertyValue(v).trim() || '#999'; }

/* ============ referral code block ============ */
function ReferralCode({ onShare }){
  const [copied, setCopied] = useS(false);
  const link = `marketers.yotemarket.com/r/${ME.code}`;
  const copy = () => { navigator.clipboard && navigator.clipboard.writeText('https://'+link); setCopied(true); setTimeout(()=>setCopied(false),1600); };
  return (
    <div className="rounded-2xl p-4" style={{ background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.18)' }}>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{color:'rgba(255,255,255,.7)'}}>Your referral link</div>
      <div className="flex items-center gap-2 mt-2">
        <code className="flex-1 num text-sm text-white truncate">{link}</code>
        <button onClick={copy} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          style={{ background:'#fff', color:'var(--purple-deep)' }}>
          <Icon name={copied?'check':'copy'} /> {copied?'Copied':'Copy'}
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onShare} className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-white" style={{background:'#25D366'}}><Icon name="whatsapp" brand/> Share on WhatsApp</button>
        <button onClick={copy} className="px-3 py-2 rounded-lg text-sm font-semibold text-white" style={{background:'rgba(255,255,255,.16)'}}><Icon name="qrcode"/></button>
      </div>
    </div>
  );
}

/* ============ DASHBOARD ============ */
export function Dashboard({ go }){
  const e = useEarn();
  const earn = calcEarnings(VERIFIED_COUNT);
  const nextCp = nextCheckpoint(VERIFIED_COUNT);
  const myRank = (LEADERBOARD.find(s=>s.you)||{}).rank;
  const recent = REFERRALS.slice(0,5);
  return (
    <div className="fadeup space-y-6">
      <PageHead title={`Karibu, ${ME.first} 👋`} sub="Here's how your referrals are stacking up this month." />

      {/* hero */}
      <div className="grad rounded-2xl p-6 sm:p-7 text-white relative overflow-hidden" style={{boxShadow:'var(--shadow-lg)'}}>
        <div className="absolute -right-8 -top-10 w-48 h-48 rounded-full" style={{background:'radial-gradient(circle, rgba(244,181,48,.35), transparent 70%)'}} />
        <div className="grid lg:grid-cols-2 gap-6 relative">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest" style={{color:'rgba(255,255,255,.7)'}}>Total earnings · this cycle</div>
            <div className="num font-extrabold mt-2" style={{ fontSize:48, lineHeight:1, color:'var(--gold-bright)' }}>{ksh(earn.total)}</div>
            <div className="text-sm mt-2" style={{color:'rgba(255,255,255,.85)'}}>
              Qualification {ksh(earn.qualifyPay)} + bonus {ksh(earn.bonusPay)} · {VERIFIED_COUNT} verified merchants
            </div>
            <div className="flex gap-2.5 mt-5 flex-wrap">
              <Btn kind="gold" icon="money-bill-wave" onClick={()=>go('payouts')}>Withdraw to M-Pesa</Btn>
              <button onClick={()=>go('simulator')} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{background:'rgba(255,255,255,.16)'}}><Icon name="calculator" className="mr-2"/>Simulate</button>
            </div>
          </div>
          <ReferralCode onShare={()=>go('referrals')} />
        </div>
      </div>

      {/* stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Verified merchants" value={VERIFIED_COUNT} sub="follow ≥3 socials · list ≥2 items" icon="store" tone="green" />
        <Stat label="Pending verification" value={PENDING_COUNT} sub="awaiting merchant activity" icon="hourglass-half" tone="gold" />
        <Stat label="Withdrawable balance" value={ksh(earn.withdrawable?earn.total:0)} sub={earn.withdrawable?'ready to cash out':`min ${ksh(MK_CONFIG.minWithdrawal)}`} icon="wallet" earn />
        <Stat label="Leaderboard rank" value={`#${myRank}`} sub="nationwide · this month" icon="trophy" tone="purple" />
      </div>

      {/* progress + breakdown */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold t1">Progress to next checkpoint</h3>
            {nextCp && <span className="num text-sm font-bold" style={{color:e.fg}}>+{ksh(nextCp.gain)} on arrival</span>}
          </div>
          {nextCp ? (<>
            <Bar pct={(VERIFIED_COUNT/nextCp.totalMerchantsAt)*100} color={e.fg} />
            <div className="flex justify-between text-xs t3 mt-2 num">
              <span>{VERIFIED_COUNT} verified</span><span>target {nextCp.totalMerchantsAt}</span>
            </div>
            <p className="text-sm t2 mt-4">
              <b className="num t1">{nextCp.need}</b> more verified merchant{nextCp.need===1?'':'s'} re-rates your bonus merchants to KSH 20 each — balance becomes <b className="num" style={{color:e.fg}}>{ksh(nextCp.newTotal)}</b>.
            </p>
          </>) : <p className="text-sm t2">All checkpoints cleared — every new merchant adds a flat {ksh(MK_CONFIG.lowRate)}.</p>}
          <div className="mt-5"><EarningsCurve current={VERIFIED_COUNT} /></div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold t1 mb-4">Earnings breakdown</h3>
          <BreakRow l="Qualification bonus" v={ksh(earn.qualifyPay)} note="at 10 verified" />
          <BreakRow l={`Re-rated @ 20 (${earn.highRateCount})`} v={ksh(earn.highRateCount*20)} note="past a checkpoint" />
          <BreakRow l={`Standard @ 10 (${earn.lowRateCount})`} v={ksh(earn.lowRateCount*10)} note="below next checkpoint" />
          <div className="flex justify-between items-center pt-3 mt-2" style={{borderTop:'1px solid var(--line)'}}>
            <span className="font-bold t1">Total</span>
            <span className="num font-extrabold text-lg" style={{color:e.fg}}>{ksh(earn.total)}</span>
          </div>
          <div className="mt-5 rounded-xl p-3 text-xs t2" style={{background:'var(--surface2)'}}>
            <Icon name="circle-info" className="accent mr-1.5"/> Checkpoints sit at 40 / 70 / 100 total merchants. Each one re-rates <i>all</i> bonus merchants retroactively.
          </div>
        </Card>
      </div>

      {/* recent referrals */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <h3 className="font-bold t1">Recent referrals</h3>
          <button onClick={()=>go('referrals')} className="text-sm font-semibold accent">View all →</button>
        </div>
        <RefTable rows={recent} compact />
      </Card>
    </div>
  );
}
function BreakRow({ l, v, note }){
  return (<div className="flex justify-between items-baseline py-2">
    <div><div className="text-sm t2">{l}</div>{note && <div className="text-xs t3">{note}</div>}</div>
    <div className="num font-semibold t1">{v}</div></div>);
}

/* ============ REFERRALS TABLE (shared) ============ */
function statusTone(s){ return s==='verified'?'verified':s==='pending'?'pending':'reject'; }
function RefTable({ rows, compact }){
  return (
    <div className="overflow-x-auto no-bar">
      <table className="w-full text-sm" style={{minWidth:compact?520:660}}>
        <thead><tr className="t3" style={{textAlign:'left'}}>
          <th className="px-5 py-3 font-semibold">Shop</th>
          <th className="px-4 py-3 font-semibold">County</th>
          {!compact && <th className="px-4 py-3 font-semibold">Socials</th>}
          {!compact && <th className="px-4 py-3 font-semibold">Items</th>}
          <th className="px-4 py-3 font-semibold">Joined</th>
          <th className="px-5 py-3 font-semibold">Status</th>
        </tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id} style={{borderTop:'1px solid var(--line)'}}>
              <td className="px-5 py-3">
                <div className="font-semibold t1">{r.shop}</div>
                <div className="text-xs t3">{r.owner}</div>
              </td>
              <td className="px-4 py-3 t2">{r.county}</td>
              {!compact && <td className="px-4 py-3"><ReqDots n={r.socials} max={3} /></td>}
              {!compact && <td className="px-4 py-3"><ReqDots n={r.items} max={2} /></td>}
              <td className="px-4 py-3 t2 num">{r.date}</td>
              <td className="px-5 py-3">
                <Pill tone={statusTone(r.status)}>{r.status}</Pill>
                {r.missing && r.status!=='verified' && <div className="text-xs t3 mt-1">{r.missing}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ReqDots({ n, max }){
  const met = n>=max;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="num text-sm font-semibold" style={{color: met?'var(--green)':'var(--t2)'}}>{n}</span>
      <span className="text-xs t3">/ {max}{met && <Icon name="check" className="ml-1" style={{color:'var(--green)'}} />}</span>
    </span>
  );
}

/* ============ REFERRALS PAGE ============ */
export function Referrals(){
  const [filter, setFilter] = useS('all');
  const [q, setQ] = useS('');
  const counts = {
    all: REFERRALS.length,
    verified: REFERRALS.filter(r=>r.status==='verified').length,
    pending: REFERRALS.filter(r=>r.status==='pending').length,
    rejected: REFERRALS.filter(r=>r.status==='rejected').length,
  };
  const rows = REFERRALS.filter(r => (filter==='all'||r.status===filter) &&
    (r.shop.toLowerCase().includes(q.toLowerCase()) || r.owner.toLowerCase().includes(q.toLowerCase())));
  const chips = [['all','All'],['verified','Verified'],['pending','Pending'],['rejected','Rejected']];
  return (
    <div className="fadeup space-y-6">
      <PageHead title="My referrals" sub={`${TOTAL_REFERRED} merchants referred all-time · ${counts.verified+39} verified`}
        action={<Btn kind="primary" icon="user-plus">Invite a merchant</Btn>} />

      <Card className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {chips.map(([k,l])=>(
            <button key={k} onClick={()=>setFilter(k)}
              className="px-3.5 py-2 rounded-full text-sm font-semibold transition"
              style={ filter===k
                ? { background:'var(--grad)', color:'#fff' }
                : { background:'var(--surface2)', color:'var(--t2)', border:'1px solid var(--line)' }}>
              {l} <span className="num opacity-70 ml-1">{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 t3" />
          <input className="ym-input pl-10" style={{minWidth:220}} placeholder="Search shop or owner" value={q} onChange={e=>setQ(e.target.value)} />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden"><RefTable rows={rows} /></Card>

      <Card className="p-5 flex gap-3" style={{background:'var(--surface2)'}}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'var(--purple-soft)',color:'var(--purple)'}}><Icon name="circle-check"/></div>
        <div>
          <div className="font-bold t1 text-sm">How a referral becomes verified</div>
          <p className="text-sm t2 mt-1">A merchant counts toward your earnings only once they <b>follow at least 3 of YoteMarket's socials</b> and <b>list at least 2 items</b> in their shop. Pending merchants nudge automatically until they qualify.</p>
        </div>
      </Card>
    </div>
  );
}

/* ============ LEADERBOARD ============ */
export function Leaderboard(){
  const [layout, setLayout] = useS('podium'); // podium | table
  const top3 = LEADERBOARD.slice(0,3);
  const podOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  return (
    <div className="fadeup space-y-6">
      <PageHead title="Scout leaderboard" sub="Top performers this month — the leaderboard is the application."
        action={
          <div className="inline-flex rounded-xl p-1" style={{background:'var(--surface2)',border:'1px solid var(--line)'}}>
            {[['podium','th-large'],['table','list']].map(([k,ic])=>(
              <button key={k} onClick={()=>setLayout(k)} className="px-3 py-1.5 rounded-lg text-sm font-semibold transition"
                style={ layout===k?{background:'var(--surface)',color:'var(--purple)',boxShadow:'var(--shadow)'}:{color:'var(--t3)'}}>
                <Icon name={ic} /></button>
            ))}
          </div>} />

      {layout==='podium' && (
        <div className="grid grid-cols-3 gap-3 sm:gap-5 items-end">
          {podOrder.map((s,i)=>{
            const place = s.rank;
            const h = place===1?'180px':place===2?'140px':'118px';
            return (
              <div key={s.name} className="text-center fadeup" style={{animationDelay:`${i*60}ms`}}>
                <Avatar src={s.photo} name={s.name} size={place===1?72:56} ring={place===1?'var(--gold-bright)':'var(--line2)'} />
                <div className="font-bold t1 mt-2 text-sm truncate">{s.name.split(' ')[0]}{s.you && ' (You)'}</div>
                <div className="text-xs t3">{s.county}</div>
                <div className="rounded-t-2xl mt-3 flex flex-col items-center justify-center text-white" style={{ height:h, background: place===1?'var(--grad)':'var(--surface2)', border: place===1?'none':'1px solid var(--line)' }}>
                  <Medal rank={place} />
                  <div className="num font-extrabold mt-1" style={{fontSize:place===1?26:20, color: place===1?'#fff':'var(--t1)'}}>{s.verified}</div>
                  <div className="text-xs" style={{color: place===1?'rgba(255,255,255,.8)':'var(--t3)'}}>verified</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto no-bar">
          <table className="w-full text-sm" style={{minWidth:520}}>
            <thead><tr className="t3" style={{textAlign:'left'}}>
              <th className="px-5 py-3 font-semibold">Rank</th>
              <th className="px-4 py-3 font-semibold">Scout</th>
              <th className="px-4 py-3 font-semibold">County</th>
              <th className="px-4 py-3 font-semibold w-40">Verified merchants</th>
            </tr></thead>
            <tbody>
              {LEADERBOARD.map(s=>{
                const pct = (s.verified/LEADERBOARD[0].verified)*100;
                return (
                  <tr key={s.name} style={{borderTop:'1px solid var(--line)', background: s.you?'var(--purple-soft)':'transparent'}}>
                    <td className="px-5 py-3"><Medal rank={s.rank} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={s.photo} name={s.name} size={34} />
                        <span className="font-semibold t1">{s.name}{s.you && <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{background:'var(--purple)',color:'#fff'}}>You</span>}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 t2">{s.county}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1"><Bar pct={pct} color="var(--grad)" /></div>
                        <span className="num font-bold t1 w-8 text-right">{s.verified}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 flex gap-3" style={{background:'var(--surface2)'}}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'var(--gold-bg)',color:'var(--gold)'}}><Icon name="briefcase"/></div>
        <div><div className="font-bold t1 text-sm">Top scouts get the call</div>
          <p className="text-sm t2 mt-1">Each month, the highest-performing scouts are invited to interview for full-time Growth Marketer roles. Keep stacking verified merchants.</p></div>
      </Card>
    </div>
  );
}

/* ============ PAYOUTS ============ */
export function Payouts(){
  const e = useEarn();
  const earn = calcEarnings(VERIFIED_COUNT);
  const [amount, setAmount] = useS(earn.withdrawable?earn.total:0);
  const [phone, setPhone] = useS(ME.phone);
  const [done, setDone] = useS(false);
  const ok = earn.withdrawable && amount>=MK_CONFIG.minWithdrawal && amount<=earn.total;
  return (
    <div className="fadeup space-y-6">
      <PageHead title="Payouts" sub="Cash out your verified earnings straight to M-Pesa." />
      <div className="grid lg:grid-cols-5 gap-6">
        {/* balance + withdraw */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm t3">Available balance</div>
                <div className="num font-extrabold mt-1" style={{fontSize:40, color:e.fg}}>{ksh(earn.total)}</div>
              </div>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{background:e.bg,color:e.fg}}><Icon name="wallet"/></div>
            </div>
            <div className="rounded-xl px-4 py-3 mt-4 text-sm flex items-center gap-2" style={{background:'var(--green-bg)',color:'var(--green-fg)'}}>
              <Icon name="circle-check"/> Above the {ksh(MK_CONFIG.minWithdrawal)} minimum — ready to withdraw.
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold t1 mb-4 flex items-center gap-2"><Icon name="mobile-alt" style={{color:'#009B3A'}}/> Withdraw to M-Pesa</h3>
            {done ? (
              <div className="text-center py-6 fadeup">
                <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-2xl text-white" style={{background:'#009B3A'}}><Icon name="check"/></div>
                <div className="font-bold t1 mt-3 text-lg">Withdrawal requested</div>
                <p className="t2 text-sm mt-1">{ksh(amount)} is on its way to {phone}. You'll get an M-Pesa SMS shortly.</p>
                <Btn kind="soft" className="mt-4" onClick={()=>setDone(false)}>Make another withdrawal</Btn>
              </div>
            ) : (<>
              <label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">M-Pesa phone number</label>
              <input className="ym-input mb-4 num" value={phone} onChange={ev=>setPhone(ev.target.value)} />
              <label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">Amount (KSH)</label>
              <input type="number" className="ym-input num" value={amount} onChange={ev=>setAmount(Number(ev.target.value))} />
              <div className="flex gap-2 mt-3">
                {[500, Math.round(earn.total/2), earn.total].map((a,i)=>(
                  <button key={i} onClick={()=>setAmount(a)} className="flex-1 py-2 rounded-lg text-sm font-semibold num transition"
                    style={amount===a?{background:'var(--purple)',color:'#fff'}:{background:'var(--surface2)',color:'var(--t2)',border:'1px solid var(--line)'}}>{ksh(a)}</button>
                ))}
              </div>
              <Btn kind="mpesa" size="lg" className="w-full mt-5" disabled={!ok} onClick={()=>setDone(true)} icon="bolt">
                Withdraw {ksh(amount)}
              </Btn>
              <p className="text-xs t3 mt-3 text-center">Withdrawals process instantly during business hours · no fees.</p>
            </>)}
          </Card>
        </div>

        {/* history */}
        <Card className="p-0 overflow-hidden lg:col-span-2">
          <h3 className="font-bold t1 p-5 pb-3">Withdrawal history</h3>
          <div>
            {PAYOUTS.map(p=>(
              <div key={p.id} className="flex items-center justify-between px-5 py-3.5" style={{borderTop:'1px solid var(--line)'}}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{background:'#009B3A'}}><Icon name="mobile-alt"/></div>
                  <div>
                    <div className="num font-bold t1">{ksh(p.amount)}</div>
                    <div className="text-xs t3">{p.date} · {p.ref}</div>
                  </div>
                </div>
                <Pill tone="ok">paid</Pill>
              </div>
            ))}
          </div>
          <div className="p-5 text-xs t3" style={{borderTop:'1px solid var(--line)'}}>
            Lifetime withdrawn · <span className="num font-bold t1">{ksh(PAYOUTS.reduce((s,p)=>s+p.amount,0))}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============ SIMULATOR ============ */
export function Simulator(){
  const e = useEarn();
  const [m, setM] = useS(VERIFIED_COUNT);
  const earn = calcEarnings(m), toWd = merchantsToWithdrawal(m), nextCp = nextCheckpoint(m);
  const presets = [['Just qualified',10],['Min withdrawal',30],['Checkpoint 1',40],['You',VERIFIED_COUNT],['Checkpoint 3',100]];
  return (
    <div className="fadeup space-y-6">
      <PageHead title="Payout simulator" sub="See exactly what you'll earn at any number of verified merchants." />
      <Card className="p-6">
        <div className="flex justify-between items-baseline mb-3">
          <span className="text-sm font-semibold t2">Verified merchants</span>
          <span className="num font-bold t1" style={{fontSize:30}}>{m}</span>
        </div>
        <input type="range" min="0" max="115" value={m} onChange={ev=>setM(+ev.target.value)} className="w-full" />
        <div className="flex flex-wrap gap-2 mt-4">
          {presets.map(([l,v])=>(
            <button key={l} onClick={()=>setM(v)} className="px-3 py-1.5 rounded-full text-xs font-semibold transition"
              style={m===v?{background:'var(--gold-bright)',color:'#3A2606'}:{background:'var(--surface2)',color:'var(--t2)',border:'1px solid var(--line)'}}>{l} · {v}</button>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2" style={{background:`radial-gradient(120% 140% at 100% 0%, ${e.bg}, var(--surface) 55%)`}}>
          <div className="text-xs font-semibold uppercase tracking-widest t3">Total earnings</div>
          <div key={earn.total} className="num font-extrabold mt-2" style={{fontSize:52,lineHeight:1,color:e.fg,animation:'pop .3s ease'}}>{ksh(earn.total)}</div>
          <div className="text-sm t2 mt-2">{earn.qualified ? `Qualification ${ksh(earn.qualifyPay)} + bonus ${ksh(earn.bonusPay)}` : `${earn.toQualify} more verified merchants to unlock the ${ksh(MK_CONFIG.qualifyBonus)} qualification`}</div>
          <div className="mt-5"><EarningsCurve current={m} /></div>
        </Card>

        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{border:`1px solid ${earn.withdrawable?'var(--green)':'var(--line2)'}`, background: earn.withdrawable?'var(--green-bg)':'var(--surface)'}}>
            <div className="text-xs font-semibold uppercase tracking-wide t3">Withdrawal</div>
            <div className="font-bold text-lg mt-1" style={{color: earn.withdrawable?'var(--green-fg)':'var(--t2)'}}>{earn.withdrawable?'Eligible':'Locked'}</div>
            <div className="text-sm t2 mt-1">{earn.withdrawable?`Balance above ${ksh(MK_CONFIG.minWithdrawal)}`:(toWd!=null?`${toWd} more merchants to reach ${ksh(MK_CONFIG.minWithdrawal)}`:'—')}</div>
          </div>
          <Card className="p-5"><div className="grid grid-cols-2 gap-3">
            <Mini k="Bonus merchants" v={earn.bonusMerchants} />
            <Mini k="@ 20 KSH" v={earn.highRateCount} c="var(--green)" />
            <Mini k="@ 10 KSH" v={earn.lowRateCount} />
            <Mini k="Bonus pay" v={ksh(earn.bonusPay)} c={e.fg} small />
          </div></Card>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto no-bar">
          <table className="w-full text-sm" style={{minWidth:560}}>
            <thead><tr className="t3" style={{textAlign:'left'}}>
              {['Stage','Total merchants','Bonus','Earnings','Withdraw?'].map(h=><th key={h} className="px-5 py-3 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody className="num">
              {[['Qualify',10],['Min withdrawal',30],['Checkpoint 1',40],['Mid',55],['Checkpoint 2',70],['Checkpoint 3',100]].map(([l,mm])=>{
                const r = calcEarnings(mm), hot = mm===m;
                return (<tr key={mm} style={{borderTop:'1px solid var(--line)', background: hot?e.bg:'transparent'}}>
                  <td className="px-5 py-3 font-semibold" style={{fontFamily:'Poppins',color:hot?e.fg:'var(--t1)'}}>{l}</td>
                  <td className="px-5 py-3 t1">{mm}</td>
                  <td className="px-5 py-3 t3">{r.bonusMerchants}</td>
                  <td className="px-5 py-3 font-bold" style={{color:e.fg}}>{ksh(r.total)}</td>
                  <td className="px-5 py-3" style={{color: r.withdrawable?'var(--green)':'var(--t3)'}}>{r.withdrawable?'Yes':'No'}</td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
function Mini({ k, v, c, small }){
  return (<div className="rounded-xl p-3" style={{background:'var(--surface2)'}}>
    <div className="text-xs t3 font-semibold uppercase" style={{fontSize:10.5,letterSpacing:'.04em'}}>{k}</div>
    <div className="num font-bold mt-1" style={{fontSize:small?17:22,color:c||'var(--t1)'}}>{v}</div></div>);
}

/* ============ PROFILE / SETTINGS ============ */
export function Profile(){
  const { dark, toggle, accent, setAccent } = useTheme();
  const [county, setCounty] = useS(ME.county);
  return (
    <div className="fadeup space-y-6">
      <PageHead title="Profile & settings" sub="Manage your scout account and app preferences." />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 text-center">
          <Avatar src={ME.photo} name={ME.name} size={88} ring="var(--gold-bright)" />
          <div className="font-bold t1 text-lg mt-3">{ME.name}</div>
          <div className="text-sm t3">{ME.handle}</div>
          <span className="pill pill-ok mt-3 inline-flex"><Icon name="star"/> {ME.tier}</span>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl p-3" style={{background:'var(--surface2)'}}><div className="num font-bold t1 text-lg">{VERIFIED_COUNT}</div><div className="text-xs t3">verified</div></div>
            <div className="rounded-xl p-3" style={{background:'var(--surface2)'}}><div className="num font-bold t1 text-lg">#{(LEADERBOARD.find(s=>s.you)||{}).rank}</div><div className="text-xs t3">rank</div></div>
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="font-bold t1 mb-4">Account details</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name" value={ME.name} />
            <Field label="Phone (M-Pesa)" value={ME.phone} />
            <Field label="Email" value={ME.email} />
            <div>
              <label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">County</label>
              <select className="ym-input" value={county} onChange={e=>setCounty(e.target.value)}>
                {COUNTIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <Field label="Referral code" value={ME.code} mono />
            <Field label="Joined" value={ME.joined} />
          </div>
          <div className="flex gap-2 mt-5"><Btn kind="primary" icon="check">Save changes</Btn><Btn kind="ghost">Cancel</Btn></div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-bold t1 mb-4">Appearance</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <SettingRow title="Dark mode" sub="Switch between light and dark themes">
            <Toggle on={dark} onClick={toggle} />
          </SettingRow>
          <SettingRow title="Earnings accent" sub="Color used for money & checkpoints">
            <div className="inline-flex rounded-xl p-1" style={{background:'var(--surface2)',border:'1px solid var(--line)'}}>
              {[['gold','Gold'],['indigo','Indigo']].map(([k,l])=>(
                <button key={k} onClick={()=>setAccent(k)} className="px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition"
                  style={accent===k?{background:'var(--surface)',color:'var(--t1)',boxShadow:'var(--shadow)'}:{color:'var(--t3)'}}>
                  <span className="w-3 h-3 rounded-full" style={{background:k==='gold'?'var(--gold-bright)':'var(--purple)'}}/>{l}</button>
              ))}
            </div>
          </SettingRow>
        </div>
      </Card>
    </div>
  );
}
function Field({ label, value, mono }){
  return (<div><label className="block text-xs font-semibold t3 uppercase tracking-wide mb-1.5">{label}</label>
    <input className={`ym-input ${mono?'num':''}`} defaultValue={value} /></div>);
}
function SettingRow({ title, sub, children }){
  return (<div className="flex items-center justify-between gap-4 rounded-xl p-4" style={{background:'var(--surface2)'}}>
    <div><div className="font-semibold t1 text-sm">{title}</div><div className="text-xs t3">{sub}</div></div>{children}</div>);
}
function Toggle({ on, onClick }){
  return (<button onClick={onClick} aria-pressed={on} className="w-12 h-7 rounded-full transition-colors relative flex-shrink-0" style={{background:on?'var(--purple)':'var(--line2)'}}>
    <span className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all" style={{left:on?'26px':'4px'}}/></button>);
}
