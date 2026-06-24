/* extras.jsx — Merchant: Sales, Wallet, Subscription, Settings, Chat (aligned theme). */
import React from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { FA, Card, Btn, Pill, Avatar, Stat, SectionCard, useTheme } from './primitives.jsx';
import { OrdersTable } from './overview.jsx';
import { ORDER_ROWS, WALLET, CHATS, ksh } from './data.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { useMerchant, useShop } from './merchant.jsx';
import SubscribeFlow from './SubscribeFlow.jsx';
import { db, firebaseEnabled } from '../../lib/firebase.js';
const { useState: useStateX, useRef: useRefX, useEffect: useEffX } = React;

const fmtTs = (ts) => { try { return new Date((ts.seconds || ts._seconds) * 1000).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }); } catch { return ''; } };

/* ---------- SALES ---------- */
export function Sales(){
  return (
    <div className="anim-up">
      <h1 className="ym-h1" style={{ marginBottom:20 }}>Sales</h1>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16, marginBottom:22 }}>
        <Stat label="Revenue (30d)" value="Ksh 348K" delta="+18%" up icon="fa-coins" tone="#7c3aed" />
        <Stat label="Orders" value="248" delta="+14" up icon="fa-bag-shopping" tone="#3b82f6" />
        <Stat label="Avg order value" value="Ksh 1,403" delta="+4%" up icon="fa-receipt" tone="#10b981" />
        <Stat label="Refunds" value="3" delta="-1" up={false} icon="fa-rotate-left" tone="#ef4444" />
      </div>
      <OrdersTable rows={[...ORDER_ROWS, ...ORDER_ROWS.slice(0,2)]} />
    </div>
  );
}

/* ---------- WALLET ---------- */
export function Wallet({ toast }){
  const { merchant, live } = useMerchant();
  const total = WALLET.flow.reduce((s,f)=>s+(f.neg?0:f.value),0);
  const balance = live ? (merchant?.balanceAvailable || 0) : WALLET.balance;
  const txs = live ? [] : WALLET.tx;
  return (
    <div className="anim-up">
      <h1 className="ym-h1" style={{ marginBottom:20 }}>Wallet</h1>
      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:20, alignItems:'start' }} className="wallet-grid">
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <Card style={{ padding:24, color:'#fff', background:'var(--m-grad-deep)', boxShadow:'var(--m-glow)', position:'relative', overflow:'hidden' }}>
            <FA i="fa-wallet" style={{ position:'absolute', right:14, bottom:-10, fontSize:96, color:'rgba(255,255,255,.1)' }} />
            <div style={{ color:'rgba(255,255,255,.78)', fontSize:13 }}>Available payout</div>
            <div style={{ fontSize:40, fontWeight:800, margin:'4px 0' }}>{ksh(balance)}</div>
            <div style={{ color:'rgba(255,255,255,.78)', fontSize:13, marginBottom:18 }}>Next auto-payout {WALLET.nextPayout} · via M-Pesa</div>
            <button className="ym-btn ym-btn-mpesa" style={{ width:'auto' }} onClick={()=>toast&&toast('Withdrawal requested')}><FA i="fa-mobile-screen" /> Withdraw to M-Pesa</button>
          </Card>
          <SectionCard title="Recent transactions">
            <div>
              {txs.length === 0 && <div style={{ padding:'28px 18px', textAlign:'center', color:'var(--m-fg3)', fontSize:13.5 }}>No transactions yet.</div>}
              {txs.map((t,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:13, padding:'13px 18px', borderTop:i?'1px solid var(--m-border)':'none' }}>
                  <div style={{ width:40, height:40, borderRadius:12, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:t.dir==='in'?'var(--m-active-bg)':'var(--m-surface-2)', color:t.dir==='in'?'var(--m-active-fg)':'var(--m-fg3)' }}><FA i={t.icon} /></div>
                  <div style={{ flex:1, minWidth:0 }}><div className="ym-h3" style={{ fontSize:14 }}>{t.t}</div><div className="ym-cap">{t.when}</div></div>
                  <div style={{ fontWeight:700, color:t.dir==='in'?'var(--m-success)':'var(--m-fg1)' }}>{t.dir==='in'?'+':'−'}{ksh(t.amt)}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
        <Card style={{ padding:22 }}>
          <div className="ym-h2" style={{ fontSize:17, marginBottom:16 }}>This month</div>
          {WALLET.flow.map(f=>(
            <div key={f.label} style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span className="ym-sub">{f.label}</span><span className="ym-h3" style={{ fontSize:14, color:f.neg?'var(--m-danger)':'var(--m-fg1)' }}>{f.neg?'−':''}{ksh(f.value)}</span></div>
              <div style={{ height:8, borderRadius:9999, background:'var(--m-surface-2)', overflow:'hidden' }}><div style={{ width:Math.min(100,f.value/total*100)+'%', height:'100%', background:f.color }} /></div>
            </div>
          ))}
          <div style={{ borderTop:'1px solid var(--m-border)', paddingTop:14, marginTop:4, display:'flex', justifyContent:'space-between' }}><span className="ym-h3">Net earnings</span><span className="ym-h2" style={{ fontSize:18 }}>{ksh(total-3000)}</span></div>
        </Card>
      </div>
      <style>{`@media (max-width:820px){ .wallet-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

/* ---------- SUBSCRIPTION (live status + SubscribeFlow) ---------- */
export function Subscription(){
  const { user } = useAuth();
  const uid = user?.uid;
  const [live, setLive] = useStateX(null); // real subscriptions/{uid} doc

  useEffX(() => {
    if (!firebaseEnabled || !db || !uid) return undefined;
    const u = onSnapshot(doc(db, 'subscriptions', uid), (s) => setLive(s.data() || null), () => {});
    return () => u();
  }, [uid]);

  const current = live && live.status === 'active' ? live : null;
  const isSoftware = current && current.kind === 'software';
  const usedPct = current && current.deliveriesCap ? Math.min(100, (current.deliveriesUsed || 0) / current.deliveriesCap * 100) : 0;

  return (
    <div className="anim-up">
      <h1 className="ym-h1" style={{ marginBottom:6 }}>Subscription</h1>
      <p className="ym-sub" style={{ marginBottom:20 }}>No sales commission — a monthly plan paid with M-Pesa. Delivery plans are priced by your delivery range.</p>

      <Card style={{ padding:22, marginBottom:22, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:16, alignItems:'center' }}>
        {current ? (<>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}><span className="ym-h2">{current.plan}{isSoftware ? ' · Software' : ' plan'}</span><Pill tone="active">Active</Pill></div>
            <div className="ym-sub" style={{ marginTop:4 }}>{ksh(current.price)}/mo{isSoftware ? ' · software only' : ` · ${current.deliveriesCap} bundled deliveries`}{current.range ? ` · ${current.range}` : ''}{current.renewsAt ? ` · renews ${fmtTs(current.renewsAt)}` : ''}</div>
          </div>
          {!isSoftware && (
          <div style={{ minWidth:200 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span className="ym-cap">Deliveries used</span><span className="ym-cap" style={{ fontWeight:700, color:'var(--m-fg1)' }}>{current.deliveriesUsed || 0}/{current.deliveriesCap}</span></div>
            <div style={{ height:8, borderRadius:9999, background:'var(--m-surface-2)', overflow:'hidden' }}><div style={{ width:usedPct+'%', height:'100%', background:'var(--m-grad)' }} /></div>
          </div>
          )}
        </>) : (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}><span className="ym-h2">No active plan</span><Pill tone="pending">Inactive</Pill></div>
            <div className="ym-sub" style={{ marginTop:4 }}>Choose a plan below and pay with M-Pesa.</div>
          </div>
        )}
      </Card>

      <div className="ym-h2" style={{ fontSize:17, marginBottom:14 }}>{current ? 'Change plan' : 'Choose a plan'}</div>
      <SubscribeFlow currentPlan={current ? { kind: current.kind || 'delivery', plan: current.plan, subTier: current.subTier } : null} />
    </div>
  );
}

/* ---------- SETTINGS ---------- */
function Toggle({ on, onClick }){ return <button onClick={onClick} aria-pressed={on} style={{ width:46, height:27, borderRadius:9999, border:'none', cursor:'pointer', position:'relative', flexShrink:0, background:on?'var(--m-primary)':'var(--m-border)' }}><span style={{ position:'absolute', top:3, left:on?23:3, width:21, height:21, borderRadius:9999, background:'#fff', transition:'left .2s' }} /></button>; }
export function Settings(){
  const { theme, setTheme } = useTheme();
  const shop = useShop();
  const [n, setN] = useStateX({ orders:true, payouts:true, chat:true, promos:false });
  const tg = k=>setN(s=>({ ...s, [k]:!s[k] }));
  return (
    <div className="anim-up">
      <h1 className="ym-h1" style={{ marginBottom:20 }}>Settings</h1>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }} className="set-grid">
        <SectionCard title="Shop profile">
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>
            <F label="Shop name" v={shop.name} /><F label="Owner" v={shop.owner} /><F label="Area" v={shop.area} /><F label="M-Pesa till" v="174379" last />
            <Btn kind="primary" icon="fa-check" style={{ alignSelf:'flex-start' }}>Save changes</Btn>
          </div>
        </SectionCard>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <SectionCard title="Appearance">
            <div style={{ padding:'8px 20px' }}><Row label="Dark mode" sub="Switch the dashboard theme" last><Toggle on={theme==='dark'} onClick={()=>setTheme(theme==='dark'?'light':'dark')} /></Row></div>
          </SectionCard>
          <SectionCard title="Notifications">
            <div style={{ padding:'8px 20px' }}>
              <Row label="New orders" sub="When a buyer checks out"><Toggle on={n.orders} onClick={()=>tg('orders')} /></Row>
              <Row label="Payouts" sub="M-Pesa settlements"><Toggle on={n.payouts} onClick={()=>tg('payouts')} /></Row>
              <Row label="Chat messages" sub="Buyer questions"><Toggle on={n.chat} onClick={()=>tg('chat')} /></Row>
              <Row label="Promotions" sub="YoteMarket tips & offers" last><Toggle on={n.promos} onClick={()=>tg('promos')} /></Row>
            </div>
          </SectionCard>
        </div>
      </div>
      <style>{`@media (max-width:820px){ .set-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}
function F({ label, v }){ return <div><label className="ym-label">{label}</label><input className="ipt" defaultValue={v} /></div>; }
function Row({ label, sub, children, last }){ return <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:14, padding:'12px 0', borderBottom:last?'none':'1px solid var(--m-border)' }}><div><div className="ym-h3" style={{ fontSize:14 }}>{label}</div><div className="ym-cap">{sub}</div></div>{children}</div>; }

/* ---------- CHAT (merchant ↔ buyer) ---------- */
export function Chat(){
  const [sel, setSel] = useStateX(CHATS[0].id);
  const c = CHATS.find(x=>x.id===sel) || CHATS[0];
  const [msgs, setMsgs] = useStateX([{ from:'them', text:c.last, at:'10:02 AM' }]);
  const [draft, setDraft] = useStateX('');
  const scrollRef = useRefX(null);
  useEffX(()=>{ setMsgs([{ from:'them', text:c.last, at:'10:02 AM' }]); },[sel]);
  useEffX(()=>{ const el=scrollRef.current; if(el) el.scrollTop=el.scrollHeight; },[msgs]);
  const send=(t)=>{ const v=(t||draft).trim(); if(!v) return; setMsgs(m=>[...m,{from:'me',text:v,at:'Now'}]); setDraft(''); setTimeout(()=>setMsgs(m=>[...m,{from:'them',text:'Asante! Let me confirm and get back to you.',at:'Now'}]),1100); };
  return (
    <div className="anim-up">
      <h1 className="ym-h1" style={{ marginBottom:20 }}>Chats</h1>
      <Card style={{ display:'grid', gridTemplateColumns:'300px 1fr', overflow:'hidden', height:540 }} className="chat-grid">
        <div style={{ borderRight:'1px solid var(--m-border)', overflowY:'auto' }}>
          {CHATS.map(x=>(
            <button key={x.id} onClick={()=>setSel(x.id)} style={{ width:'100%', textAlign:'left', border:'none', borderBottom:'1px solid var(--m-border)', cursor:'pointer', fontFamily:'inherit', padding:'13px 14px', display:'flex', gap:12, alignItems:'center', background:sel===x.id?'var(--m-surface-3)':'transparent' }}>
              <div style={{ position:'relative', flexShrink:0 }}><Avatar src={`/assets/avatars/${x.avatar}`} name={x.name} size={44} />{x.unread>0 && <span style={{ position:'absolute', top:-2, right:-2, minWidth:18, height:18, borderRadius:9999, background:'var(--m-primary)', color:'#fff', fontSize:10.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--m-surface)' }}>{x.unread}</span>}</div>
              <div style={{ flex:1, minWidth:0 }}><div style={{ display:'flex', justifyContent:'space-between' }}><span className="ym-h3" style={{ fontSize:14 }}>{x.name}</span><span className="ym-cap">{x.when}</span></div><div className="ym-sub" style={{ fontSize:12.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:x.unread?'var(--m-fg1)':'var(--m-fg3)', fontWeight:x.unread?600:400 }}>{x.last}</div></div>
            </button>
          ))}
        </div>
        <div style={{ display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:'1px solid var(--m-border)' }}>
            <Avatar src={`/assets/avatars/${c.avatar}`} name={c.name} size={40} />
            <div style={{ flex:1 }}><div className="ym-h3">{c.name}</div><div className="ym-cap" style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:7, height:7, borderRadius:9999, background:'var(--m-success)' }} /> Customer</div></div>
          </div>
          <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:18, display:'flex', flexDirection:'column', gap:10, background:'var(--m-bg)' }}>
            {msgs.map((m,i)=><div key={i} style={{ maxWidth:'72%', padding:'10px 14px', fontSize:14, lineHeight:1.45, alignSelf:m.from==='me'?'flex-end':'flex-start', background:m.from==='me'?'var(--m-primary-deep)':'var(--m-surface)', color:m.from==='me'?'#fff':'var(--m-fg1)', borderRadius:m.from==='me'?'16px 16px 4px 16px':'16px 16px 16px 4px', boxShadow:'var(--m-shadow-card)' }}>{m.text}<div style={{ fontSize:10, opacity:.65, marginTop:4, textAlign:'right' }}>{m.at}</div></div>)}
          </div>
          <div style={{ display:'flex', gap:10, padding:'12px 18px', borderTop:'1px solid var(--m-border)' }}>
            <input className="ym-input" placeholder="Reply…" aria-label="Reply" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') send(); }} style={{ borderRadius:9999, background:'var(--m-surface-2)', border:'none' }} />
            <button onClick={()=>send()} className="icon-btn" aria-label="Send" style={{ background:'var(--m-primary-deep)', color:'#fff' }}><FA i="fa-paper-plane" /></button>
          </div>
        </div>
      </Card>
      <style>{`@media (max-width:640px){ .chat-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}
