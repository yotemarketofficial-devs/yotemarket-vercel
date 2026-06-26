/* commerce.jsx — Storefront: Checkout (real M-Pesa STK push), Orders. */
import React from 'react';
import { addDoc, collection, serverTimestamp, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useYM, FA, Thumb, GuestGate, HubPicker, StoreMap } from './ui.jsx';
import { ymProduct, ymStore, ymPrice } from './data.js';
import { HUBS, findHub, DEFAULT_HUB_ID } from './hubs.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { mpesaStkPush, confirmPayment, db, firebaseEnabled, auth } from '../../lib/firebase.js';
const { useState: useSCm, useEffect: useEffCm, useRef: useRefCm } = React;

const DELIVERY_FEE = 150;
// Custody lifecycle (index = order.step): placed→queued→accepted→picked_up→at_hub→delivered.
const ORDER_STEPS = ['Order placed','Paid · finding a rider','Rider assigned','Picked up from store','Arrived at your hub','Collected'];
// Store-pickup lifecycle: placed→preparing(paid)→ready_pickup→delivered.
const STORE_PICKUP_STEPS = ['Order placed','Paid · preparing','Ready for pickup','Collected'];

export function CheckoutScreen(){
  const { cart, clearCart, reset, nav, toast, requireAuth, account } = useYM();
  const { hasAccount } = useAuth();
  const items = cart.map(c=>({ ...c, p:ymProduct(c.pid) })).filter(x=>x.p);
  const subtotal = items.reduce((s,x)=>s+x.p.price*x.qty,0);
  const [fulfillment, setFulfillment] = useSCm('hub'); // hub | store_pickup
  const sellStore = ymStore(items[0]?.p?.store);
  const fee = (fulfillment === 'hub' && items.length) ? DELIVERY_FEE : 0;
  const total = subtotal + fee;
  const [pay, setPay] = useSCm('mpesa');
  const [phone, setPhone] = useSCm('');
  const [phase, setPhase] = useSCm('form'); // form | waiting | timeout | paid
  const [busy, setBusy] = useSCm(false);
  const [err, setErr] = useSCm('');
  const [receipt, setReceipt] = useSCm('');
  const [hubId, setHubId] = useSCm(DEFAULT_HUB_ID);
  const [hubOpen, setHubOpen] = useSCm(false);
  const [checking, setChecking] = useSCm(false);
  const unsubRef = useRefCm(null);
  const timerRef = useRefCm(null);
  const confirmTimerRef = useRefCm(null);
  const cidRef = useRefCm(null);
  const hub = findHub(hubId) || HUBS[0];

  // Default the pickup hub to the shopper's saved choice (users/{uid}.defaultHubId).
  useEffCm(() => {
    const uid = auth?.currentUser?.uid;
    if (!firebaseEnabled || !db || !uid) return;
    getDoc(doc(db, 'users', uid)).then((s) => { const id = s.data()?.defaultHubId; if (id && findHub(id)) setHubId(id); }).catch(() => {});
  }, [hasAccount]);

  useEffCm(() => () => { if (unsubRef.current) unsubRef.current(); clearTimeout(timerRef.current); clearTimeout(confirmTimerRef.current); }, []);
  const stopWatching = () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; } clearTimeout(timerRef.current); clearTimeout(confirmTimerRef.current); };
  const settle = (rcpt) => { stopWatching(); setReceipt(rcpt); setPhase('paid'); clearCart(); };

  // Actively confirm the order payment via Daraja (independent of the callback).
  // On success settlePaid flips the payment doc to 'paid', which the listener below
  // catches and settles the UI.
  const confirmNow = async () => {
    const id = cidRef.current;
    if (!id) return;
    setChecking(true); setErr('');
    try {
      const r = await confirmPayment({ checkoutRequestId: id });
      if (!(r && (r.paid || r.settledCount))) setErr("Not confirmed yet — if you've paid, wait a few seconds and tap again.");
    } catch (e) { setErr(e.message || 'Could not confirm the payment.'); }
    finally { setChecking(false); }
  };

  // Reached only once signed in (checkout requires an account). Reads the LIVE firebase
  // user so it's correct even when invoked immediately after sign-in via requireAuth().
  const payNow = async () => {
    setErr('');
    const uid = auth?.currentUser?.uid;
    if (pay !== 'mpesa' || !firebaseEnabled || !db || !uid) {
      settle('YM-' + Math.floor(58300 + Math.random() * 99));
      return;
    }
    setBusy(true);
    try {
      const isPickup = fulfillment === 'store_pickup';
      const ref = await addDoc(collection(db, 'orders'), {
        buyerId: uid,
        storeId: items[0]?.p?.store || null,
        items: items.map(x => ({ pid: x.pid, qty: x.qty, price: x.p.price, name: x.p.name })),
        subtotal,
        deliveryFee: fee,
        total,
        status: 'placed',
        step: 0,
        steps: isPickup ? STORE_PICKUP_STEPS : ORDER_STEPS,
        fulfillment,
        ...(isPickup ? {} : { hub: hub.name, hubId: hub.id }),
        paid: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const fallbackRcpt = ref.id.slice(0, 6).toUpperCase();
      const storeName = ymStore(items[0]?.p?.store)?.name || '';
      const res = await mpesaStkPush({ orderId: ref.id, phone, amount: total, storeName });
      const checkoutRequestId = res && res.checkoutRequestId;
      setBusy(false);
      if (!checkoutRequestId) { settle(fallbackRcpt); return; }
      cidRef.current = checkoutRequestId;
      setPhase('waiting');
      // Watch the payment doc that paid/failed flips (callback OR confirmPayment).
      unsubRef.current = onSnapshot(doc(db, 'mpesa_payments', checkoutRequestId), (snap) => {
        const d = snap.data();
        if (!d) return;
        if (d.status === 'paid' || d.settled) settle(d.mpesaReceipt || fallbackRcpt);
        else if (d.status === 'failed') { stopWatching(); setErr(d.resultDesc || 'Payment was cancelled or failed. Please try again.'); setPhase('form'); }
      }, () => {});
      // ~20s in (after the PIN window), actively confirm via Daraja — don't wait on the callback.
      confirmTimerRef.current = setTimeout(confirmNow, 20000);
      // After 90s, stop blocking the UI but leave the order to settle server-side.
      timerRef.current = setTimeout(() => setPhase((p) => (p === 'waiting' ? 'timeout' : p)), 90000);
    } catch (e) {
      setBusy(false);
      setErr(e.message || 'Payment could not be started. Please try again.');
      toast('Payment failed', 'fa-triangle-exclamation');
    }
  };
  // Guests must sign in to check out; signed-in users pay immediately.
  const startCheckout = () => requireAuth(payNow);

  if(phase==='waiting'){
    return (
      <div className="wrap anim-up" style={{ paddingTop:60, maxWidth:520, textAlign:'center', paddingBottom:60, margin:'0 auto' }}>
        <div style={{ width:84, height:84, borderRadius:9999, background:'var(--m-mpesa)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:34, margin:'0 auto 20px' }}><FA i="fa-mobile-screen" /></div>
        <h1 className="ym-h1">Check your phone</h1>
        <p className="ym-body" style={{ marginTop:10 }}>We've sent an M-Pesa request to <b style={{ color:'var(--m-fg1)' }}>{phone}</b>. Enter your PIN to pay <b style={{ color:'var(--m-fg1)' }}>{ymPrice(total)}</b>.</p>
        <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginTop:22, color:'var(--m-fg3)' }}>
          <FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite', color:'var(--m-primary)' }} /> Waiting for confirmation…
        </div>
        <div className="ym-cap" style={{ marginTop:18 }}>Keep this page open — it updates automatically once you pay.</div>
        {err && <div className="ym-cap" style={{ marginTop:14, color:'var(--m-inactive-fg)' }}>{err}</div>}
        <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:22, flexWrap:'wrap' }}>
          <button className="ym-btn ym-btn-primary ym-btn-sm" disabled={checking} onClick={confirmNow}>
            {checking ? <><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite' }} /> Checking…</> : <><FA i="fa-rotate" /> I've paid — confirm now</>}
          </button>
          <button className="ym-btn ym-btn-ghost ym-btn-sm" onClick={()=>{ stopWatching(); setPhase('timeout'); }}>I'll track it later</button>
        </div>
      </div>
    );
  }

  if(phase==='timeout'){
    return (
      <div className="wrap anim-up" style={{ paddingTop:60, maxWidth:520, textAlign:'center', paddingBottom:60, margin:'0 auto' }}>
        <div style={{ width:84, height:84, borderRadius:9999, background:'var(--m-pending-bg)', color:'var(--m-pending-fg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 20px' }}><FA i="fa-clock" /></div>
        <h1 className="ym-h1">Almost there</h1>
        <p className="ym-body" style={{ marginTop:10 }}>Your M-Pesa request was sent to <b style={{ color:'var(--m-fg1)' }}>{phone}</b>. If you complete it, your order confirms automatically — follow it in <b style={{ color:'var(--m-fg1)' }}>My orders</b>.</p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:22 }}>
          <button className="ym-btn ym-btn-primary" onClick={()=>{ clearCart(); nav('orders'); }}><FA i="fa-box" /> Go to my orders</button>
          <button className="ym-btn ym-btn-ghost" onClick={()=>{ clearCart(); reset('home'); }}>Keep shopping</button>
        </div>
      </div>
    );
  }

  if(phase==='paid'){
    return (
      <div className="wrap anim-up" style={{ paddingTop:48, maxWidth:560, textAlign:'center', paddingBottom:40, margin:'0 auto' }}>
        <div style={{ width:84, height:84, borderRadius:9999, background:'var(--m-success)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, margin:'0 auto 18px' }}><FA i="fa-check" /></div>
        <h1 className="ym-h1">Payment confirmed!</h1>
        <p className="ym-body" style={{ marginTop:8 }}>Your order is confirmed and being prepared. You'll collect at <b style={{ color:'var(--m-fg1)' }}>{fulfillment==='store_pickup' ? (sellStore?.name || 'the store') : hub.name}</b> — we'll notify you when it's ready.</p>
        <div className="ym-card" style={{ padding:20, margin:'24px 0', textAlign:'left' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}><span className="ym-sub">M-Pesa receipt</span><span className="ym-h3">{receipt}</span></div>
          <div style={{ display:'flex', justifyContent:'space-between' }}><span className="ym-sub">Total paid</span><span className="ym-h3">{ymPrice(total)}</span></div>
        </div>
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <button className="ym-btn ym-btn-primary" onClick={()=>nav('orders')}><FA i="fa-box" /> Track order</button>
          <button className="ym-btn ym-btn-ghost" onClick={()=>reset('home')}>Keep shopping</button>
        </div>
      </div>
    );
  }

  if(items.length===0){
    return <div className="wrap anim-up" style={{ paddingTop:60, textAlign:'center', paddingBottom:60 }}>
      <FA i="fa-cart-shopping" style={{ fontSize:44, color:'var(--m-fg4)', marginBottom:14 }} />
      <div className="ym-h2">Your cart is empty</div>
      <button className="ym-btn ym-btn-primary" style={{ margin:'18px auto 0', width:200 }} onClick={()=>reset('home')}>Browse the mall</button>
    </div>;
  }

  return (
    <div className="wrap anim-up" style={{ paddingTop:24, paddingBottom:40 }}>
      <button onClick={()=>nav('home')} className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginBottom:18 }}><FA i="fa-arrow-left" /> Continue shopping</button>
      <h1 className="ym-h1" style={{ marginBottom:24 }}>Checkout</h1>
      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:28, alignItems:'start' }} className="checkout-grid">
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          {/* fulfillment */}
          <div className="ym-card" style={{ padding:22 }}>
            <div className="ym-h3" style={{ marginBottom:14, display:'flex', alignItems:'center', gap:8 }}><FA i="fa-truck-fast" style={{ color:'var(--m-primary)' }} /> How would you like it?</div>
            <div style={{ display:'flex', gap:10, marginBottom:16 }} className="fulfil-row">
              {[['hub','fa-warehouse','Hub delivery',`Delivered to a YoteMarket hub · ${ymPrice(DELIVERY_FEE)}`],['store_pickup','fa-store','Pick up from store',`Collect from ${sellStore?.name || 'the store'} · Free`]].map(([id,ic,t,sub])=>(
                <button key={id} onClick={()=>setFulfillment(id)} style={{ flex:1, textAlign:'left', padding:14, borderRadius:14, cursor:'pointer', fontFamily:'inherit', background:'var(--m-surface)', border: fulfillment===id?'2px solid var(--m-primary)':'2px solid var(--m-border)' }}>
                  <FA i={ic} style={{ fontSize:18, color: fulfillment===id?'var(--m-primary)':'var(--m-fg3)' }} />
                  <div className="ym-h3" style={{ fontSize:14, marginTop:8 }}>{t}</div>
                  <div className="ym-cap" style={{ marginTop:2 }}>{sub}</div>
                </button>
              ))}
            </div>
            {fulfillment==='hub' ? (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:14, padding:14, borderRadius:14, border:'2px solid var(--m-primary)', background:'var(--m-surface-3)' }}>
                  <div style={{ width:44, height:44, borderRadius:13, background:'var(--m-primary)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}><FA i="fa-warehouse" /></div>
                  <div style={{ flex:1 }}><div className="ym-h3" style={{ fontSize:14 }}>{hub.name}</div><div className="ym-cap">{hub.area} · secure pickup</div></div>
                  <FA i="fa-circle-check" style={{ color:'var(--m-primary)', fontSize:18 }} />
                </div>
                <button className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginTop:12 }} onClick={()=>setHubOpen(true)}><FA i="fa-pen" /> Change hub</button>
              </>
            ) : (
              <div>
                <div className="ym-h3" style={{ fontSize:14, marginBottom:4 }}>Collect from {sellStore?.name || 'the store'}</div>
                <div className="ym-cap" style={{ marginBottom:12 }}>We'll let you know when it's ready — bring your pickup code.</div>
                <StoreMap store={sellStore} />
              </div>
            )}
          </div>
          {/* payment */}
          <div className="ym-card" style={{ padding:22 }}>
            <div className="ym-h3" style={{ marginBottom:14, display:'flex', alignItems:'center', gap:8 }}><FA i="fa-wallet" style={{ color:'var(--m-primary)' }} /> Payment method</div>
            {[['mpesa','M-Pesa','fa-mobile-screen','var(--m-mpesa)'],['wallet','YoteMarket wallet','fa-wallet','var(--m-primary)'],['cash','Cash on pickup','fa-money-bills','var(--m-fg3)']].map(([id,label,ic,col])=>(
              <button key={id} onClick={()=>setPay(id)} style={{ display:'flex', alignItems:'center', gap:14, width:'100%', padding:14, borderRadius:14, marginBottom:10, cursor:'pointer', fontFamily:'inherit', textAlign:'left', background:'var(--m-surface)', border: pay===id?'2px solid var(--m-primary)':'2px solid var(--m-border)' }}>
                <div style={{ width:40, height:40, borderRadius:11, background:'var(--m-surface-2)', color:col, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}><FA i={ic} /></div>
                <span className="ym-h3" style={{ flex:1, fontSize:14 }}>{label}</span>
                {pay===id && <FA i="fa-circle-check" style={{ color:'var(--m-primary)', fontSize:18 }} />}
              </button>
            ))}
            {pay==='mpesa' && <div style={{ marginTop:6 }}><label className="ym-label">M-Pesa phone number</label><input className="ym-input" value={phone} onChange={e=>setPhone(e.target.value)} inputMode="tel" /></div>}
          </div>
        </div>

        {/* summary */}
        <div className="ym-card" style={{ padding:22, position:'sticky', top:150 }}>
          <div className="ym-h3" style={{ marginBottom:14 }}>Order summary</div>
          <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:14 }}>
            {items.map(x=>(
              <div key={x.pid} style={{ display:'flex', gap:12, alignItems:'center' }}>
                <Thumb icon={x.p.icon} tint={'#7c3aed'} size={48} radius={12} img={x.p.img} />
                <div style={{ flex:1, minWidth:0 }}><div className="ym-sub" style={{ color:'var(--m-fg1)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{x.p.name}</div><div className="ym-cap">Qty {x.qty}</div></div>
                <div className="ym-sub" style={{ fontWeight:700, color:'var(--m-fg1)' }}>{ymPrice(x.p.price*x.qty)}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid var(--m-border)', paddingTop:14, display:'flex', flexDirection:'column', gap:8 }}>
            <Row l="Subtotal" v={ymPrice(subtotal)} />
            {fulfillment==='hub' ? <Row l="Hub delivery" v={ymPrice(fee)} /> : <Row l="Store pickup" v="Free" />}
            <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, borderTop:'1px solid var(--m-border)' }}><span className="ym-h3">Total</span><span className="ym-h2" style={{ fontSize:22 }}>{ymPrice(total)}</span></div>
          </div>
          {err && <div role="alert" style={{ display:'flex', gap:9, alignItems:'center', background:'var(--m-inactive-bg)', color:'var(--m-inactive-fg)', borderRadius:11, padding:'11px 14px', fontSize:13, fontWeight:500, marginTop:14 }}><FA i="fa-circle-exclamation" /> {err}</div>}
          {!hasAccount
            ? <button className="ym-btn ym-btn-primary" style={{ width:'100%', marginTop:18 }} onClick={startCheckout}><FA i="fa-right-to-bracket" /> Sign in to check out · {ymPrice(total)}</button>
            : <button className="ym-btn ym-btn-mpesa" disabled={busy} style={{ width:'100%', marginTop:18 }} onClick={startCheckout}>
                {busy ? <><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite' }} /> Sending request…</> : <><FA i="fa-bolt" /> {pay==='mpesa'?`Pay ${ymPrice(total)} with M-Pesa`:`Place order · ${ymPrice(total)}`}</>}
              </button>}
          {!hasAccount && <div className="ym-cap" style={{ textAlign:'center', marginTop:8 }}>Browse freely as a guest — an account is only needed to pay &amp; track orders.</div>}
          <div className="ym-cap" style={{ textAlign:'center', marginTop:10, display:'flex', gap:6, justifyContent:'center' }}><FA i="fa-lock" /> Secure payment · escrow protected</div>
        </div>
      </div>
      {hubOpen && <HubPicker selected={hubId} onSelect={(h)=>setHubId(h.id)} onClose={()=>setHubOpen(false)} />}
      <style>{`@media (max-width:760px){ .checkout-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}
function Row({ l, v }){ return <div style={{ display:'flex', justifyContent:'space-between' }}><span className="ym-sub">{l}</span><span className="ym-sub" style={{ fontWeight:600, color:'var(--m-fg1)' }}>{v}</span></div>; }

/* ---------- ORDERS ---------- */
const fmtPlaced = (o) => o.placed
  || (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toLocaleString('en-KE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '');

// Normalise a demo or live order doc to the shape this screen renders.
function orderView(o){
  const items = Array.isArray(o.items) ? o.items : [];
  const first = items[0] ? ymProduct(items[0].pid) : null;
  const code = (typeof o.id === 'string' && o.id.length > 12) ? 'YM-' + o.id.slice(-6).toUpperCase() : o.id;
  return {
    raw:o, code, items, first,
    firstName: items[0]?.name,
    store: o.store || o.storeId || first?.store || null,
    total: o.total || 0,
    status: o.status || 'placed',
    steps: Array.isArray(o.steps) && o.steps.length ? o.steps : ORDER_STEPS,
    step: o.step || 0,
    hub: o.hub || '',
    placedTxt: fmtPlaced(o),
    eta: o.eta, rider: o.rider,
  };
}

export function OrdersScreen(){
  const { reset, account, liveOrders } = useYM();
  if (!account.hasAccount) return <GuestGate icon="fa-box" title="Your orders" sub="Sign in to view and track your orders, deliveries, and hub pickups." />;
  const orders = (liveOrders || []).map(orderView); // live-only — no mock fallback
  const tone = { placed:'pending', queued:'pending', accepted:'pending', picked_up:'pending', at_hub:'active', preparing:'pending', ready_pickup:'active', delivered:'active', out:'pending', awaiting:'pending' };
  const label = { placed:'Order placed', queued:'Finding a rider', accepted:'Rider assigned', picked_up:'Picked up', at_hub:'Ready for pickup', preparing:'Preparing', ready_pickup:'Ready for pickup', delivered:'Collected', confirmed:'Confirmed', out:'Out for delivery', awaiting:'Ready for pickup' };

  return (
    <div className="wrap anim-up" style={{ paddingTop:24, paddingBottom:40, maxWidth:840 }}>
      <button onClick={()=>reset('home')} className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginBottom:18 }}><FA i="fa-arrow-left" /> Home</button>
      <h1 className="ym-h1" style={{ marginBottom:24 }}>My orders</h1>
      {orders.length === 0 ? (
        <div style={{ textAlign:'center', padding:'70px 20px' }}>
          <FA i="fa-box-open" style={{ fontSize:44, color:'var(--m-fg4)', marginBottom:14 }} />
          <div className="ym-h2">No orders yet</div>
          <div className="ym-sub" style={{ marginTop:4 }}>When you check out, your orders and hub pickups show up here.</div>
          <button className="ym-btn ym-btn-primary" style={{ margin:'18px auto 0', width:200 }} onClick={()=>reset('home')}>Browse the mall</button>
        </div>
      ) : (
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {orders.map(o=>{
          const store = o.store ? ymStore(o.store) : null;
          const first = o.first;
          const name = store?.name || o.firstName || 'YoteMarket order';
          return (
            <div key={o.raw.id} className="ym-card" style={{ padding:20 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span className="ym-h3">{o.code}</span><span className={'ym-pill ym-pill-'+(tone[o.status]||'pending')}>{label[o.status]||o.status}</span>
                </div>
                <span className="ym-cap">{o.placedTxt}</span>
              </div>
              <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:16 }}>
                <Thumb icon={first?.icon || 'fa-box'} tint={store?.tint || '#7c3aed'} size={56} radius={14} img={first?.img} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="ym-h3" style={{ fontSize:14 }}>{name}</div>
                  <div className="ym-cap">{o.items.reduce((n,i)=>n+(i.qty||1),0)} item{o.items.length!==1?'s':''}{o.hub?` · ${o.hub.split(' · ')[0]}`:''}</div>
                </div>
                <div style={{ fontWeight:700, color:'var(--m-fg1)' }}>{ymPrice(o.total)}</div>
              </div>
              {/* step progress */}
              <div style={{ display:'flex', alignItems:'center', gap:0 }}>
                {o.steps.map((st,i)=>(
                  <React.Fragment key={i}>
                    <div style={{ width:22, height:22, borderRadius:9999, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff', background: i<=o.step?'var(--m-success)':'var(--m-surface-2)' }}>{i<=o.step?<FA i="fa-check" />:<span style={{ color:'var(--m-fg4)' }}>{i+1}</span>}</div>
                    {i<o.steps.length-1 && <div style={{ flex:1, height:3, background: i<o.step?'var(--m-success)':'var(--m-border)' }} />}
                  </React.Fragment>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
                <span className="ym-cap">{o.steps[o.step] || o.steps[0]}</span>
                {o.status==='out' && o.rider && <span className="ym-cap" style={{ color:'var(--m-primary)', fontWeight:600 }}>{o.rider}{o.eta?` · ${o.eta} away`:''}</span>}
              </div>
              {/* pickup code — when ready to collect (hub ③ or store-pickup) */}
              {(o.status==='at_hub' || o.status==='ready_pickup') && o.raw?.pickupCode && (
                <div style={{ marginTop:16, padding:'15px 18px', borderRadius:14, background:'var(--m-grad-deep)', color:'#fff', display:'flex', alignItems:'center', gap:15, boxShadow:'var(--m-glow)' }}>
                  <FA i="fa-box-open" style={{ fontSize:22, opacity:.9 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, opacity:.85 }}>Ready at {o.raw.fulfillment==='store_pickup' ? (store?.name || 'the store') : (o.hub ? o.hub.split(' · ')[0] : 'your hub')} — show this code to collect</div>
                    <div style={{ fontSize:28, fontWeight:800, letterSpacing:5 }}>{o.raw.pickupCode}</div>
                  </div>
                </div>
              )}
              {/* store-pickup: map + directions while the order is in progress */}
              {o.raw?.fulfillment==='store_pickup' && o.status!=='delivered' && store && (
                <div style={{ marginTop:16 }}><StoreMap store={store} height={150} /></div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
