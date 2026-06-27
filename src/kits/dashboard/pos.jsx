/* pos.jsx — Merchant in-store POS terminal. Ring up catalog items, take cash or
   M-Pesa, issue a KRA tax invoice. Pricing is server-authoritative (posSale). */
import React from 'react';
import { FA, Card, Btn, SectionCard } from './primitives.jsx';
import { ksh } from './data.js';
import { useMerchant } from './merchant.jsx';
import { posSale, confirmPayment, db, firebaseEnabled } from '../../lib/firebase.js';
import { doc, getDoc } from 'firebase/firestore';
const { useState, useRef, useEffect } = React;

export function Pos({ toast }){
  const { products } = useMerchant();
  const catalog = Array.isArray(products) ? products.filter((p) => p.inStock !== false) : [];
  const [q, setQ] = useState('');
  const [cart, setCart] = useState({}); // pid -> qty
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [pay, setPay] = useState('cash'); // cash | mpesa
  const [phase, setPhase] = useState('cart'); // cart | waiting | done
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [receipt, setReceipt] = useState(null);
  const ctxRef = useRef(null);

  const items = Object.entries(cart).map(([pid, qty]) => { const p = catalog.find((x) => x.id === pid); return p ? { ...p, qty } : null; }).filter(Boolean);
  const total = items.reduce((s, x) => s + (Number(x.price) || 0) * x.qty, 0);
  const shown = catalog.filter((p) => !q || (p.name || '').toLowerCase().includes(q.toLowerCase()));
  const add = (pid) => setCart((c) => ({ ...c, [pid]: (c[pid] || 0) + 1 }));
  const dec = (pid) => setCart((c) => { const n = { ...c }; if ((n[pid] || 0) <= 1) delete n[pid]; else n[pid] -= 1; return n; });
  const reset = () => { setCart({}); setPhone(''); setName(''); setReceipt(null); setErr(''); setPhase('cart'); ctxRef.current = null; };

  const showReceipt = async (saleId, invoiceNo) => {
    let inv = invoiceNo ? { invoiceNo } : null;
    if (firebaseEnabled && db && saleId) { try { const s = await getDoc(doc(db, 'invoices', 'inv_pos_' + saleId)); if (s.exists()) inv = s.data(); } catch { /* none */ } }
    setReceipt(inv || { invoiceNo: '—' }); setPhase('done');
  };

  const charge = async () => {
    if (items.length === 0) { setErr('Add at least one item.'); return; }
    if (pay === 'mpesa' && !phone.trim()) { setErr('Enter the customer M-Pesa number.'); return; }
    setBusy(true); setErr('');
    try {
      const payload = { items: items.map((x) => ({ pid: x.id, qty: x.qty })), payMethod: pay, customerName: name.trim() };
      if (pay === 'mpesa') payload.phone = phone.trim();
      const r = await posSale(payload);
      if (pay === 'cash') { toast && toast('Cash sale recorded'); await showReceipt(r.saleId, r.invoiceNo); }
      else { ctxRef.current = { saleId: r.saleId, cid: r.checkoutRequestId }; setPhase('waiting'); }
    } catch (e) { setErr(e.message || 'Could not record the sale.'); } finally { setBusy(false); }
  };

  const confirmMpesa = async () => {
    const ctx = ctxRef.current; if (!ctx) return;
    setBusy(true); setErr('');
    try {
      const r = await confirmPayment({ checkoutRequestId: ctx.cid });
      if (r && (r.paid || r.settledCount)) { toast && toast('Payment received'); await showReceipt(ctx.saleId); }
      else setErr("Not confirmed yet — if they've paid, wait a few seconds and tap again.");
    } catch (e) { setErr(e.message || 'Could not confirm.'); } finally { setBusy(false); }
  };

  useEffect(() => { if (phase !== 'waiting') return undefined; const t = setTimeout(confirmMpesa, 20000); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [phase]);

  if (phase === 'waiting') return (
    <div className="anim-up" style={{ maxWidth:460, margin:'40px auto', textAlign:'center' }}>
      <div style={{ width:74, height:74, borderRadius:9999, background:'var(--m-mpesa)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, margin:'0 auto 18px' }}><FA i="fa-mobile-screen" /></div>
      <h1 className="ym-h1">Customer's phone</h1>
      <p className="ym-body" style={{ marginTop:8 }}>An M-Pesa request for <b style={{ color:'var(--m-fg1)' }}>{ksh(total)}</b> was sent to <b style={{ color:'var(--m-fg1)' }}>{phone}</b>. They enter their PIN to pay.</p>
      {err && <div className="ym-cap" style={{ marginTop:12, color:'var(--m-inactive-fg)' }}>{err}</div>}
      <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:20, flexWrap:'wrap' }}>
        <Btn kind="primary" icon={busy ? 'fa-circle-notch' : 'fa-rotate'} disabled={busy} onClick={confirmMpesa}>{busy ? 'Checking…' : "They've paid — confirm"}</Btn>
        <Btn kind="ghost" onClick={reset}>Cancel</Btn>
      </div>
    </div>
  );

  if (phase === 'done') return (
    <div className="anim-up" style={{ maxWidth:460, margin:'40px auto' }}>
      <Card style={{ padding:26, textAlign:'center' }}>
        <div style={{ width:70, height:70, borderRadius:9999, background:'var(--m-success)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, margin:'0 auto 16px' }}><FA i="fa-check" /></div>
        <h1 className="ym-h2">Sale complete</h1>
        <div className="ym-cap" style={{ marginTop:4 }}>Tax invoice {receipt?.invoiceNo}{receipt?.kraPin ? ` · KRA PIN ${receipt.kraPin}` : ''}</div>
        {receipt && receipt.total != null && (
          <div style={{ textAlign:'left', marginTop:18, display:'flex', flexDirection:'column', gap:8, borderTop:'1px solid var(--m-border)', paddingTop:16 }}>
            <Line l="Taxable amount" v={ksh(receipt.subtotalTaxable)} />
            <Line l={receipt.vatRegistered ? 'VAT (16%)' : 'VAT'} v={receipt.vatRegistered ? ksh(receipt.vat) : 'Not registered'} />
            <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, borderTop:'1px solid var(--m-border)' }}><span className="ym-h3">Total</span><span className="ym-h2" style={{ fontSize:20 }}>{ksh(receipt.total)}</span></div>
          </div>
        )}
        <Btn kind="primary" icon="fa-plus" style={{ width:'100%', marginTop:20 }} onClick={reset}>New sale</Btn>
      </Card>
    </div>
  );

  return (
    <div className="anim-up">
      <h1 className="ym-h1" style={{ marginBottom:6 }}>Point of sale</h1>
      <p className="ym-sub" style={{ marginBottom:20 }}>Ring up an in-store sale — issues a KRA tax invoice.</p>
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:22, alignItems:'start' }} className="pos-grid">
        {/* catalog */}
        <SectionCard title="Products">
          <div style={{ padding:16 }}>
            <input className="ipt" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your products…" style={{ marginBottom:14 }} />
            {catalog.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--m-fg3)', fontSize:13.5, padding:'24px 0' }}><FA i="fa-box-open" style={{ fontSize:22, display:'block', marginBottom:8 }} /> Add products to your store to sell here.</div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:10 }}>
                {shown.map((p) => (
                  <button key={p.id} onClick={() => add(p.id)} style={{ textAlign:'left', padding:12, borderRadius:13, cursor:'pointer', fontFamily:'inherit', background:'var(--m-surface)', border:'1px solid var(--m-border)' }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:'var(--m-surface-2)', color:'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}><FA i={p.icon || 'fa-box'} /></div>
                    <div className="ym-h3" style={{ fontSize:13, lineHeight:1.25, height:32, overflow:'hidden' }}>{p.name}</div>
                    <div className="ym-sub" style={{ fontWeight:700, color:'var(--m-fg1)', marginTop:4 }}>{ksh(p.price)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        {/* cart + pay */}
        <SectionCard title={`Cart · ${items.reduce((n, x) => n + x.qty, 0)} item${items.reduce((n, x) => n + x.qty, 0) !== 1 ? 's' : ''}`}>
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:14 }}>
            {items.length === 0 ? <div className="ym-cap" style={{ textAlign:'center', padding:'16px 0' }}>Tap products to add them.</div> : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {items.map((x) => (
                  <div key={x.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ flex:1, minWidth:0 }}><div className="ym-h3" style={{ fontSize:13.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{x.name}</div><div className="ym-cap">{ksh(x.price)} × {x.qty}</div></div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <button onClick={() => dec(x.id)} style={qtyBtn}><FA i="fa-minus" /></button>
                      <span style={{ fontWeight:700, minWidth:16, textAlign:'center' }}>{x.qty}</span>
                      <button onClick={() => add(x.id)} style={qtyBtn}><FA i="fa-plus" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid var(--m-border)', paddingTop:12 }}><span className="ym-h3">Total</span><span className="ym-h2" style={{ fontSize:22 }}>{ksh(total)}</span></div>

            <div style={{ display:'flex', gap:8 }}>
              {[['cash', 'Cash', 'fa-money-bills'], ['mpesa', 'M-Pesa', 'fa-mobile-screen']].map(([id, lb, ic]) => (
                <button key={id} onClick={() => setPay(id)} style={{ flex:1, padding:'11px 8px', borderRadius:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13.5, display:'inline-flex', gap:8, alignItems:'center', justifyContent:'center', background:'var(--m-surface)', border: pay === id ? '2px solid var(--m-primary)' : '2px solid var(--m-border)', color: pay === id ? 'var(--m-primary)' : 'var(--m-fg2)' }}><FA i={ic} /> {lb}</button>
              ))}
            </div>
            {pay === 'mpesa' && <input className="ipt" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Customer M-Pesa number" />}
            <input className="ipt" value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name (optional)" />
            {err && <div style={{ color:'var(--m-inactive-fg)', fontSize:13, display:'flex', gap:8, alignItems:'center' }}><FA i="fa-circle-exclamation" /> {err}</div>}
            <Btn kind={pay === 'mpesa' ? 'mpesa' : 'primary'} icon={busy ? 'fa-circle-notch' : 'fa-bolt'} disabled={busy || items.length === 0} onClick={charge} style={{ width:'100%' }}>
              {busy ? 'Processing…' : (pay === 'mpesa' ? `Charge ${ksh(total)} via M-Pesa` : `Record ${ksh(total)} cash sale`)}
            </Btn>
          </div>
        </SectionCard>
      </div>
      <style>{`@media (max-width:860px){ .pos-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

const qtyBtn = { width:30, height:30, borderRadius:9, border:'1px solid var(--m-border)', background:'var(--m-surface)', color:'var(--m-fg1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 };
function Line({ l, v }){ return <div style={{ display:'flex', justifyContent:'space-between' }}><span className="ym-sub">{l}</span><span className="ym-sub" style={{ fontWeight:600, color:'var(--m-fg1)' }}>{v}</span></div>; }
