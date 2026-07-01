/* profile.jsx — Storefront account dashboard. Real data where the backend has it
   (account identity, YotePoints, wallet + transactions, order count/history),
   plus a working profile editor (name / phone / default pickup hub) and an
   owner-managed address book. No mock/demo data. */
import React from 'react';
import { doc, onSnapshot, collection, query, orderBy, limit, where } from 'firebase/firestore';
import { useYM, FA, Thumb, GuestGate, Modal, HubPicker } from './ui.jsx';
import { ymStore, ymProduct, ymPrice } from './data.js';
import { findHub } from './hubs.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { db, firebaseEnabled, topUpWallet, confirmPayment, redeemPoints } from '../../lib/firebase.js';
import { saveProfile, subscribeAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress, updateAvatar, subscribeFollows, unfollowStore } from '../../lib/account.js';
import ImageUpload from '../../components/ImageUpload.jsx';
import { avatarPath } from '../../lib/storage.js';
const { useState: useSP, useEffect: useEffP, useRef: useRefP } = React;

const fmtWhen = (t) => t?.when || (t?.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString('en-KE', { day:'numeric', month:'short' }) : '');

/* Live shopper profile from users/{uid} (+ meta/wallet, wallet_tx, addresses). */
function useProfileData(uid){
  const [data, setData] = useSP({ points:0, walletBalance:0, walletTx:[], defaultHubId:'', phone:'', name:'', addresses:[], receipts:[], follows:[] });
  useEffP(() => {
    if (!firebaseEnabled || !db || !uid) return undefined;
    const unsubs = [];
    unsubs.push(onSnapshot(doc(db,'users',uid), (s)=>{ const d=s.data()||{}; setData(p=>({ ...p, points:d.points||0, defaultHubId:d.defaultHubId||'', phone:d.phone||'', name:d.name||'', photoUrl:d.photoUrl||'' })); }, ()=>{}));
    unsubs.push(onSnapshot(doc(db,'users',uid,'meta','wallet'), (s)=>{ const d=s.data()||{}; setData(p=>({ ...p, walletBalance:d.balance||0 })); }, ()=>{}));
    unsubs.push(onSnapshot(query(collection(db,'users',uid,'wallet_tx'), orderBy('createdAt','desc'), limit(6)), (s)=>{ setData(p=>({ ...p, walletTx:s.docs.map(d=>({ id:d.id, ...d.data() })) })); }, ()=>{}));
    unsubs.push(subscribeAddresses(uid, (a)=>setData(p=>({ ...p, addresses:a }))));
    unsubs.push(subscribeFollows(uid, (f)=>setData(p=>({ ...p, follows:f }))));
    // Digital receipts (equality-only query → no composite index; sorted client-side).
    unsubs.push(onSnapshot(query(collection(db,'receipts'), where('userId','==',uid), limit(30)), (s)=>{ const r=s.docs.map(d=>({ id:d.id, ...d.data() })).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)); setData(p=>({ ...p, receipts:r })); }, ()=>{}));
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

const RECEIPT_ICON = { order:'fa-bag-shopping', wallet_topup:'fa-wallet', subscription:'fa-id-card', redemption:'fa-gift', pos:'fa-store', payout:'fa-money-bill-transfer' };
const STATUS_TONE = { placed:'pending', queued:'pending', accepted:'pending', picked_up:'pending', at_hub:'active', delivered:'active', confirmed:'pending', out:'pending', awaiting:'pending' };
const STATUS_LABEL = { placed:'Order placed', queued:'Finding a rider', accepted:'Rider assigned', picked_up:'Picked up', at_hub:'Ready for pickup', delivered:'Collected', confirmed:'Confirmed', out:'Out for delivery', awaiting:'Ready for pickup' };

export function ProfileScreen(){
  const { nav, reset, theme, setTheme, toast, account, liveOrders } = useYM();
  const { user } = useAuth();
  const uid = user?.uid;
  const prof = useProfileData(uid);
  const [notif, setNotif] = useSP({ orders:true, deliveries:true, promos:false, chat:true });
  const [editOpen, setEditOpen] = useSP(false);
  const [hubOpen, setHubOpen] = useSP(false);   // quick default-hub change from the card
  const [addrEdit, setAddrEdit] = useSP(null);  // null=closed | {} new | {id,...} edit
  const [topupOpen, setTopupOpen] = useSP(false);
  const [redeemOpen, setRedeemOpen] = useSP(false);
  const [receiptOpen, setReceiptOpen] = useSP(null); // selected receipt or null
  const tg = k => setNotif(n=>({ ...n, [k]:!n[k] }));

  if (!account.hasAccount) return <GuestGate icon="fa-user" title="Your account" sub="Sign in to manage your profile, addresses, wallet, and YotePoints rewards." />;

  const orders = liveOrders || [];
  const phone = prof.phone || account.phone || '';
  const recent = orders.slice(0, 3);
  const hub = findHub(prof.defaultHubId);
  const fullName = prof.name || account.name || '';
  const firstName = fullName.trim().split(/\s+/)[0] || '';

  const changeDefaultHub = async (h) => { try { await saveProfile(uid, { defaultHubId:h.id }); toast('Default hub updated','fa-check'); } catch { toast('Could not save','fa-triangle-exclamation'); } };
  const removeAddress = async (id) => { try { await deleteAddress(uid, id); toast('Address removed','fa-trash-can'); } catch { toast('Could not remove','fa-triangle-exclamation'); } };
  const makeDefault = async (id) => { try { await setDefaultAddress(uid, id); toast('Default address set','fa-check'); } catch { toast('Could not save','fa-triangle-exclamation'); } };

  return (
    <div className="wrap anim-up" style={{ paddingTop:24, paddingBottom:40 }}>
      <button onClick={()=>reset('home')} className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginBottom:18 }}><FA i="fa-arrow-left" /> Home</button>

      {/* header */}
      <div className="ym-card" style={{ padding:24, marginBottom:20, display:'flex', alignItems:'center', gap:18, flexWrap:'wrap', background:'var(--m-grad-deep)', boxShadow:'var(--m-glow)' }}>
        <ImageUpload aspect={1} round outputSize={512} title="Profile photo"
          pathFor={()=>avatarPath(uid)}
          onUploaded={async (url)=>{ try { await updateAvatar(uid, url); toast('Profile photo updated','fa-check'); } catch { toast('Could not save photo','fa-triangle-exclamation'); } }}
          onError={(e)=>toast(e.message || 'Upload failed','fa-triangle-exclamation')}>
          {({ pick, uploading })=>{
            const photo = prof.photoUrl || user?.photoURL || '';
            return (
              <button onClick={pick} title="Change photo" style={{ position:'relative', width:74, height:74, borderRadius:9999, border:'none', cursor:'pointer', padding:0, flexShrink:0, background:'rgba(255,255,255,.16)' }}>
                {photo
                  ? <img src={photo} alt="" style={{ width:'100%', height:'100%', borderRadius:9999, objectFit:'cover' }} />
                  : <span style={{ color:'#fff', fontWeight:800, fontSize:26, width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>{account.initials}</span>}
                <span style={{ position:'absolute', right:-2, bottom:-2, width:26, height:26, borderRadius:9999, background:'#fff', color:'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 6px rgba(0,0,0,.25)' }}>
                  <FA i={uploading?'fa-circle-notch':'fa-camera'} style={{ fontSize:12, animation: uploading?'ym-spin 1s linear infinite':'none' }} />
                </span>
              </button>
            );
          }}
        </ImageUpload>
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span style={{ color:'#fff', fontSize:24, fontWeight:800 }}>{prof.name || account.name}</span>
            <span style={{ background:'rgba(255,255,255,.18)', color:'#fff', fontSize:12, fontWeight:700, padding:'4px 11px', borderRadius:9999, display:'inline-flex', gap:6, alignItems:'center' }}><FA i="fa-medal" style={{ color:'var(--m-amber)' }} /> YoteMarket member</span>
          </div>
          <div style={{ color:'rgba(255,255,255,.85)', fontSize:14, marginTop:4 }}>{account.email}{phone ? ` · ${phone}` : ''}</div>
          <div style={{ color:'rgba(255,255,255,.85)', fontSize:13, marginTop:4, display:'flex', alignItems:'center', gap:7 }}><FA i="fa-location-dot" /> {hub ? hub.name : 'No pickup hub set yet'}</div>
        </div>
        <button className="ym-btn ym-btn-onbrand ym-btn-sm" onClick={()=>setEditOpen(true)}><FA i="fa-pen" /> Edit profile</button>
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
          <Card title="Account details" icon="fa-user" action="Edit" onAction={()=>setEditOpen(true)}>
            <Field label="Full name" value={prof.name || account.name || 'Not set'} />
            <Field label="Phone (M-Pesa)" value={phone || 'Not set'} />
            <Field label="Email" value={account.email || 'Not set'} last />
          </Card>

          <Card title="Pickup & addresses" icon="fa-location-dot" action="Add address" onAction={()=>setAddrEdit({})}>
            {/* default pickup hub */}
            <div style={{ display:'flex', alignItems:'center', gap:13, padding:13, borderRadius:13, border:'1px solid var(--m-border)', background:'var(--m-surface-2)', marginBottom:14 }}>
              <div style={{ width:40, height:40, borderRadius:11, flexShrink:0, background:'var(--m-primary)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}><FA i="fa-warehouse" /></div>
              <div style={{ flex:1, minWidth:0 }}><div className="ym-cap" style={{ marginBottom:2 }}>Default pickup hub</div><div className="ym-h3" style={{ fontSize:14 }}>{hub ? hub.name : 'Not set'}</div></div>
              <button onClick={()=>setHubOpen(true)} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, color:'var(--m-link)' }}>{hub?'Change':'Set'}</button>
            </div>
            {/* saved addresses */}
            {prof.addresses.length === 0 ? (
              <EmptyRow icon="fa-location-dot" text="No saved addresses yet. Add one to speed up checkout and pickups." />
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {prof.addresses.map(a=>(
                  <div key={a.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:13, borderRadius:13, border:'1px solid var(--m-border)' }}>
                    <div style={{ width:38, height:38, borderRadius:11, flexShrink:0, background:'var(--m-surface-2)', color:'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}><FA i={a.icon || 'fa-location-dot'} /></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}><span className="ym-h3" style={{ fontSize:14 }}>{a.label || 'Address'}</span>{a.default && <span className="ym-pill ym-pill-active" style={{ fontSize:11 }}>Default</span>}</div>
                      <div className="ym-cap" style={{ marginTop:2 }}>{a.line}{a.detail ? ` · ${a.detail}` : ''}</div>
                      <div style={{ display:'flex', gap:14, marginTop:8 }}>
                        {!a.default && <button onClick={()=>makeDefault(a.id)} style={linkBtn}>Set default</button>}
                        <button onClick={()=>setAddrEdit(a)} style={linkBtn}>Edit</button>
                        <button onClick={()=>removeAddress(a.id)} style={{ ...linkBtn, color:'var(--m-inactive-fg)' }}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

          <Card title="Followed stores" icon="fa-heart">
            {prof.follows.length === 0 ? (
              <EmptyRow icon="fa-heart" text="Follow stores to keep them handy — tap Follow on any store." />
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {prof.follows.map((f)=>(
                  <div key={f.id} style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <button onClick={()=>nav('store',{ sid:f.storeId })} style={{ flex:1, display:'flex', alignItems:'center', gap:12, border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left', padding:0 }}>
                      <Thumb icon={f.icon||'fa-store'} tint={f.tint||'#7c3aed'} size={42} radius={12} img={f.logo || f.img} />
                      <div style={{ flex:1, minWidth:0 }}><div className="ym-h3" style={{ fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.name||'Store'}</div><div className="ym-cap">Tap to visit</div></div>
                    </button>
                    <button onClick={()=>{ unfollowStore(uid, f.storeId).then(()=>toast('Unfollowed','fa-bell')).catch(()=>toast('Could not unfollow','fa-triangle-exclamation')); }} style={linkBtn}>Unfollow</button>
                  </div>
                ))}
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
            <div className="ym-cap">Earn points on every YoteMarket order — redeem them for wallet credit you can spend at checkout.</div>
            <button className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginTop:14, width:'100%' }} disabled={prof.points < 100} onClick={()=>setRedeemOpen(true)}><FA i="fa-gift" /> {prof.points < 100 ? 'Earn 100 pts to redeem' : 'Redeem points'}</button>
          </Card>

          <Card title={firstName ? `${firstName}’s wallet` : 'Wallet'} icon="fa-wallet" action="Top up" onAction={()=>setTopupOpen(true)}>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:26, fontWeight:800, color:'var(--m-fg1)' }}>{ymPrice(prof.walletBalance)}</div>
              {fullName && <div className="ym-cap" style={{ marginTop:2 }}>YoteMarket wallet · {fullName}</div>}
            </div>
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

          <Card title="Receipts" icon="fa-receipt">
            {prof.receipts.length === 0 ? (
              <EmptyRow icon="fa-receipt" text="Your digital receipts for every payment will appear here." />
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                {prof.receipts.slice(0,8).map((r,i)=>(
                  <button key={r.id||i} onClick={()=>setReceiptOpen(r)} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 4px', borderTop:i?'1px solid var(--m-border)':'none', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left', width:'100%', borderRadius:8 }}>
                    {r.storeLogo
                      ? <img src={r.storeLogo} alt={r.storeName||''} style={{ width:38, height:38, borderRadius:11, flexShrink:0, objectFit:'cover' }} />
                      : <div style={{ width:38, height:38, borderRadius:11, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, background:'var(--m-surface-2)', color:'var(--m-primary)' }}><FA i={RECEIPT_ICON[r.type]||'fa-receipt'} /></div>}
                    <div style={{ flex:1, minWidth:0 }}><div className="ym-sub" style={{ color:'var(--m-fg1)', fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.storeName ? `${r.storeName} · ${r.title||'Payment'}` : (r.title||'Payment')}</div><div className="ym-cap">{fmtWhen(r)}{r.orderNo?` · ${r.orderNo}`:(r.ref?` · ${r.ref}`:'')}</div></div>
                    <div style={{ fontWeight:700, fontSize:14, color:'var(--m-fg1)' }}>{ymPrice(r.amount||0)}</div>
                    <FA i="fa-chevron-right" style={{ color:'var(--m-fg3)', fontSize:12 }} />
                  </button>
                ))}
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

      {editOpen && <ProfileEditor uid={uid} initial={{ name:prof.name||account.name||'', phone, defaultHubId:prof.defaultHubId }} onClose={()=>setEditOpen(false)} toast={toast} />}
      {hubOpen && <HubPicker selected={prof.defaultHubId} onSelect={changeDefaultHub} onClose={()=>setHubOpen(false)} title="Default pickup hub" />}
      {addrEdit && <AddressEditor uid={uid} initial={addrEdit} onClose={()=>setAddrEdit(null)} toast={toast} />}
      {topupOpen && <WalletTopUp defaultPhone={phone} holderName={fullName} onClose={()=>setTopupOpen(false)} toast={toast} />}
      {redeemOpen && <RedeemPoints points={prof.points} onClose={()=>setRedeemOpen(false)} toast={toast} />}
      {receiptOpen && <ReceiptDetail r={receiptOpen} account={account} onClose={()=>setReceiptOpen(null)} />}

      <style>{`@media (max-width:820px){ .profile-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

const linkBtn = { border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:12.5, fontWeight:600, color:'var(--m-link)', padding:0 };

/* Edit name, phone and default pickup hub → users/{uid}. */
function ProfileEditor({ uid, initial, onClose, toast }){
  const [name, setName] = useSP(initial.name || '');
  const [phone, setPhone] = useSP(initial.phone || '');
  const [hubId, setHubId] = useSP(initial.defaultHubId || '');
  const [hubPick, setHubPick] = useSP(false);
  const [busy, setBusy] = useSP(false);
  const hub = findHub(hubId);
  const save = async () => {
    setBusy(true);
    try { await saveProfile(uid, { name:name.trim(), phone:phone.trim(), defaultHubId:hubId || '' }); toast('Profile updated','fa-check'); onClose(); }
    catch { toast('Could not save profile','fa-triangle-exclamation'); setBusy(false); }
  };
  return (
    <>
      <Modal title="Edit profile" onClose={onClose}>
        <label className="ym-label">Full name</label>
        <input className="ym-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" />
        <label className="ym-label" style={{ marginTop:14 }}>Phone (M-Pesa)</label>
        <input className="ym-input" value={phone} onChange={e=>setPhone(e.target.value)} inputMode="tel" placeholder="07XX XXX XXX" />
        <label className="ym-label" style={{ marginTop:14 }}>Default pickup hub</label>
        <button onClick={()=>setHubPick(true)} style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:13, borderRadius:13, cursor:'pointer', fontFamily:'inherit', textAlign:'left', background:'var(--m-surface)', border:'1px solid var(--m-border)' }}>
          <div style={{ width:38, height:38, borderRadius:11, flexShrink:0, background:'var(--m-surface-2)', color:'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}><FA i="fa-warehouse" /></div>
          <div style={{ flex:1, minWidth:0 }}><div className="ym-h3" style={{ fontSize:14 }}>{hub ? hub.name : 'Choose a hub'}</div><div className="ym-cap">{hub ? hub.area : 'Where you usually collect orders'}</div></div>
          <FA i="fa-chevron-right" style={{ color:'var(--m-fg4)', fontSize:13 }} />
        </button>
        <button className="ym-btn ym-btn-primary" style={{ width:'100%', marginTop:20 }} disabled={busy} onClick={save}>
          {busy ? <><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite' }} /> Saving…</> : <><FA i="fa-check" /> Save changes</>}
        </button>
      </Modal>
      {hubPick && <HubPicker selected={hubId} onSelect={(h)=>setHubId(h.id)} onClose={()=>setHubPick(false)} />}
    </>
  );
}

const ADDR_ICONS = [['fa-house','Home'],['fa-briefcase','Work'],['fa-location-dot','Other']];

/* Add or edit a saved address → users/{uid}/addresses. */
function AddressEditor({ uid, initial, onClose, toast }){
  const editing = Boolean(initial.id);
  const [label, setLabel] = useSP(initial.label || '');
  const [line, setLine] = useSP(initial.line || '');
  const [detail, setDetail] = useSP(initial.detail || '');
  const [icon, setIcon] = useSP(initial.icon || 'fa-house');
  const [busy, setBusy] = useSP(false);
  const save = async () => {
    if (!line.trim()) { toast('Add a street / area','fa-circle-exclamation'); return; }
    setBusy(true);
    const payload = { label:label.trim() || 'Address', line:line.trim(), detail:detail.trim(), icon };
    try {
      if (editing) await updateAddress(uid, initial.id, payload);
      else await addAddress(uid, { ...payload, default: false });
      toast(editing ? 'Address updated' : 'Address saved','fa-check'); onClose();
    } catch { toast('Could not save address','fa-triangle-exclamation'); setBusy(false); }
  };
  return (
    <Modal title={editing ? 'Edit address' : 'Add address'} onClose={onClose}>
      <label className="ym-label">Label</label>
      <div style={{ display:'flex', gap:8, marginBottom:4 }}>
        {ADDR_ICONS.map(([ic,lb])=>(
          <button key={ic} onClick={()=>{ setIcon(ic); if(!label) setLabel(lb); }} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'10px 6px', borderRadius:12, cursor:'pointer', fontFamily:'inherit', background:'var(--m-surface)', border: icon===ic?'2px solid var(--m-primary)':'2px solid var(--m-border)', color: icon===ic?'var(--m-primary)':'var(--m-fg3)' }}>
            <FA i={ic} style={{ fontSize:16 }} /><span style={{ fontSize:12, fontWeight:600 }}>{lb}</span>
          </button>
        ))}
      </div>
      <input className="ym-input" style={{ marginTop:10 }} value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Home, Office" />
      <label className="ym-label" style={{ marginTop:14 }}>Street / area</label>
      <input className="ym-input" value={line} onChange={e=>setLine(e.target.value)} placeholder="e.g. Mpaka Road, Westlands" />
      <label className="ym-label" style={{ marginTop:14 }}>Building / details <span style={{ color:'var(--m-fg4)', fontWeight:400 }}>(optional)</span></label>
      <input className="ym-input" value={detail} onChange={e=>setDetail(e.target.value)} placeholder="Apartment, floor, landmark" />
      <button className="ym-btn ym-btn-primary" style={{ width:'100%', marginTop:20 }} disabled={busy} onClick={save}>
        {busy ? <><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite' }} /> Saving…</> : <><FA i="fa-check" /> {editing ? 'Save address' : 'Add address'}</>}
      </button>
    </Modal>
  );
}

const RECEIPT_TYPE_LABEL = { order:'Order payment', wallet_topup:'Wallet top-up', subscription:'Subscription', redemption:'Points redemption', pos:'In-store sale', payout:'Payout' };
const RECEIPT_METHOD_LABEL = { mpesa:'M-Pesa', wallet:'YoteWallet', cash:'Cash', points:'YotePoints', card:'Card' };
const fmtReceiptWhen = (r) => r?.createdAt?.seconds
  ? new Date(r.createdAt.seconds * 1000).toLocaleString('en-KE', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
  : (r?.when || '—');

/* Full digital-receipt detail. Every receipt row opens this — it shows the payer,
   method, reference, itemised lines (where present) and the receipt id. */
function ReceiptDetail({ r, account, onClose }){
  const lines = Array.isArray(r.lines) ? r.lines : [];
  const Row = ({ label, value }) => (
    <div style={{ display:'flex', justifyContent:'space-between', gap:16, padding:'9px 0', borderTop:'1px solid var(--m-border)' }}>
      <span className="ym-cap" style={{ color:'var(--m-fg3)' }}>{label}</span>
      <span className="ym-sub" style={{ color:'var(--m-fg1)', fontWeight:600, textAlign:'right', wordBreak:'break-word' }}>{value}</span>
    </div>
  );
  const orderNo = r.orderNo || (r.meta?.orderId ? `#${String(r.meta.orderId).slice(0,8).toUpperCase()}` : null);
  return (
    <Modal title="Digital receipt" onClose={onClose}>
      <div style={{ textAlign:'center', marginBottom:6 }}>
        {r.storeLogo ? (
          <img src={r.storeLogo} alt={r.storeName||'Store'} style={{ width:60, height:60, borderRadius:16, margin:'0 auto 12px', objectFit:'cover', display:'block', border:'1px solid var(--m-border)' }} />
        ) : (
          <div style={{ width:56, height:56, borderRadius:16, margin:'0 auto 12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, background:'var(--m-surface-2)', color:'var(--m-primary)' }}><FA i={RECEIPT_ICON[r.type]||'fa-receipt'} /></div>
        )}
        {r.storeName && <div className="ym-h3" style={{ fontSize:15 }}>{r.storeName}</div>}
        <div className="ym-sub" style={{ color:'var(--m-fg2)', marginTop:r.storeName?2:0 }}>{r.title || RECEIPT_TYPE_LABEL[r.type] || 'Payment'}</div>
        <div style={{ fontSize:30, fontWeight:800, color:'var(--m-fg1)', marginTop:6 }}>{ymPrice(r.amount||0)}</div>
        <div className="ym-cap" style={{ color:'var(--m-fg3)', marginTop:4 }}>{fmtReceiptWhen(r)}</div>
      </div>

      {lines.length > 0 && (
        <div style={{ margin:'16px 0', padding:'4px 14px', borderRadius:12, background:'var(--m-surface-2)' }}>
          {lines.map((l,idx)=>(
            <div key={idx} style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'9px 0', borderTop:idx?'1px solid var(--m-border)':'none' }}>
              <span className="ym-sub" style={{ color:'var(--m-fg2)' }}>{l.label}</span>
              <span className="ym-sub" style={{ color:'var(--m-fg1)', fontWeight:600, whiteSpace:'nowrap' }}>{ymPrice(l.amount||0)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop:16 }}>
        <Row label="Type" value={RECEIPT_TYPE_LABEL[r.type] || r.type || 'Payment'} />
        <Row label="Paid with" value={RECEIPT_METHOD_LABEL[r.method] || r.method || '—'} />
        {r.ref && <Row label="Reference" value={r.ref} />}
        {orderNo && <Row label="Order no." value={<span style={{ fontFamily:'monospace' }}>{orderNo}</span>} />}
        {r.meta?.saleId && <Row label="Sale no." value={r.ref || <span style={{ fontFamily:'monospace' }}>{`#${String(r.meta.saleId).slice(0,8).toUpperCase()}`}</span>} />}
        <Row label="Paid by" value={account?.name || account?.email || 'You'} />
        <Row label="Receipt no." value={<span style={{ fontFamily:'monospace', fontSize:12 }}>{r.receiptNo || r.id}</span>} />
        <Row label="Currency" value={r.currency || 'KES'} />
      </div>

      <div style={{ marginTop:16, padding:'12px 14px', borderRadius:12, background:'var(--m-surface-2)', display:'flex', gap:10, alignItems:'flex-start' }}>
        <FA i="fa-shield-halved" style={{ color:'var(--m-primary)', marginTop:2 }} />
        <span className="ym-cap" style={{ color:'var(--m-fg3)', lineHeight:1.5 }}>Official YoteMarket digital receipt. Keep it as proof of payment for this transaction.</span>
      </div>

      <button className="ym-btn ym-btn-ghost" style={{ width:'100%', marginTop:16 }} onClick={()=>{ try{ window.print(); }catch(e){} }}><FA i="fa-print" /> Print / save as PDF</button>
    </Modal>
  );
}

const TOPUP_PRESETS = [200, 500, 1000, 2000];

/* Wallet top-up via M-Pesa STK push. The credit is driven by an active Daraja
   status query (confirmPayment) — robust even when the async callback never lands.
   We also listen to the payment doc so a callback-driven credit closes the modal. */
function WalletTopUp({ defaultPhone, holderName, onClose, toast }){
  const [amount, setAmount] = useSP('500');
  const [phone, setPhone] = useSP(defaultPhone || '');
  const [phase, setPhase] = useSP('form'); // form | waiting | done
  const [busy, setBusy] = useSP(false);
  const [checking, setChecking] = useSP(false);
  const [err, setErr] = useSP('');
  const cidRef = useRefP(null);
  const unsubRef = useRefP(null);
  const timerRef = useRefP(null);
  useEffP(() => () => { if (unsubRef.current) unsubRef.current(); clearTimeout(timerRef.current); }, []);

  const amt = Math.round(Number(amount)) || 0;

  // Ask Daraja directly whether this STK was paid, then credit. Returns true if paid.
  const confirmNow = async () => {
    const id = cidRef.current;
    setChecking(true);
    try {
      const r = await confirmPayment(id ? { checkoutRequestId: id } : {});
      if (r && (r.paid || r.settledCount)) { if (unsubRef.current) unsubRef.current(); clearTimeout(timerRef.current); setPhase('done'); return true; }
      return false;
    } catch { return false; }
    finally { setChecking(false); }
  };

  const start = async () => {
    setErr('');
    if (amt < 1) { setErr('Enter at least Ksh 1.'); return; }
    if (!phone.trim()) { setErr('Enter your M-Pesa number.'); return; }
    setBusy(true);
    try {
      const res = await topUpWallet({ amount: amt, phone: phone.trim(), name: holderName || '' });
      const id = res && res.checkoutRequestId;
      cidRef.current = id || null;
      setBusy(false);
      if (!id || !firebaseEnabled || !db) { setPhase('done'); return; }
      setPhase('waiting');
      // 1) Live callback path (if Daraja delivers it).
      unsubRef.current = onSnapshot(doc(db, 'mpesa_payments', id), (snap) => {
        const d = snap.data(); if (!d) return;
        if (d.status === 'paid' || d.credited) { if (unsubRef.current) unsubRef.current(); clearTimeout(timerRef.current); setPhase('done'); }
        else if (d.status === 'failed') { if (unsubRef.current) unsubRef.current(); clearTimeout(timerRef.current); setErr(d.resultDesc || 'Payment was cancelled or failed.'); setPhase('form'); }
      }, () => {});
      // 2) Active confirmation fallback ~20s in (after the PIN window) — does not rely on the callback.
      timerRef.current = setTimeout(confirmNow, 20000);
    } catch (e) { setBusy(false); setErr(e.message || 'Could not start the top-up.'); }
  };

  // Recover a top-up already paid in a past session (no checkoutRequestId on hand).
  const recover = async () => {
    setErr(''); setChecking(true);
    try {
      const r = await confirmPayment({});
      if (r && r.creditedTotal) { toast(`Recovered ${ymPrice(r.creditedTotal)} to your wallet`, 'fa-check'); onClose(); }
      else if (r && r.settledCount) { toast('Pending payments confirmed', 'fa-check'); onClose(); }
      else setErr('No completed payments were pending. If money left your account, give it a minute and try again.');
    } catch (e) { setErr(e.message || 'Could not check pending payments.'); }
    finally { setChecking(false); }
  };

  if (phase === 'waiting') return (
    <Modal title="Check your phone" onClose={onClose}>
      <div style={{ textAlign:'center', padding:'10px 0 4px' }}>
        <div style={{ width:72, height:72, borderRadius:9999, background:'var(--m-mpesa)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 16px' }}><FA i="fa-mobile-screen" /></div>
        <p className="ym-body">Enter your M-Pesa PIN on <b style={{ color:'var(--m-fg1)' }}>{phone}</b> to add <b style={{ color:'var(--m-fg1)' }}>{ymPrice(amt)}</b> to your wallet.</p>
        <div style={{ display:'inline-flex', alignItems:'center', gap:9, marginTop:18, color:'var(--m-fg3)' }}><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite', color:'var(--m-primary)' }} /> Waiting for confirmation…</div>
        <button className="ym-btn ym-btn-primary" style={{ marginTop:20, width:'100%' }} disabled={checking} onClick={async()=>{ const ok = await confirmNow(); if (!ok) setErr("Not confirmed yet — if you've paid, give it a few seconds and tap again."); }}>
          {checking ? <><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite' }} /> Checking…</> : <><FA i="fa-rotate" /> I've paid — confirm now</>}
        </button>
        {err && <div className="ym-cap" style={{ marginTop:10, color:'var(--m-inactive-fg)' }}>{err}</div>}
        <button className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginTop:10, width:'100%' }} onClick={onClose}>I'll check later</button>
      </div>
    </Modal>
  );
  if (phase === 'done') return (
    <Modal title="Wallet topped up" onClose={onClose}>
      <div style={{ textAlign:'center', padding:'10px 0 4px' }}>
        <div style={{ width:72, height:72, borderRadius:9999, background:'var(--m-success)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, margin:'0 auto 16px' }}><FA i="fa-check" /></div>
        <p className="ym-body">Your wallet balance has been updated.</p>
        <button className="ym-btn ym-btn-primary" style={{ marginTop:20, width:'100%' }} onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
  return (
    <Modal title="Top up wallet" onClose={onClose}>
      <label className="ym-label">Amount (Ksh)</label>
      <input className="ym-input" value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9]/g,''))} inputMode="numeric" />
      <div style={{ display:'flex', gap:8, marginTop:10 }}>
        {TOPUP_PRESETS.map(v=>(
          <button key={v} onClick={()=>setAmount(String(v))} style={{ flex:1, padding:'9px 4px', borderRadius:11, cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, background:'var(--m-surface)', border: amt===v?'2px solid var(--m-primary)':'2px solid var(--m-border)', color: amt===v?'var(--m-primary)':'var(--m-fg2)' }}>{v.toLocaleString()}</button>
        ))}
      </div>
      <label className="ym-label" style={{ marginTop:14 }}>M-Pesa phone number</label>
      <input className="ym-input" value={phone} onChange={e=>setPhone(e.target.value)} inputMode="tel" placeholder="07XX XXX XXX" />
      {err && <div role="alert" style={{ display:'flex', gap:9, alignItems:'center', background:'var(--m-inactive-bg)', color:'var(--m-inactive-fg)', borderRadius:11, padding:'10px 13px', fontSize:13, marginTop:14 }}><FA i="fa-circle-exclamation" /> {err}</div>}
      <button className="ym-btn ym-btn-mpesa" style={{ width:'100%', marginTop:18 }} disabled={busy} onClick={start}>
        {busy ? <><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite' }} /> Sending request…</> : <><FA i="fa-bolt" /> Pay {ymPrice(amt)} with M-Pesa</>}
      </button>
      <button className="ym-btn ym-btn-ghost ym-btn-sm" style={{ width:'100%', marginTop:10 }} disabled={checking} onClick={recover}>
        {checking ? <><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite' }} /> Checking…</> : <>Paid earlier but not credited? Recover it</>}
      </button>
      <div className="ym-cap" style={{ textAlign:'center', marginTop:10, display:'flex', gap:6, justifyContent:'center' }}><FA i="fa-lock" /> Secure M-Pesa top-up</div>
    </Modal>
  );
}

/* Redeem YotePoints → wallet credit (1 pt = Ksh 1, min 100). Server deducts the
   points and credits the wallet atomically; both update live via onSnapshot. */
function RedeemPoints({ points, onClose, toast }){
  const [pts, setPts] = useSP(String(Math.min(points, 500)));
  const [busy, setBusy] = useSP(false);
  const [err, setErr] = useSP('');
  const n = Math.floor(Number(pts)) || 0;
  const redeem = async () => {
    setErr('');
    if (n < 100) { setErr('Redeem at least 100 points.'); return; }
    if (n > points) { setErr("You don't have that many points."); return; }
    setBusy(true);
    try { const r = await redeemPoints({ points: n }); toast(`Redeemed ${n} pts → ${ymPrice(r.credited)} wallet credit`, 'fa-gift'); onClose(); }
    catch (e) { setBusy(false); setErr(e.message || 'Could not redeem points.'); }
  };
  return (
    <Modal title="Redeem YotePoints" onClose={onClose}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:14, borderRadius:13, background:'var(--m-surface-2)', marginBottom:16 }}>
        <div style={{ width:42, height:42, borderRadius:12, background:'var(--m-pending-bg)', color:'var(--m-pending-fg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}><FA i="fa-coins" /></div>
        <div><div className="ym-cap">Available</div><div className="ym-h3" style={{ fontSize:17 }}>{points} pts</div></div>
      </div>
      <label className="ym-label">Points to redeem</label>
      <input className="ym-input" value={pts} onChange={e=>setPts(e.target.value.replace(/[^0-9]/g,''))} inputMode="numeric" />
      <div className="ym-cap" style={{ marginTop:8 }}>You'll get <b style={{ color:'var(--m-fg1)' }}>{ymPrice(n)}</b> in wallet credit · 1 point = Ksh 1</div>
      {err && <div role="alert" style={{ display:'flex', gap:9, alignItems:'center', background:'var(--m-inactive-bg)', color:'var(--m-inactive-fg)', borderRadius:11, padding:'10px 13px', fontSize:13, marginTop:14 }}><FA i="fa-circle-exclamation" /> {err}</div>}
      <button className="ym-btn ym-btn-primary" style={{ width:'100%', marginTop:18 }} disabled={busy || points < 100} onClick={redeem}>
        {busy ? <><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite' }} /> Redeeming…</> : <><FA i="fa-gift" /> Redeem for wallet credit</>}
      </button>
    </Modal>
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
