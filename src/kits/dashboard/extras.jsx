/* extras.jsx — Merchant: Sales, Wallet, Subscription, Settings, Chat (aligned theme). */
import React from 'react';
import { doc, onSnapshot, collection, query, where, limit } from 'firebase/firestore';
import { FA, Card, Btn, Pill, Avatar, Stat, SectionCard, useTheme } from './primitives.jsx';
import { OrdersTable } from './overview.jsx';
import { ORDER_ROWS, WALLET, ksh } from './data.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { useMerchant, useShop } from './merchant.jsx';
import SubscribeFlow from './SubscribeFlow.jsx';
import { db, firebaseEnabled, aiAssistant, updateStoreMedia, updateStoreLocation, setMerchantTaxInfo } from '../../lib/firebase.js';
import {
  chatEnabled, subscribeConversations, subscribeMessages, sendChatMessage,
  markConversationRead, otherParticipant, fmtTime, fmtWhen,
} from '../../lib/chat.js';
import { usePushPrompt } from '../../lib/push.js';
import ImageUpload from '../../components/ImageUpload.jsx';
import { coverPath, logoPath } from '../../lib/storage.js';
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
const RCPT_ICON = { subscription:'fa-id-card', pos:'fa-store', payout:'fa-money-bill-transfer', order:'fa-bag-shopping', wallet_topup:'fa-wallet', redemption:'fa-gift' };

export function Wallet({ toast }){
  const { merchant, live } = useMerchant();
  const { user } = useAuth();
  const [receipts, setReceipts] = useStateX([]);
  useEffX(() => {
    if (!firebaseEnabled || !db || !user?.uid) return undefined;
    const u = onSnapshot(query(collection(db, 'receipts'), where('userId', '==', user.uid), limit(40)),
      (s) => setReceipts(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))),
      () => {});
    return () => u();
  }, [user?.uid]);
  const total = WALLET.flow.reduce((s,f)=>s+(f.neg?0:f.value),0);
  const balance = live ? (merchant?.balanceAvailable || 0) : WALLET.balance;
  const fmtRcptWhen = (r) => r.createdAt?.seconds ? new Date(r.createdAt.seconds*1000).toLocaleDateString('en-KE',{ day:'numeric', month:'short' }) : '';
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
          <SectionCard title="Receipts" sub="A digital receipt for every transaction">
            <div>
              {(live ? receipts.length === 0 : WALLET.tx.length === 0) && <div style={{ padding:'28px 18px', textAlign:'center', color:'var(--m-fg3)', fontSize:13.5 }}>No receipts yet.</div>}
              {live
                ? receipts.map((r,i)=>{
                    const out = r.type === 'payout';
                    return (
                      <div key={r.id||i} style={{ display:'flex', alignItems:'center', gap:13, padding:'13px 18px', borderTop:i?'1px solid var(--m-border)':'none' }}>
                        <div style={{ width:40, height:40, borderRadius:12, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:out?'var(--m-surface-2)':'var(--m-active-bg)', color:out?'var(--m-fg3)':'var(--m-active-fg)' }}><FA i={RCPT_ICON[r.type]||'fa-receipt'} /></div>
                        <div style={{ flex:1, minWidth:0 }}><div className="ym-h3" style={{ fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.title||'Payment'}</div><div className="ym-cap">{fmtRcptWhen(r)}{r.ref?` · ${r.ref}`:''}</div></div>
                        <div style={{ fontWeight:700, color:out?'var(--m-fg1)':'var(--m-success)' }}>{out?'−':'+'}{ksh(r.amount||0)}</div>
                      </div>
                    );
                  })
                : WALLET.tx.map((t,i)=>(
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
/* ---------- STORE BRANDING (cover + logo, with the photo editor) ---------- */
function StoreBranding({ toast }){
  const { store, live } = useMerchant();
  const storeId = store?.id;
  const [cover, setCover] = useStateX('');
  const [logo, setLogo] = useStateX('');
  useEffX(()=>{ setCover(store?.img||''); setLogo(store?.logo||''); }, [store?.img, store?.logo]);
  const saveMedia = async (field, url, setLocal) => {
    setLocal(url);
    try { await updateStoreMedia({ field, url }); toast && toast(field==='img'?'Cover photo updated':'Store logo updated'); }
    catch (e) { toast && toast(e.message || 'Could not save photo'); }
  };
  if (!live || !storeId) return <div style={{ padding:'16px 20px', color:'var(--m-fg3)', fontSize:13 }}>Connect your store to set a cover photo and logo.</div>;
  return (
    <div style={{ padding:'16px 20px 0' }}>
      <div style={{ position:'relative', marginBottom:38 }}>
        <ImageUpload aspect={16/6} outputSize={1280} title="Cover photo" pathFor={()=>coverPath(storeId)} onUploaded={(u)=>saveMedia('img',u,setCover)} onError={(e)=>toast&&toast(e.message)}>
          {({ pick, uploading })=>(
            <button type="button" onClick={pick} aria-label="Change cover photo"
              style={{ width:'100%', height:130, border:'none', cursor:'pointer', borderRadius:14, overflow:'hidden', position:'relative', padding:0,
                background: cover?`center/cover no-repeat url(${cover})`:'var(--m-grad-deep)' }}>
              <span style={{ position:'absolute', right:12, bottom:12, background:'rgba(0,0,0,.5)', color:'#fff', borderRadius:9999, padding:'6px 12px', fontSize:12.5, fontWeight:600, display:'inline-flex', gap:6, alignItems:'center' }}>
                <FA i={uploading?'fa-circle-notch':'fa-camera'} style={{ animation: uploading?'ym-spin 1s linear infinite':'none' }} /> {cover?'Change cover':'Add cover'}
              </span>
            </button>
          )}
        </ImageUpload>
        <div style={{ position:'absolute', left:18, bottom:-28 }}>
          <ImageUpload aspect={1} round outputSize={400} title="Store logo" pathFor={()=>logoPath(storeId)} onUploaded={(u)=>saveMedia('logo',u,setLogo)} onError={(e)=>toast&&toast(e.message)}>
            {({ pick, uploading })=>(
              <button type="button" onClick={pick} title="Change logo"
                style={{ width:66, height:66, borderRadius:9999, border:'3px solid var(--m-surface)', cursor:'pointer', overflow:'hidden', position:'relative', padding:0,
                  background: logo?`center/cover no-repeat url(${logo})`:'var(--m-surface-2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {!logo && <FA i="fa-store" style={{ color:'var(--m-primary)', fontSize:22 }} />}
                <span style={{ position:'absolute', right:-2, bottom:-2, width:22, height:22, borderRadius:9999, background:'#fff', color:'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 4px rgba(0,0,0,.25)' }}>
                  <FA i={uploading?'fa-circle-notch':'fa-camera'} style={{ fontSize:10, animation: uploading?'ym-spin 1s linear infinite':'none' }} />
                </span>
              </button>
            )}
          </ImageUpload>
        </div>
      </div>
    </div>
  );
}

/* Set the store's pickup pin (browser geolocation) + address for the shopper map. */
function StorePickupLocation({ toast }){
  const shop = useShop();
  const [coords, setCoords] = useStateX(shop.location || null);
  const [addr, setAddr] = useStateX(shop.address || '');
  const [busy, setBusy] = useStateX(false);
  const [locating, setLocating] = useStateX(false);
  const locate = () => {
    if (!navigator.geolocation) { toast && toast('Geolocation not supported on this device'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) }); setLocating(false); },
      () => { toast && toast('Could not get your location — allow location access'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const save = async () => {
    if (!coords) { toast && toast('Set the pin first — tap “Use current location”'); return; }
    setBusy(true);
    try { await updateStoreLocation({ lat: coords.lat, lng: coords.lng, address: addr.trim() }); toast && toast('Pickup location saved'); }
    catch (e) { toast && toast(e.message || 'Could not save location'); } finally { setBusy(false); }
  };
  return (
    <SectionCard title="Store pickup location">
      <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
        <div className="ym-cap">Set your store's spot so shoppers who choose “pick up from store” get a map + directions to you.</div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <Btn kind="soft" icon={locating?'fa-circle-notch':'fa-location-crosshairs'} onClick={locate} disabled={locating}>{locating?'Locating…':'Use current location'}</Btn>
          {coords && <span className="ym-cap"><FA i="fa-location-dot" style={{ color:'var(--m-primary)' }} /> {coords.lat}, {coords.lng}</span>}
        </div>
        <div><label className="ym-label">Address / landmark</label><input className="ipt" value={addr} onChange={e=>setAddr(e.target.value)} placeholder="e.g. Mpaka Rd, Westlands — shop 4" /></div>
        <Btn kind="primary" icon="fa-check" disabled={busy} onClick={save} style={{ alignSelf:'flex-start' }}>{busy?'Saving…':'Save location'}</Btn>
      </div>
    </SectionCard>
  );
}

/* KRA tax profile: PIN (shown on tax invoices) + VAT-registered toggle. */
function TaxSettings({ toast }){
  const { merchant } = useMerchant();
  const [pin, setPin] = useStateX('');
  const [vatReg, setVatReg] = useStateX(false);
  const [busy, setBusy] = useStateX(false);
  useEffX(() => { if (merchant) { setPin(merchant.kraPin || ''); setVatReg(merchant.vatRegistered === true); } }, [merchant?.kraPin, merchant?.vatRegistered]);
  const save = async () => {
    setBusy(true);
    try { await setMerchantTaxInfo({ kraPin: pin.trim(), vatRegistered: vatReg }); toast && toast('Tax details saved'); }
    catch (e) { toast && toast(e.message || 'Could not save tax details'); } finally { setBusy(false); }
  };
  return (
    <SectionCard title="Tax · KRA">
      <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
        <div className="ym-cap">Your KRA PIN appears on customer tax invoices. Turn on VAT only if you're VAT-registered — 16% is then itemised on every invoice.</div>
        <div><label className="ym-label">KRA PIN</label><input className="ipt" value={pin} onChange={e=>setPin(e.target.value.toUpperCase())} placeholder="A001234567Z" maxLength={11} /></div>
        <Row label="VAT registered" sub="Itemise 16% VAT on invoices" last><Toggle on={vatReg} onClick={()=>setVatReg(v=>!v)} /></Row>
        <Btn kind="primary" icon="fa-check" disabled={busy} onClick={save} style={{ alignSelf:'flex-start' }}>{busy?'Saving…':'Save tax details'}</Btn>
      </div>
    </SectionCard>
  );
}

export function Settings({ toast }){
  const { theme, setTheme } = useTheme();
  const shop = useShop();
  const [n, setN] = useStateX({ orders:true, payouts:true, chat:true, promos:false });
  const tg = k=>setN(s=>({ ...s, [k]:!s[k] }));
  return (
    <div className="anim-up">
      <h1 className="ym-h1" style={{ marginBottom:20 }}>Settings</h1>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }} className="set-grid">
        <SectionCard title="Shop profile">
          <StoreBranding toast={toast} />
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>
            <F label="Shop name" v={shop.name} /><F label="Owner" v={shop.owner} /><F label="Area" v={shop.area} /><F label="M-Pesa till" v="174379" last />
            <Btn kind="primary" icon="fa-check" style={{ alignSelf:'flex-start' }}>Save changes</Btn>
          </div>
        </SectionCard>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <TaxSettings toast={toast} />
          <StorePickupLocation toast={toast} />
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

/* Dismissible opt-in to browser push (only shows when permission is unanswered). */
function MerchantNotifyBanner({ user }){
  const { canPrompt, enable } = usePushPrompt(user);
  const [hidden, setHidden] = useStateX(false);
  if (!canPrompt || hidden) return null;
  return (
    <Card style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', marginBottom:16, background:'var(--m-surface-2)' }}>
      <FA i="fa-bell" style={{ color:'var(--m-primary)', fontSize:16 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div className="ym-h3" style={{ fontSize:13.5 }}>Turn on chat notifications</div>
        <div className="ym-cap">Get a push when a buyer messages you — even when the dashboard is closed.</div>
      </div>
      <Btn kind="primary" onClick={()=>enable()}>Enable</Btn>
      <button className="icon-btn" aria-label="Dismiss" onClick={()=>setHidden(true)}><FA i="fa-xmark" /></button>
    </Card>
  );
}

/* ---------- CHAT (merchant ↔ buyer) — live Firestore threads ---------- */
export function Chat(){
  const { user } = useAuth();
  const uid = user?.uid;
  const live = chatEnabled(user);
  const [convos, setConvos] = useStateX(null); // null = loading
  const [sel, setSel] = useStateX(null);

  useEffX(() => { if (live) return subscribeConversations(uid, setConvos); setConvos([]); return undefined; }, [uid, live]);

  const list = convos || [];
  const selConv = list.find((c) => c.id === sel) || list[0] || null;

  return (
    <div className="anim-up">
      <h1 className="ym-h1" style={{ marginBottom:20 }}>Chats</h1>
      <MerchantNotifyBanner user={user} />
      {!live ? (
        <Card style={{ padding:'40px 24px', textAlign:'center', color:'var(--m-fg3)' }}>
          <FA i="fa-comments" style={{ fontSize:34, color:'var(--m-fg4)', marginBottom:14 }} />
          <div className="ym-h3" style={{ marginBottom:4 }}>Sign in to view customer chats</div>
          <div className="ym-sub">Your buyer conversations appear here once you’re signed in.</div>
        </Card>
      ) : (
      <Card style={{ display:'grid', gridTemplateColumns:'300px 1fr', overflow:'hidden', height:540 }} className="chat-grid">
        <div style={{ borderRight:'1px solid var(--m-border)', overflowY:'auto' }}>
          {convos === null && <div style={{ padding:'22px 16px', color:'var(--m-fg3)', fontSize:13.5 }}>Loading chats…</div>}
          {convos !== null && list.length === 0 && (
            <div style={{ padding:'26px 16px', textAlign:'center', color:'var(--m-fg3)', fontSize:13.5 }}>
              <FA i="fa-comments" style={{ fontSize:28, color:'var(--m-fg4)', marginBottom:10, display:'block' }} />
              No customer messages yet.
            </div>
          )}
          {list.map((x) => {
            const otherId = otherParticipant(x, uid);
            const info = (x.info && x.info[otherId]) || {};
            const unread = (x.unread && x.unread[uid]) || 0;
            return (
              <button key={x.id} onClick={()=>setSel(x.id)} style={{ width:'100%', textAlign:'left', border:'none', borderBottom:'1px solid var(--m-border)', cursor:'pointer', fontFamily:'inherit', padding:'13px 14px', display:'flex', gap:12, alignItems:'center', background:(selConv&&selConv.id===x.id)?'var(--m-surface-3)':'transparent' }}>
                <div style={{ position:'relative', flexShrink:0 }}><Avatar name={info.name || 'Customer'} size={44} />{unread>0 && <span style={{ position:'absolute', top:-2, right:-2, minWidth:18, height:18, borderRadius:9999, background:'var(--m-primary)', color:'#fff', fontSize:10.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--m-surface)' }}>{unread}</span>}</div>
                <div style={{ flex:1, minWidth:0 }}><div style={{ display:'flex', justifyContent:'space-between' }}><span className="ym-h3" style={{ fontSize:14 }}>{info.name || 'Customer'}</span><span className="ym-cap">{fmtWhen(x.updatedAt)}</span></div><div className="ym-sub" style={{ fontSize:12.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:unread?'var(--m-fg1)':'var(--m-fg3)', fontWeight:unread?600:400 }}>{x.lastMessage || 'New conversation'}</div></div>
              </button>
            );
          })}
        </div>
        {selConv
          ? <MerchantChatThread key={selConv.id} conv={selConv} user={user} />
          : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--m-fg3)', fontSize:14, padding:24 }}>Select a conversation.</div>}
      </Card>
      )}
      <style>{`@media (max-width:640px){ .chat-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

function MerchantChatThread({ conv, user }){
  const uid = user.uid;
  const otherId = otherParticipant(conv, uid);
  const info = (conv.info && conv.info[otherId]) || {};
  const blocked = conv.status === 'blocked';
  const [msgs, setMsgs] = useStateX([]);
  const [draft, setDraft] = useStateX('');
  const scrollRef = useRefX(null);

  useEffX(() => subscribeMessages(conv.id, setMsgs), [conv.id]);
  useEffX(() => { markConversationRead(conv.id, uid); }, [conv.id, msgs.length]);
  useEffX(() => { const el=scrollRef.current; if(el) el.scrollTop=el.scrollHeight; }, [msgs]);

  const send = (t) => {
    const v=(t||draft).trim(); if(!v || blocked) return;
    setDraft('');
    sendChatMessage({ convId: conv.id, user, text: v, recipientUid: otherId }).catch(()=>{});
  };

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:'1px solid var(--m-border)' }}>
        <Avatar name={info.name || 'Customer'} size={40} />
        <div style={{ flex:1 }}><div className="ym-h3">{info.name || 'Customer'}</div><div className="ym-cap" style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:7, height:7, borderRadius:9999, background:blocked?'var(--m-danger)':'var(--m-success)' }} /> {blocked ? 'Conversation closed' : 'Customer'}</div></div>
      </div>
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:18, display:'flex', flexDirection:'column', gap:10, background:'var(--m-bg)' }}>
        {msgs.length===0 && <div style={{ margin:'auto', color:'var(--m-fg3)', fontSize:13.5 }}>No messages yet.</div>}
        {msgs.map((m) => {
          const mine = m.senderId === uid;
          return <div key={m.id} style={{ maxWidth:'72%', padding:'10px 14px', fontSize:14, lineHeight:1.45, alignSelf:mine?'flex-end':'flex-start', background:mine?'var(--m-primary-deep)':'var(--m-surface)', color:mine?'#fff':'var(--m-fg1)', borderRadius:mine?'16px 16px 4px 16px':'16px 16px 16px 4px', boxShadow:'var(--m-shadow-card)' }}>{m.text}<div style={{ fontSize:10, opacity:.65, marginTop:4, textAlign:'right' }}>{fmtTime(m.at)}</div></div>;
        })}
      </div>
      <div style={{ display:'flex', gap:10, padding:'12px 18px', borderTop:'1px solid var(--m-border)' }}>
        <input className="ym-input" placeholder={blocked ? 'Conversation closed' : 'Reply…'} aria-label="Reply" disabled={blocked} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') send(); }} style={{ borderRadius:9999, background:'var(--m-surface-2)', border:'none', opacity:blocked?.6:1 }} />
        <button onClick={()=>send()} disabled={blocked} className="icon-btn" aria-label="Send" style={{ background:'var(--m-primary-deep)', color:'#fff', opacity:blocked?.6:1 }}><FA i="fa-paper-plane" /></button>
      </div>
    </div>
  );
}

/* ---------- YOTEAI (merchant growth assistant — grounded in real store data) ---------- */
const MERCHANT_AI_SUGGESTIONS = [
  'How is my store performing this month?',
  'Write a catchy description for my best product',
  'Which products should I restock or promote?',
  'Suggest 3 ways to grow my sales',
];

export function Assistant(){
  const { user } = useAuth();
  const { live } = useMerchant();
  const ready = chatEnabled(user);
  const [msgs, setMsgs] = useStateX([{ role:'assistant', content:'Habari! I’m YoteAI, your growth assistant. I can read your real store stats and products to write listings and give grounded sales insights. What would you like help with?' }]);
  const [draft, setDraft] = useStateX('');
  const [busy, setBusy] = useStateX(false);
  const scrollRef = useRefX(null);
  useEffX(() => { const el=scrollRef.current; if(el) el.scrollTop=el.scrollHeight; }, [msgs, busy]);

  const send = async (text) => {
    const t=(text||draft).trim(); if(!t||busy) return;
    const next=[...msgs,{ role:'user', content:t }];
    setMsgs(next); setDraft(''); setBusy(true);
    try {
      if (!ready) {
        setMsgs(m=>[...m,{ role:'assistant', content:'Sign in to your merchant account to get insights grounded in your real store data.' }]);
      } else {
        const { reply } = await aiAssistant({ role:'merchant', messages: next.map(m=>({ role:m.role, content:m.content })) });
        setMsgs(m=>[...m,{ role:'assistant', content:(reply||'').trim() || 'I couldn’t generate a response just now — please try again.' }]);
      }
    } catch (e) {
      setMsgs(m=>[...m,{ role:'assistant', content:'Sorry, I couldn’t reach the AI service. Please try again in a moment.' }]);
    } finally { setBusy(false); }
  };

  return (
    <div className="anim-up">
      <h1 className="ym-h1" style={{ marginBottom:6 }}>YoteAI</h1>
      <p className="ym-sub" style={{ marginBottom:20 }}>Your AI growth assistant — grounded in your real {live ? 'store stats and products' : 'store data'}. Ask for listing copy or data-backed insights.</p>
      <Card style={{ overflow:'hidden', display:'flex', flexDirection:'column', height:560 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', background:'var(--m-grad-deep)', boxShadow:'var(--m-glow)' }}>
          <div style={{ width:42, height:42, borderRadius:12, background:'rgba(255,255,255,.16)', display:'flex', alignItems:'center', justifyContent:'center' }}><FA i="fa-wand-magic-sparkles" style={{ color:'#fff', fontSize:17 }} /></div>
          <div style={{ flex:1 }}><div style={{ color:'#fff', fontWeight:700, fontSize:16 }}>YoteAI</div><div style={{ color:'rgba(255,255,255,.82)', fontSize:12.5, display:'flex', alignItems:'center', gap:5 }}><span style={{ width:7, height:7, borderRadius:9999, background:'#6ee7b7' }} /> Growth assistant</div></div>
        </div>
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'18px 20px', display:'flex', flexDirection:'column', gap:10, background:'var(--m-bg)' }}>
          {msgs.map((m,i)=>(
            <div key={i} style={{ maxWidth:'80%', padding:'11px 15px', fontSize:14.5, lineHeight:1.5, whiteSpace:'pre-wrap',
              alignSelf:m.role==='user'?'flex-end':'flex-start', background:m.role==='user'?'var(--m-primary-deep)':'var(--m-surface)',
              color:m.role==='user'?'#fff':'var(--m-fg1)', borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', boxShadow:'var(--m-shadow-card)' }}>{m.content}</div>
          ))}
          {busy && <div style={{ alignSelf:'flex-start', padding:'12px 16px', borderRadius:'16px 16px 16px 4px', background:'var(--m-surface)', boxShadow:'var(--m-shadow-card)', display:'flex', gap:5 }}>{[0,1,2].map(d=><span key={d} style={{ width:7, height:7, borderRadius:9999, background:'var(--m-fg4)', animation:`ym-fade 1s ease ${d*0.18}s infinite alternate` }} />)}</div>}
        </div>
        {msgs.length<=1 && (
          <div style={{ padding:'0 20px 8px', display:'flex', gap:8, flexWrap:'wrap' }}>
            {MERCHANT_AI_SUGGESTIONS.map(s=><button key={s} onClick={()=>send(s)} style={{ border:'1px solid var(--m-border)', background:'var(--m-surface)', cursor:'pointer', fontFamily:'inherit', fontSize:13, color:'var(--m-fg2)', borderRadius:12, padding:'9px 13px', display:'flex', alignItems:'center', gap:8 }}><FA i="fa-wand-magic-sparkles" style={{ color:'var(--m-primary)', fontSize:12 }} /> {s}</button>)}
          </div>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', borderTop:'1px solid var(--m-border)' }}>
          <input className="ym-input" placeholder="Ask YoteAI…" aria-label="Ask YoteAI" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') send(); }} style={{ height:48, borderRadius:9999, background:'var(--m-surface-2)', border:'none' }} />
          <button onClick={()=>send()} disabled={busy} className="icon-btn" aria-label="Send" style={{ background:'var(--m-grad)', color:'#fff', boxShadow:'var(--m-glow)', opacity:busy?.6:1 }}><FA i="fa-paper-plane" /></button>
        </div>
      </Card>
    </div>
  );
}

/* ---------- YOTEMARKET INSIGHT (tips & business intelligence) ---------- */
const INSIGHT_SUGGESTIONS = [
  'How is my store performing this month?',
  'Which of my products underperform — and why?',
  'How do my prices compare to similar products in the market?',
  'Give me 3 tips to grow my sales this week',
];

/* A market product the assistant surfaced → links to its storefront page. */
function InsightResultCard({ r }){
  return (
    <a href={`/storefront?store=${encodeURIComponent(r.storeId || '')}`} target="_blank" rel="noreferrer"
      style={{ display:'flex', alignItems:'center', gap:12, textDecoration:'none', border:'1px solid var(--m-border)', background:'var(--m-surface)', borderRadius:14, padding:10 }}>
      <div style={{ width:42, height:42, borderRadius:11, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--m-surface-2)', color:'var(--m-primary)' }}><FA i="fa-store" /></div>
      <div style={{ flex:1, minWidth:0 }}>
        <div className="ym-h3" style={{ fontSize:13.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.name}</div>
        <div className="ym-cap">{ksh(r.price)}{r.rating ? ' · ' + r.rating + '★' : ''}</div>
      </div>
      <span style={{ fontSize:12.5, fontWeight:600, color:'var(--m-link)', flexShrink:0, display:'flex', alignItems:'center', gap:5 }}>View store <FA i="fa-arrow-up-right-from-square" style={{ fontSize:10 }} /></span>
    </a>
  );
}

export function Insight(){
  const { user } = useAuth();
  const { live } = useMerchant();
  const ready = chatEnabled(user);
  const [msgs, setMsgs] = useStateX([{ role:'assistant', content:'Habari! I’m YoteMarket Insight — your business-intelligence companion. I read your real store stats, products and the wider market to surface trends, price benchmarks and practical tips. Ask me anything about your performance.' }]);
  const [draft, setDraft] = useStateX('');
  const [busy, setBusy] = useStateX(false);
  const scrollRef = useRefX(null);
  useEffX(() => { const el=scrollRef.current; if(el) el.scrollTop=el.scrollHeight; }, [msgs, busy]);

  const send = async (text) => {
    const t=(text||draft).trim(); if(!t||busy) return;
    const next=[...msgs,{ role:'user', content:t }];
    setMsgs(next); setDraft(''); setBusy(true);
    try {
      if (!ready) {
        setMsgs(m=>[...m,{ role:'assistant', content:'Sign in to your merchant account to get insights grounded in your real store data.' }]);
      } else {
        const { reply, products } = await aiAssistant({ role:'merchant', messages: next.map(m=>({ role:m.role, content:m.content })) });
        setMsgs(m=>[...m,{ role:'assistant', content:(reply||'').trim() || 'I couldn’t generate insights just now — please try again.', products: Array.isArray(products) ? products : [] }]);
      }
    } catch (e) {
      setMsgs(m=>[...m,{ role:'assistant', content:'Sorry, I couldn’t reach the AI service. Please try again in a moment.' }]);
    } finally { setBusy(false); }
  };

  return (
    <div className="anim-up">
      <h1 className="ym-h1" style={{ marginBottom:6 }}>YoteMarket Insight</h1>
      <p className="ym-sub" style={{ marginBottom:20 }}>Tips & business intelligence — grounded in your real {live ? 'store stats and products' : 'store data'} and live market prices.</p>
      <Card style={{ overflow:'hidden', display:'flex', flexDirection:'column', height:560 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', background:'var(--m-grad-deep)', boxShadow:'var(--m-glow)' }}>
          <div style={{ width:42, height:42, borderRadius:12, background:'rgba(255,255,255,.16)', display:'flex', alignItems:'center', justifyContent:'center' }}><FA i="fa-lightbulb" style={{ color:'#fff', fontSize:17 }} /></div>
          <div style={{ flex:1 }}><div style={{ color:'#fff', fontWeight:700, fontSize:16 }}>YoteMarket Insight</div><div style={{ color:'rgba(255,255,255,.82)', fontSize:12.5, display:'flex', alignItems:'center', gap:5 }}><span style={{ width:7, height:7, borderRadius:9999, background:'#6ee7b7' }} /> Tips & business intelligence</div></div>
        </div>
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'18px 20px', display:'flex', flexDirection:'column', gap:10, background:'var(--m-bg)' }}>
          {msgs.map((m,i)=>(
            <div key={i} style={{ display:'flex', flexDirection:'column', gap:8, alignItems:m.role==='user'?'flex-end':'flex-start' }}>
              <div style={{ maxWidth:'80%', padding:'11px 15px', fontSize:14.5, lineHeight:1.5, whiteSpace:'pre-wrap',
                background:m.role==='user'?'var(--m-primary-deep)':'var(--m-surface)',
                color:m.role==='user'?'#fff':'var(--m-fg1)', borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', boxShadow:'var(--m-shadow-card)' }}>{m.content}</div>
              {m.role==='assistant' && m.products && m.products.length>0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:8, width:'100%', maxWidth:'92%' }}>
                  <div className="ym-cap" style={{ fontWeight:600 }}>Comparable products in the market</div>
                  {m.products.slice(0,5).map(r=><InsightResultCard key={r.id} r={r} />)}
                </div>
              )}
            </div>
          ))}
          {busy && <div style={{ alignSelf:'flex-start', padding:'12px 16px', borderRadius:'16px 16px 16px 4px', background:'var(--m-surface)', boxShadow:'var(--m-shadow-card)', display:'flex', gap:5 }}>{[0,1,2].map(d=><span key={d} style={{ width:7, height:7, borderRadius:9999, background:'var(--m-fg4)', animation:`ym-fade 1s ease ${d*0.18}s infinite alternate` }} />)}</div>}
        </div>
        {msgs.length<=1 && (
          <div style={{ padding:'0 20px 8px', display:'flex', gap:8, flexWrap:'wrap' }}>
            {INSIGHT_SUGGESTIONS.map(s=><button key={s} onClick={()=>send(s)} style={{ border:'1px solid var(--m-border)', background:'var(--m-surface)', cursor:'pointer', fontFamily:'inherit', fontSize:13, color:'var(--m-fg2)', borderRadius:12, padding:'9px 13px', display:'flex', alignItems:'center', gap:8 }}><FA i="fa-lightbulb" style={{ color:'var(--m-primary)', fontSize:12 }} /> {s}</button>)}
          </div>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', borderTop:'1px solid var(--m-border)' }}>
          <input className="ym-input" placeholder="Ask for an insight…" aria-label="Ask YoteMarket Insight" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') send(); }} style={{ height:48, borderRadius:9999, background:'var(--m-surface-2)', border:'none' }} />
          <button onClick={()=>send()} disabled={busy} className="icon-btn" aria-label="Send" style={{ background:'var(--m-grad)', color:'#fff', boxShadow:'var(--m-glow)', opacity:busy?.6:1 }}><FA i="fa-paper-plane" /></button>
        </div>
      </Card>
    </div>
  );
}
