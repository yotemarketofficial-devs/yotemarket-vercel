/* commerce.jsx — Storefront: Checkout (real M-Pesa STK push), Orders. */
import React from 'react';
import { addDoc, collection, serverTimestamp, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useYM, FA, Thumb, GuestGate, HubPicker, StoreMap, HubMap, Modal } from './ui.jsx';
import { ymProduct, ymStore, ymPrice } from './data.js';
import { HUBS, findHub, DEFAULT_HUB_ID } from './hubs.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { mpesaStkPush, confirmPayment, payOrderWithWallet, placeCashOrder, cancelOrder, submitReview, db, firebaseEnabled, auth } from '../../lib/firebase.js';
const { useState: useSCm, useEffect: useEffCm, useRef: useRefCm } = React;

const DELIVERY_FEE = 150;
// Custody lifecycle (index = order.step): placed→queued→accepted→picked_up→at_hub→delivered.
const ORDER_STEPS = ['Order placed','Paid · finding a rider','Rider assigned','Picked up from store','Arrived at your hub','Collected'];
// Store-pickup lifecycle: placed→preparing(paid)→ready_pickup→delivered.
const STORE_PICKUP_STEPS = ['Order placed','Paid · preparing','Ready for pickup','Collected'];

export function CheckoutScreen(){
  const { cart, clearCart, reset, nav, back, toast, requireAuth, account } = useYM();
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
  const [paidMethod, setPaidMethod] = useSCm('mpesa');
  const [hubId, setHubId] = useSCm(DEFAULT_HUB_ID);
  const [hubOpen, setHubOpen] = useSCm(false);
  const [checking, setChecking] = useSCm(false);
  const unsubRef = useRefCm(null);
  const timerRef = useRefCm(null);
  const confirmTimerRef = useRefCm(null);
  const cidRef = useRefCm(null);
  const hub = findHub(hubId) || HUBS[0];

  // Prefill from the shopper's profile: default pickup hub + M-Pesa phone.
  useEffCm(() => {
    const uid = auth?.currentUser?.uid;
    if (!firebaseEnabled || !db || !uid) return;
    getDoc(doc(db, 'users', uid)).then((s) => {
      const d = s.data() || {};
      if (d.defaultHubId && findHub(d.defaultHubId)) setHubId(d.defaultHubId);
      if (d.phone) setPhone((cur) => cur || d.phone);
    }).catch(() => {});
  }, [hasAccount]);

  useEffCm(() => () => { if (unsubRef.current) unsubRef.current(); clearTimeout(timerRef.current); clearTimeout(confirmTimerRef.current); }, []);
  const stopWatching = () => { if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; } clearTimeout(timerRef.current); clearTimeout(confirmTimerRef.current); };
  const settle = (rcpt, method) => { stopWatching(); setReceipt(rcpt); if (method) setPaidMethod(method); setPhase('paid'); clearCart(); };

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
    // Demo mode only (no backend): optimistic confirmation.
    if (!firebaseEnabled || !db || !uid) { settle('YM-' + Math.floor(58300 + Math.random() * 99), pay); return; }
    if (pay === 'mpesa' && !phone.trim()) { setErr('Enter your M-Pesa number.'); return; }
    setBusy(true);
    try {
      const isPickup = fulfillment === 'store_pickup';
      const storeName = ymStore(items[0]?.p?.store)?.name || '';
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
        payMethod: pay,
        ...(isPickup ? {} : { hub: hub.name, hubId: hub.id }),
        paid: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const fallbackRcpt = ref.id.slice(0, 6).toUpperCase();

      // Wallet: charge the YoteMarket wallet (server deducts + marks paid + dispatches).
      if (pay === 'wallet') {
        await payOrderWithWallet({ orderId: ref.id });
        setBusy(false); settle('Wallet · ' + fallbackRcpt, 'wallet'); return;
      }
      // Cash on collection: track the order, pay at handover.
      if (pay === 'cash') {
        await placeCashOrder({ orderId: ref.id });
        setBusy(false); settle(fallbackRcpt, 'cash'); return;
      }

      // M-Pesa STK.
      const res = await mpesaStkPush({ orderId: ref.id, phone, amount: total, storeName });
      const checkoutRequestId = res && res.checkoutRequestId;
      setBusy(false);
      if (!checkoutRequestId) { settle(fallbackRcpt, 'mpesa'); return; }
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
        <div style={{ width:84, height:84, borderRadius:9999, background:'var(--m-success)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, margin:'0 auto 18px' }}><FA i={paidMethod==='cash'?'fa-box-check':'fa-check'} /></div>
        <h1 className="ym-h1">{paidMethod==='cash' ? 'Order placed!' : 'Payment confirmed!'}</h1>
        <p className="ym-body" style={{ marginTop:8 }}>{paidMethod==='cash' ? <>Your order is being prepared — <b style={{ color:'var(--m-fg1)' }}>pay {ymPrice(total)} on collection</b> at </> : <>Your order is confirmed and being prepared. You'll collect at </>}<b style={{ color:'var(--m-fg1)' }}>{fulfillment==='store_pickup' ? (sellStore?.name || 'the store') : hub.name}</b> — we'll notify you when it's ready.</p>
        <div className="ym-card" style={{ padding:20, margin:'24px 0', textAlign:'left' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}><span className="ym-sub">{paidMethod==='cash'?'Order':paidMethod==='wallet'?'Wallet payment':'M-Pesa receipt'}</span><span className="ym-h3">{receipt}</span></div>
          <div style={{ display:'flex', justifyContent:'space-between' }}><span className="ym-sub">{paidMethod==='cash'?'Amount due':'Total paid'}</span><span className="ym-h3">{ymPrice(total)}</span></div>
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
      <button onClick={back} className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginBottom:18 }}><FA i="fa-arrow-left" /> Back</button>
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
          {Math.floor(total/100) > 0 && <div className="ym-cap" style={{ marginTop:10, display:'flex', gap:7, alignItems:'center', color:'var(--m-primary)' }}><FA i="fa-gift" /> Earn {Math.floor(total/100)} YotePoint{Math.floor(total/100)!==1?'s':''} on this order</div>}
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

/* Lazy-loads the order's tax invoice (invoices/inv_<orderId>) and shows the VAT
   breakdown + invoice number on demand. */
function OrderInvoice({ orderId }){
  const [inv, setInv] = useSCm(null);
  const [open, setOpen] = useSCm(false);
  const [loaded, setLoaded] = useSCm(false);
  const toggle = async () => {
    setOpen(o=>!o);
    if (loaded || !firebaseEnabled || !db) return;
    setLoaded(true);
    try { const s = await getDoc(doc(db, 'invoices', 'inv_'+orderId)); if (s.exists()) setInv(s.data()); } catch { /* none yet */ }
  };
  return (
    <div style={{ marginTop:14, borderTop:'1px solid var(--m-border)', paddingTop:12 }}>
      <button onClick={toggle} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, color:'var(--m-link)', display:'inline-flex', gap:7, alignItems:'center', padding:0 }}>
        <FA i="fa-file-invoice" /> {open ? 'Hide tax invoice' : 'Tax invoice'}
      </button>
      {open && (inv ? (
        <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
          <div className="ym-cap">{inv.invoiceNo}{inv.kraPin ? ` · KRA PIN ${inv.kraPin}` : ''}</div>
          <Row l="Taxable amount" v={ymPrice(inv.subtotalTaxable)} />
          <Row l={inv.vatRegistered ? 'VAT (16%)' : 'VAT'} v={inv.vatRegistered ? ymPrice(inv.vat) : 'Not registered'} />
          <div style={{ display:'flex', justifyContent:'space-between', paddingTop:6, borderTop:'1px solid var(--m-border)' }}><span className="ym-h3" style={{ fontSize:13.5 }}>Total</span><span className="ym-h3" style={{ fontSize:13.5 }}>{ymPrice(inv.total)}</span></div>
        </div>
      ) : <div className="ym-cap" style={{ marginTop:8 }}>{loaded ? 'Your invoice will be ready shortly after payment confirms.' : 'Loading…'}</div>)}
    </div>
  );
}

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

const STATUS_TONE = { placed:'pending', queued:'pending', accepted:'pending', picked_up:'pending', at_hub:'active', preparing:'pending', ready_pickup:'active', delivered:'active', out:'pending', awaiting:'pending', cancelled:'inactive' };
const STATUS_LABEL = { placed:'Order placed', queued:'Finding a rider', accepted:'Rider assigned', picked_up:'Picked up', at_hub:'Ready for pickup', preparing:'Preparing', ready_pickup:'Ready for pickup', delivered:'Collected', confirmed:'Confirmed', out:'Out for delivery', awaiting:'Ready for pickup', cancelled:'Cancelled' };
// A buyer/merchant can cancel until the goods physically move (mirrors the server).
const CANCELLABLE = ['placed','queued','preparing','ready_pickup'];

/* Inline per-product rating for a delivered order — the natural place to review
   after receiving your items. Submits via the same submitReview callable. */
function ItemReview({ productId }){
  const { toast, requireAuth } = useYM();
  const { user } = useAuth();
  const [rating, setRating] = useSCm(0);
  const [hover, setHover] = useSCm(0);
  const [busy, setBusy] = useSCm(false);
  const [done, setDone] = useSCm(false);
  const pick = (n) => {
    if (!user?.uid) { requireAuth(()=>{}); return; }
    setRating(n); setBusy(true);
    submitReview({ productId, rating:n })
      .then(()=>{ setDone(true); toast('Thanks for rating!', 'fa-star'); })
      .catch(e=>toast(e.message || 'Could not submit', 'fa-triangle-exclamation'))
      .finally(()=>setBusy(false));
  };
  if (done) return <span className="ym-cap" style={{ color:'var(--m-success)' }}><FA i="fa-check" /> Rated</span>;
  return (
    <span style={{ display:'inline-flex', gap:3, opacity:busy?.5:1 }} onMouseLeave={()=>setHover(0)}>
      {[1,2,3,4,5].map(n=>(
        <button key={n} type="button" disabled={busy} onClick={()=>pick(n)} onMouseEnter={()=>setHover(n)} aria-label={`${n} star`}
          style={{ background:'none', border:'none', cursor:'pointer', padding:0, fontSize:16, lineHeight:1, color:(hover||rating)>=n?'#f5a524':'var(--m-fg4)' }}>
          <i className={`fa-star ${(hover||rating)>=n?'fas':'far'}`} />
        </button>
      ))}
    </span>
  );
}

/* Full order details — every line item with its product picture, the price
   breakdown, fulfilment + directions map, pickup code, points earned and the
   tax invoice. Opened by tapping an order. */
function OrderDetail({ view, onClose }){
  const { toast } = useYM();
  const o = view.raw;
  const store = view.store ? ymStore(view.store) : null;
  const hub = o.hubId ? findHub(o.hubId) : null;
  const isPickup = o.fulfillment === 'store_pickup';
  const orderNo = o.orderNo || view.code;
  const delivered = view.status === 'delivered';
  const canCancel = CANCELLABLE.includes(view.status);
  const [cancelling, setCancelling] = useSCm(false);
  const cancel = async () => {
    if (!window.confirm(o.paid ? 'Cancel this order? You’ll be refunded to your YoteWallet.' : 'Cancel this order?')) return;
    setCancelling(true);
    try { const r = await cancelOrder({ orderId:o.id }); toast(r.refunded>0 ? `Order cancelled · ${ymPrice(r.refunded)} refunded to wallet` : 'Order cancelled', 'fa-circle-check'); onClose(); }
    catch (e) { toast(e.message || 'Could not cancel', 'fa-triangle-exclamation'); setCancelling(false); }
  };
  return (
    <Modal title="Order details" onClose={onClose} maxWidth={540}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap', marginBottom:14 }}>
        <div>
          <div className="ym-h3" style={{ fontFamily:'monospace' }}>{orderNo}</div>
          <div className="ym-cap">{view.placedTxt}</div>
        </div>
        <span className={'ym-pill ym-pill-'+(STATUS_TONE[view.status]||'pending')}>{STATUS_LABEL[view.status]||view.status}</span>
      </div>

      {store && (
        <div className="ym-card" style={{ display:'flex', alignItems:'center', gap:12, padding:12, marginBottom:14 }}>
          <Thumb icon={store.icon} tint={store.tint} size={40} radius={10} img={store.logo || store.img} />
          <div style={{ flex:1, minWidth:0 }}><div className="ym-h3" style={{ fontSize:14 }}>{store.name}</div><div className="ym-cap">{isPickup ? 'Collect from store' : 'Delivery order'}</div></div>
        </div>
      )}

      <div className="ym-h3" style={{ fontSize:14, marginBottom:8 }}>{view.items.length} item{view.items.length!==1?'s':''}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
        {view.items.map((it,i)=>{
          const p = ymProduct(it.pid);
          return (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Thumb icon={p?.icon || 'fa-box'} tint={store?.tint || '#7c3aed'} size={48} radius={12} img={p?.img} />
              <div style={{ flex:1, minWidth:0 }}>
                <div className="ym-sub" style={{ color:'var(--m-fg1)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.name || p?.name || 'Item'}</div>
                <div className="ym-cap" style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>{ymPrice(it.price||0)} × {it.qty||1}{delivered && it.pid && <>· <ItemReview productId={it.pid} /></>}</div>
              </div>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--m-fg1)' }}>{ymPrice((it.price||0)*(it.qty||1))}</div>
            </div>
          );
        })}
      </div>

      <div style={{ borderTop:'1px solid var(--m-border)', paddingTop:12, display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
        <Row l="Subtotal" v={ymPrice(o.subtotal != null ? o.subtotal : view.total)} />
        {o.deliveryFee > 0 && <Row l="Delivery fee" v={ymPrice(o.deliveryFee)} />}
        <div style={{ display:'flex', justifyContent:'space-between', paddingTop:6, borderTop:'1px solid var(--m-border)' }}><span className="ym-h3" style={{ fontSize:14 }}>Total</span><span className="ym-h3" style={{ fontSize:14 }}>{ymPrice(view.total)}</span></div>
        <Row l="Payment" v={{ mpesa:'M-Pesa', wallet:'YoteWallet', cash:'Cash on collection' }[o.payMethod] || o.payMethod || '—'} />
        {o.pointsEarned > 0 && <div style={{ display:'flex', justifyContent:'space-between' }}><span className="ym-cap" style={{ color:'var(--m-primary)' }}><FA i="fa-gift" /> YotePoints earned</span><span className="ym-cap" style={{ color:'var(--m-primary)', fontWeight:700 }}>+{o.pointsEarned}</span></div>}
      </div>

      {(view.status==='at_hub' || view.status==='ready_pickup') && o.pickupCode && (
        <div style={{ marginBottom:16, padding:'14px 16px', borderRadius:14, background:'var(--m-grad-deep)', color:'#fff', boxShadow:'var(--m-glow)' }}>
          <div style={{ fontSize:12.5, opacity:.85 }}>Show this code to collect</div>
          <div style={{ fontSize:26, fontWeight:800, letterSpacing:5 }}>{o.pickupCode}</div>
        </div>
      )}

      {view.status!=='delivered' && view.status!=='cancelled' && (
        isPickup && store
          ? <div style={{ marginBottom:8 }}><div className="ym-h3" style={{ fontSize:14, marginBottom:8 }}>Collect from store</div><StoreMap store={store} height={170} /></div>
          : hub
            ? <div style={{ marginBottom:8 }}><div className="ym-h3" style={{ fontSize:14, marginBottom:8 }}>Collection point</div><HubMap hub={hub} height={170} /></div>
            : null
      )}

      {view.status==='cancelled' && (
        <div style={{ marginBottom:12, padding:'12px 14px', borderRadius:12, background:'var(--m-inactive-bg)', color:'var(--m-inactive-fg)', display:'flex', gap:9, alignItems:'center', fontSize:13 }}>
          <FA i="fa-ban" /> Order cancelled{o.cancelledBy?` by ${o.cancelledBy==='merchant'?'the store':'you'}`:''}{o.refunded?' · refunded to your wallet':''}.
        </div>
      )}

      {view.status!=='placed' && view.status!=='cancelled' && <OrderInvoice orderId={o.id} />}

      {canCancel && (
        <button onClick={cancel} disabled={cancelling} className="ym-btn ym-btn-ghost" style={{ width:'100%', marginTop:14, color:'var(--m-danger)' }}>
          {cancelling ? <><FA i="fa-circle-notch" style={{ animation:'ym-spin 1s linear infinite' }} /> Cancelling…</> : <><FA i="fa-ban" /> Cancel order{o.paid?' & refund':''}</>}
        </button>
      )}
    </Modal>
  );
}

export function OrdersScreen(){
  const { reset, account, liveOrders } = useYM();
  const [detail, setDetail] = useSCm(null);
  if (!account.hasAccount) return <GuestGate icon="fa-box" title="Your orders" sub="Sign in to view and track your orders, deliveries, and hub pickups." />;
  const orders = (liveOrders || []).map(orderView); // live-only — no mock fallback
  const tone = STATUS_TONE;
  const label = STATUS_LABEL;

  return (
    <div className="wrap anim-up" style={{ paddingTop:24, paddingBottom:40, maxWidth:840 }}>
      <button onClick={()=>reset('home')} className="ym-btn ym-btn-ghost ym-btn-sm" style={{ marginBottom:18 }}><FA i="fa-house" /> Home</button>
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
                  <span className="ym-h3" style={{ fontFamily:'monospace' }}>{o.raw?.orderNo || o.code}</span><span className={'ym-pill ym-pill-'+(tone[o.status]||'pending')}>{label[o.status]||o.status}</span>
                </div>
                <span className="ym-cap">{o.placedTxt}</span>
              </div>
              <button onClick={()=>setDetail(o)} style={{ display:'flex', gap:14, alignItems:'center', marginBottom:16, width:'100%', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left', padding:0 }}>
                <Thumb icon={first?.icon || 'fa-box'} tint={store?.tint || '#7c3aed'} size={56} radius={14} img={first?.img} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="ym-h3" style={{ fontSize:14 }}>{name}</div>
                  <div className="ym-cap">{o.items.reduce((n,i)=>n+(i.qty||1),0)} item{o.items.length!==1?'s':''}{o.hub?` · ${o.hub.split(' · ')[0]}`:''} · <span style={{ color:'var(--m-link)', fontWeight:600 }}>View details</span></div>
                </div>
                <div style={{ fontWeight:700, color:'var(--m-fg1)' }}>{ymPrice(o.total)}</div>
                <FA i="fa-chevron-right" style={{ color:'var(--m-fg3)', fontSize:13 }} />
              </button>
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
              {/* directions to the store (pickup) or the collection hub while in progress */}
              {o.status!=='delivered' && o.status!=='cancelled' && (
                o.raw?.fulfillment==='store_pickup' && store
                  ? <div style={{ marginTop:16 }}><StoreMap store={store} height={150} /></div>
                  : (o.status==='at_hub' && o.raw?.hubId && findHub(o.raw.hubId))
                    ? <div style={{ marginTop:16 }}><HubMap hub={findHub(o.raw.hubId)} height={150} /></div>
                    : null
              )}
              {o.status!=='placed' && <OrderInvoice orderId={o.raw.id} />}
            </div>
          );
        })}
      </div>
      )}
      {detail && <OrderDetail view={detail} onClose={()=>setDetail(null)} />}
    </div>
  );
}
