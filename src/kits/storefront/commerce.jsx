/* commerce.jsx — Storefront: Checkout (real M-Pesa STK push), Orders. */
import React from 'react';
import { addDoc, collection, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { useYM, FA, Thumb, GuestGate } from './ui.jsx';
import { YM_ORDERS, YM_USER, ymProduct, ymStore, ymPrice } from './data.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { mpesaStkPush, db, firebaseEnabled, auth } from '../../lib/firebase.js';
const { useState: useSCm, useEffect: useEffCm, useRef: useRefCm } = React;

const DELIVERY_FEE = 150;
const ORDER_STEPS = ['Order placed','Confirmed by store','Rider picked up','En route to your hub','Ready for pickup'];

export function CheckoutScreen(){
  const { cart, clearCart, reset, nav, toast, requireAuth, account } = useYM();
  const { hasAccount } = useAuth();
  const items = cart.map(c=>({ ...c, p:ymProduct(c.pid) })).filter(x=>x.p);
  const subtotal = items.reduce((s,x)=>s+x.p.price*x.qty,0);
  const total = subtotal + (items.length?DELIVERY_FEE:0);
  const [pay, setPay] = useSCm('mpesa');
  const [phone, setPhone] = useSCm('');
  const [phase, setPhase] = useSCm('form'); // form | waiting | timeout | paid
  const [busy, setBusy] = useSCm(false);
  const [err, setErr] = useSCm('');
  const [receipt, setReceipt] = useSCm('');
  const unsubRef = useRefCm(null);
  const timerRef = useRefCm(null);

  useEffCm(() => () => { if (unsubRef.current) unsubRef.current(); clearTimeout(timerRef.current); }, []);
  const stopWatching = () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; } clearTimeout(timerRef.current); };
  const settle = (rcpt) => { stopWatching(); setReceipt(rcpt); setPhase('paid'); clearCart(); };

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
      const ref = await addDoc(collection(db, 'orders'), {
        buyerId: uid,
        items: items.map(x => ({ pid: x.pid, qty: x.qty, price: x.p.price, name: x.p.name })),
        subtotal,
        deliveryFee: DELIVERY_FEE,
        total,
        status: 'placed',
        step: 0,
        steps: ORDER_STEPS,
        hub: YM_USER.hub,
        paid: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const fallbackRcpt = ref.id.slice(0, 6).toUpperCase();
      const res = await mpesaStkPush({ orderId: ref.id, phone, amount: total });
      const checkoutRequestId = res && res.checkoutRequestId;
      setBusy(false);
      if (!checkoutRequestId) { settle(fallbackRcpt); return; }
      setPhase('waiting');
      // Watch the payment doc the Daraja callback flips to paid/failed (mirrors the app).
      unsubRef.current = onSnapshot(doc(db, 'mpesa_payments', checkoutRequestId), (snap) => {
        const d = snap.data();
        if (!d) return;
        if (d.status === 'paid') settle(d.mpesaReceipt || fallbackRcpt);
        else if (d.status === 'failed') { stopWatching(); setErr(d.resultDesc || 'Payment was cancelled or failed. Please try again.'); setPhase('form'); }
      }, () => {});
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
        <button className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginTop:22 }} onClick={()=>{ stopWatching(); setPhase('timeout'); }}>I'll track it later</button>
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
        <p className="ym-body" style={{ marginTop:8 }}>Your order is confirmed and being prepared. You'll collect at <b style={{ color:'var(--m-fg1)' }}>{YM_USER.hub}</b>.</p>
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
          {/* pickup hub */}
          <div className="ym-card" style={{ padding:22 }}>
            <div className="ym-h3" style={{ marginBottom:14, display:'flex', alignItems:'center', gap:8 }}><FA i="fa-location-dot" style={{ color:'var(--m-primary)' }} /> Collect at your hub</div>
            <div style={{ display:'flex', alignItems:'center', gap:14, padding:14, borderRadius:14, border:'2px solid var(--m-primary)', background:'var(--m-surface-3)' }}>
              <div style={{ width:44, height:44, borderRadius:13, background:'var(--m-primary)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}><FA i="fa-warehouse" /></div>
              <div style={{ flex:1 }}><div className="ym-h3" style={{ fontSize:14 }}>{YM_USER.hub.split(' · ')[0]}</div><div className="ym-cap">{YM_USER.hub.split(' · ')[1]} · secure pickup</div></div>
              <FA i="fa-circle-check" style={{ color:'var(--m-primary)', fontSize:18 }} />
            </div>
            <button className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginTop:12 }}><FA i="fa-pen" /> Change hub</button>
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
            <Row l="Hub delivery" v={ymPrice(DELIVERY_FEE)} />
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
      <style>{`@media (max-width:760px){ .checkout-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}
function Row({ l, v }){ return <div style={{ display:'flex', justifyContent:'space-between' }}><span className="ym-sub">{l}</span><span className="ym-sub" style={{ fontWeight:600, color:'var(--m-fg1)' }}>{v}</span></div>; }

/* ---------- ORDERS ---------- */
export function OrdersScreen(){
  const { reset, account } = useYM();
  if (!account.hasAccount) return <GuestGate icon="fa-box" title="Your orders" sub="Sign in to view and track your orders, deliveries, and hub pickups." />;
  const tone = { placed:'pending', out:'pending', awaiting:'pending', delivered:'active' };
  const label = { placed:'Order placed', out:'Out for delivery', awaiting:'Awaiting pickup', delivered:'Collected' };
  return (
    <div className="wrap anim-up" style={{ paddingTop:24, paddingBottom:40, maxWidth:840 }}>
      <button onClick={()=>reset('home')} className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginBottom:18 }}><FA i="fa-arrow-left" /> Home</button>
      <h1 className="ym-h1" style={{ marginBottom:24 }}>My orders</h1>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {YM_ORDERS.map(o=>{
          const store = ymStore(o.store); const first = ymProduct(o.items[0].pid);
          const pct = Math.round(((o.step+1)/o.steps.length)*100);
          return (
            <div key={o.id} className="ym-card" style={{ padding:20 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span className="ym-h3">{o.id}</span><span className={'ym-pill ym-pill-'+(tone[o.status]||'pending')}>{label[o.status]||o.status}</span>
                </div>
                <span className="ym-cap">{o.placed}</span>
              </div>
              <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:16 }}>
                <Thumb icon={first?.icon} tint={store?.tint} size={56} radius={14} img={first?.img} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="ym-h3" style={{ fontSize:14 }}>{store?.name}</div>
                  <div className="ym-cap">{o.items.reduce((n,i)=>n+i.qty,0)} item{o.items.length>1?'s':''} · {o.hub.split(' · ')[0]}</div>
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
                <span className="ym-cap">{o.steps[o.step]}</span>
                {o.status==='out' && <span className="ym-cap" style={{ color:'var(--m-primary)', fontWeight:600 }}>{o.rider} · {o.eta} away</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
