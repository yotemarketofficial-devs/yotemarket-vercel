/* profile.jsx — Storefront account dashboard. Real data where the backend has it
   (account identity, YotePoints, wallet + transactions, order count/history);
   addresses and a default pickup hub show honest "not set" states until those
   features ship. No mock/demo data. */
import React from 'react';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { useYM, FA, Thumb, GuestGate } from './ui.jsx';
import { ymStore, ymProduct, ymPrice } from './data.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { db, firebaseEnabled } from '../../lib/firebase.js';
const { useState: useSP, useEffect: useEffP } = React;

const fmtWhen = (t) => t?.when || (t?.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString('en-KE', { day:'numeric', month:'short' }) : '');

/* Live shopper profile from users/{uid} (+ meta/wallet, wallet_tx). */
function useProfileData(uid){
  const [data, setData] = useSP({ points:0, walletBalance:0, walletTx:[], hub:'', phone:'', name:'' });
  useEffP(() => {
    if (!firebaseEnabled || !db || !uid) return undefined;
    const unsubs = [];
    unsubs.push(onSnapshot(doc(db,'users',uid), (s)=>{ const d=s.data()||{}; setData(p=>({ ...p, points:d.points||0, hub:d.hub||'', phone:d.phone||'', name:d.name||'' })); }, ()=>{}));
    unsubs.push(onSnapshot(doc(db,'users',uid,'meta','wallet'), (s)=>{ const d=s.data()||{}; setData(p=>({ ...p, walletBalance:d.balance||0 })); }, ()=>{}));
    unsubs.push(onSnapshot(query(collection(db,'users',uid,'wallet_tx'), orderBy('createdAt','desc'), limit(6)), (s)=>{ setData(p=>({ ...p, walletTx:s.docs.map(d=>({ id:d.id, ...d.data() })) })); }, ()=>{}));
    return () => unsubs.forEach(u=>u());
  }, [uid]);
  return data;
}

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

function EmptyRow({ icon, text }){
  return <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'26px 14px', textAlign:'center', color:'var(--m-fg3)' }}><FA i={icon} style={{ fontSize:24, color:'var(--m-fg4)' }} /><div style={{ fontSize:13.5 }}>{text}</div></div>;
}

const STATUS_TONE = { placed:'pending', confirmed:'pending', out:'pending', awaiting:'pending', delivered:'active' };
const STATUS_LABEL = { placed:'Order placed', confirmed:'Confirmed', out:'Out for delivery', awaiting:'Awaiting pickup', delivered:'Collected' };

export function ProfileScreen(){
  const { nav, reset, theme, setTheme, toast, account, liveOrders } = useYM();
  const { user } = useAuth();
  const prof = useProfileData(user?.uid);
  const [notif, setNotif] = useSP({ orders:true, deliveries:true, promos:false, chat:true });
  const tg = k => setNotif(n=>({ ...n, [k]:!n[k] }));

  if (!account.hasAccount) return <GuestGate icon="fa-user" title="Your account" sub="Sign in to manage your profile, addresses, wallet, and YotePoints rewards." />;

  const orders = liveOrders || [];
  const phone = account.phone || prof.phone || '';
  const recent = orders.slice(0, 3);

  return (
    <div className="wrap anim-up" style={{ paddingTop:24, paddingBottom:40 }}>
      <button onClick={()=>reset('home')} className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginBottom:18 }}><FA i="fa-arrow-left" /> Home</button>

      {/* header */}
      <div className="ym-card" style={{ padding:24, marginBottom:20, display:'flex', alignItems:'center', gap:18, flexWrap:'wrap', background:'var(--m-grad-deep)', boxShadow:'var(--m-glow)' }}>
        <div style={{ width:74, height:74, borderRadius:9999, background:'rgba(255,255,255,.16)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:26, flexShrink:0 }}>{account.initials}</div>
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span style={{ color:'#fff', fontSize:24, fontWeight:800 }}>{account.name}</span>
            <span style={{ background:'rgba(255,255,255,.18)', color:'#fff', fontSize:12, fontWeight:700, padding:'4px 11px', borderRadius:9999, display:'inline-flex', gap:6, alignItems:'center' }}><FA i="fa-medal" style={{ color:'var(--m-amber)' }} /> YoteMarket member</span>
          </div>
          <div style={{ color:'rgba(255,255,255,.85)', fontSize:14, marginTop:4 }}>{account.email}{phone ? ` · ${phone}` : ''}</div>
          <div style={{ color:'rgba(255,255,255,.85)', fontSize:13, marginTop:4, display:'flex', alignItems:'center', gap:7 }}><FA i="fa-location-dot" /> {prof.hub || 'No pickup hub set yet'}</div>
        </div>
        <button className="ym-btn ym-btn-onbrand ym-btn-sm" onClick={()=>toast('Profile editing coming soon','fa-pen')}><FA i="fa-pen" /> Edit profile</button>
      </div>

      {/* quick stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:16, marginBottom:20 }}>
        <StatTile icon="fa-wallet" tint="#7c3aed" label="Wallet balance" value={ymPrice(prof.walletBalance)} />
        <StatTile icon="fa-coins" tint="#f4b530" label="YotePoints" value={prof.points} />
        <StatTile icon="fa-box" tint="#3b82f6" label="Orders" value={orders.length} onClick={()=>nav('orders')} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }} className="profile-grid">
        {/* left col */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <Card title="Account details" icon="fa-user">
            <Field label="Full name" value={account.name} />
            <Field label="Phone (M-Pesa)" value={phone || 'Not set'} />
            <Field label="Email" value={account.email || 'Not set'} last />
          </Card>

          <Card title="Pickup & addresses" icon="fa-location-dot" action="Add" onAction={()=>toast('Address book coming soon','fa-plus')}>
            <EmptyRow icon="fa-location-dot" text="No saved addresses yet. Add one to speed up checkout and pickups." />
          </Card>

          <Card title="Recent orders" icon="fa-box" action="View all" onAction={()=>nav('orders')}>
            {recent.length === 0 ? (
              <EmptyRow icon="fa-box-open" text="No orders yet — your purchases will show up here." />
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {recent.map(o=>{
                  const store = ymStore(o.storeId || o.store);
                  const first = o.items?.[0] ? ymProduct(o.items[0].pid) : null;
                  const code = (typeof o.id==='string' && o.id.length>12) ? 'YM-'+o.id.slice(-6).toUpperCase() : o.id;
                  return (
                    <div key={o.id} style={{ display:'flex', alignItems:'center', gap:13 }}>
                      <Thumb icon={first?.icon || 'fa-box'} tint={store?.tint || '#7c3aed'} size={46} radius={12} img={first?.img} />
                      <div style={{ flex:1, minWidth:0 }}><div className="ym-h3" style={{ fontSize:13.5 }}>{code}</div><div className="ym-cap">{store?.name || o.items?.[0]?.name || 'Order'} · {ymPrice(o.total)}</div></div>
                      <span className={'ym-pill ym-pill-'+(STATUS_TONE[o.status]||'pending')}>{STATUS_LABEL[o.status]||o.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* right col */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <Card pad={22}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div><div className="ym-cap" style={{ fontWeight:600 }}>YotePoints balance</div><div style={{ fontSize:30, fontWeight:800, color:'var(--m-fg1)' }}>{prof.points} <span style={{ fontSize:15, fontWeight:600, color:'var(--m-fg3)' }}>pts</span></div></div>
              <div style={{ width:44, height:44, borderRadius:13, background:'var(--m-pending-bg)', color:'var(--m-pending-fg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}><FA i="fa-coins" /></div>
            </div>
            <div className="ym-cap">Earn points on every YoteMarket order — redeem for discounts at checkout.</div>
            <button className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginTop:14, width:'100%' }} onClick={()=>toast('Rewards redemption coming soon','fa-gift')}><FA i="fa-gift" /> Redeem rewards</button>
          </Card>

          <Card title="Wallet" icon="fa-wallet" action="Top up" onAction={()=>toast('Wallet top-up coming soon','fa-plus')}>
            <div style={{ fontSize:26, fontWeight:800, color:'var(--m-fg1)', marginBottom:12 }}>{ymPrice(prof.walletBalance)}</div>
            {prof.walletTx.length === 0 ? (
              <EmptyRow icon="fa-receipt" text="No wallet activity yet." />
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                {prof.walletTx.map((t,i)=>{
                  const isIn = t.isIn === true || t.dir === 'in';
                  return (
                    <div key={t.id||i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderTop:i?'1px solid var(--m-border)':'none' }}>
                      <div style={{ width:38, height:38, borderRadius:11, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, background: isIn?'var(--m-active-bg)':'var(--m-surface-2)', color: isIn?'var(--m-active-fg)':'var(--m-fg3)' }}><FA i={isIn?'fa-arrow-down':'fa-arrow-up'} /></div>
                      <div style={{ flex:1, minWidth:0 }}><div className="ym-sub" style={{ color:'var(--m-fg1)', fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.label || 'Transaction'}</div><div className="ym-cap">{fmtWhen(t)}</div></div>
                      <div style={{ fontWeight:700, fontSize:14, color: isIn?'var(--m-success)':'var(--m-fg1)' }}>{isIn?'+':'−'}{ymPrice(t.amount||0)}</div>
                    </div>
                  );
                })}
              </div>
            )}
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
