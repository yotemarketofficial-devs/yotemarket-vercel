/* profile.jsx — Storefront account dashboard. */
import React from 'react';
import { useYM, FA, Thumb } from './ui.jsx';
import { YM_USER, YM_POINTS, YM_WALLET, YM_ADDRESSES, YM_ORDERS, ymStore, ymProduct, ymPrice } from './data.js';
const { useState: useSP } = React;

function Card({ title, icon, action, onAction, children, pad=22 }){
  return (
    <div className="ym-card" style={{ padding:pad }}>
      {title && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div className="ym-h3" style={{ display:'flex', alignItems:'center', gap:9 }}>{icon && <FA i={icon} style={{ color:'var(--m-primary)' }} />} {title}</div>
          {action && <button onClick={onAction} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, color:'var(--m-link)' }}>{action}</button>}
        </div>
      )}
      {children}
    </div>
  );
}

function Toggle({ on, onClick }){
  return <button onClick={onClick} aria-pressed={on} style={{ width:46, height:27, borderRadius:9999, border:'none', cursor:'pointer', position:'relative', flexShrink:0, background: on?'var(--m-primary)':'var(--m-border)', transition:'background .2s' }}><span style={{ position:'absolute', top:3, left: on?23:3, width:21, height:21, borderRadius:9999, background:'#fff', transition:'left .2s' }} /></button>;
}

export function ProfileScreen(){
  const { nav, reset, theme, setTheme, toast } = useYM();
  const [notif, setNotif] = useSP({ orders:true, deliveries:true, promos:false, chat:true });
  const tg = k => setNotif(n=>({ ...n, [k]:!n[k] }));
  const ptsPct = Math.round((YM_POINTS.lifetime/(YM_POINTS.lifetime+YM_POINTS.toNext))*100);

  return (
    <div className="wrap anim-up" style={{ paddingTop:24, paddingBottom:40 }}>
      <button onClick={()=>reset('home')} className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginBottom:18 }}><FA i="fa-arrow-left" /> Home</button>

      {/* header */}
      <div className="ym-card" style={{ padding:24, marginBottom:20, display:'flex', alignItems:'center', gap:18, flexWrap:'wrap', background:'var(--m-grad-deep)', boxShadow:'var(--m-glow)' }}>
        <div style={{ width:74, height:74, borderRadius:9999, background:'rgba(255,255,255,.16)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:26, flexShrink:0 }}>{YM_USER.initials}</div>
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span style={{ color:'#fff', fontSize:24, fontWeight:800 }}>{YM_USER.name}</span>
            <span style={{ background:'rgba(255,255,255,.18)', color:'#fff', fontSize:12, fontWeight:700, padding:'4px 11px', borderRadius:9999, display:'inline-flex', gap:6, alignItems:'center' }}><FA i="fa-medal" style={{ color:'var(--m-amber)' }} /> {YM_POINTS.tier} member</span>
          </div>
          <div style={{ color:'rgba(255,255,255,.85)', fontSize:14, marginTop:4 }}>{YM_USER.email} · {YM_USER.phone}</div>
          <div style={{ color:'rgba(255,255,255,.85)', fontSize:13, marginTop:4, display:'flex', alignItems:'center', gap:7 }}><FA i="fa-location-dot" /> {YM_USER.hub}</div>
        </div>
        <button className="ym-btn ym-btn-onbrand ym-btn-sm" onClick={()=>toast('Edit profile','fa-pen')}><FA i="fa-pen" /> Edit profile</button>
      </div>

      {/* quick stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:16, marginBottom:20 }}>
        <StatTile icon="fa-wallet" tint="#7c3aed" label="Wallet balance" value={ymPrice(YM_WALLET.balance)} />
        <StatTile icon="fa-coins" tint="#f4b530" label="YotePoints" value={YM_POINTS.balance} />
        <StatTile icon="fa-box" tint="#3b82f6" label="Orders" value={YM_ORDERS.length} onClick={()=>nav('orders')} />
        <StatTile icon="fa-heart" tint="#ec4899" label="Saved items" value={8} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }} className="profile-grid">
        {/* left col */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <Card title="Account details" icon="fa-user">
            <Field label="Full name" value={YM_USER.name} />
            <Field label="Phone (M-Pesa)" value={YM_USER.phone} />
            <Field label="Email" value={YM_USER.email} last />
          </Card>

          <Card title="Pickup & addresses" icon="fa-location-dot" action="Add" onAction={()=>toast('Add address','fa-plus')}>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {YM_ADDRESSES.map(a=>(
                <div key={a.id} style={{ display:'flex', alignItems:'center', gap:13, padding:13, borderRadius:14, border:'1px solid var(--m-border)' }}>
                  <div style={{ width:40, height:40, borderRadius:11, background:'var(--m-surface-2)', color:'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}><FA i={a.icon} /></div>
                  <div style={{ flex:1, minWidth:0 }}><div className="ym-h3" style={{ fontSize:14, display:'flex', alignItems:'center', gap:8 }}>{a.label} {a.default && <span className="ym-pill ym-pill-active">Default</span>}</div><div className="ym-cap">{a.line} · {a.detail}</div></div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Recent orders" icon="fa-box" action="View all" onAction={()=>nav('orders')}>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {YM_ORDERS.map(o=>{ const store=ymStore(o.store); const first=ymProduct(o.items[0].pid); const tone={out:'pending',awaiting:'pending',delivered:'active'}; const label={out:'Out for delivery',awaiting:'Awaiting pickup',delivered:'Collected'};
                return (
                  <div key={o.id} style={{ display:'flex', alignItems:'center', gap:13 }}>
                    <Thumb icon={first?.icon} tint={store?.tint} size={46} radius={12} img={first?.img} />
                    <div style={{ flex:1, minWidth:0 }}><div className="ym-h3" style={{ fontSize:13.5 }}>{o.id}</div><div className="ym-cap">{store?.name} · {ymPrice(o.total)}</div></div>
                    <span className={'ym-pill ym-pill-'+(tone[o.status]||'pending')}>{label[o.status]||o.status}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* right col */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <Card pad={22}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div><div className="ym-cap" style={{ fontWeight:600 }}>YotePoints balance</div><div style={{ fontSize:30, fontWeight:800, color:'var(--m-fg1)' }}>{YM_POINTS.balance} <span style={{ fontSize:15, fontWeight:600, color:'var(--m-fg3)' }}>pts</span></div></div>
              <div style={{ width:44, height:44, borderRadius:13, background:'var(--m-pending-bg)', color:'var(--m-pending-fg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}><FA i="fa-coins" /></div>
            </div>
            <div style={{ height:8, borderRadius:9999, background:'var(--m-surface-2)', overflow:'hidden' }}><div style={{ width:ptsPct+'%', height:'100%', background:'var(--m-grad)' }} /></div>
            <div className="ym-cap" style={{ marginTop:8 }}><b style={{ color:'var(--m-fg1)' }}>{YM_POINTS.toNext}</b> points to <b style={{ color:'var(--m-fg1)' }}>{YM_POINTS.next}</b> · earn 1 pt per Ksh {YM_POINTS.earnRate}</div>
            <button className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginTop:14, width:'100%' }} onClick={()=>toast('Redeem rewards','fa-gift')}><FA i="fa-gift" /> Redeem rewards</button>
          </Card>

          <Card title="Wallet" icon="fa-wallet" action="Top up" onAction={()=>toast('Top up wallet','fa-plus')}>
            <div style={{ fontSize:26, fontWeight:800, color:'var(--m-fg1)', marginBottom:12 }}>{ymPrice(YM_WALLET.balance)}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {YM_WALLET.tx.map((t,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderTop:i?'1px solid var(--m-border)':'none' }}>
                  <div style={{ width:38, height:38, borderRadius:11, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, background: t.dir==='in'?'var(--m-active-bg)':'var(--m-surface-2)', color: t.dir==='in'?'var(--m-active-fg)':'var(--m-fg3)' }}><FA i={t.icon} /></div>
                  <div style={{ flex:1, minWidth:0 }}><div className="ym-sub" style={{ color:'var(--m-fg1)', fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.t}</div><div className="ym-cap">{t.when}</div></div>
                  <div style={{ fontWeight:700, fontSize:14, color: t.dir==='in'?'var(--m-success)':'var(--m-fg1)' }}>{t.dir==='in'?'+':'−'}{ymPrice(t.amt)}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Settings" icon="fa-gear">
            <Setting label="Dark mode" sub="Switch the app theme"><Toggle on={theme==='dark'} onClick={()=>setTheme(theme==='dark'?'light':'dark')} /></Setting>
            <Setting label="Order updates" sub="Status & pickup alerts"><Toggle on={notif.orders} onClick={()=>tg('orders')} /></Setting>
            <Setting label="Delivery alerts" sub="When a rider is on the way"><Toggle on={notif.deliveries} onClick={()=>tg('deliveries')} /></Setting>
            <Setting label="Chat messages" sub="Seller replies"><Toggle on={notif.chat} onClick={()=>tg('chat')} /></Setting>
            <Setting label="Promotions" sub="Deals & new arrivals" last><Toggle on={notif.promos} onClick={()=>tg('promos')} /></Setting>
            <button className="ym-btn ym-btn-ghost" style={{ width:'100%', marginTop:16, color:'var(--m-inactive-fg)' }} onClick={()=>reset('auth')}><FA i="fa-arrow-right-from-bracket" /> Sign out</button>
          </Card>
        </div>
      </div>
      <style>{`@media (max-width:820px){ .profile-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

function StatTile({ icon, tint, label, value, onClick }){
  return (
    <div className="ym-card" style={{ padding:18, cursor:onClick?'pointer':'default' }} onClick={onClick}>
      <div style={{ width:40, height:40, borderRadius:11, background:tint+'22', color:tint, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, marginBottom:10 }}><FA i={icon} /></div>
      <div style={{ fontSize:22, fontWeight:800, color:'var(--m-fg1)' }}>{value}</div>
      <div className="ym-cap">{label}</div>
    </div>
  );
}
function Field({ label, value, last }){
  return <div style={{ paddingBottom:last?0:14, marginBottom:last?0:14, borderBottom:last?'none':'1px solid var(--m-border)' }}><div className="ym-cap" style={{ marginBottom:3 }}>{label}</div><div className="ym-h3" style={{ fontSize:14.5 }}>{value}</div></div>;
}
function Setting({ label, sub, children, last }){
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, paddingBottom:last?0:14, marginBottom:last?0:14, borderBottom:last?'none':'1px solid var(--m-border)' }}><div><div className="ym-h3" style={{ fontSize:14 }}>{label}</div><div className="ym-cap">{sub}</div></div>{children}</div>;
}
