/* pos.jsx — Merchant in-store POS terminal. Ring up catalog items (search or scan by
   name/SKU) or a one-off custom item, apply a discount, take cash (with change due)
   or M-Pesa, issue a KRA tax invoice, and print/share the receipt. Pricing is
   server-authoritative for catalog items (posSale); custom items + discount are
   merchant-set. */
import React from 'react';
import { FA, Card, Btn, SectionCard } from './primitives.jsx';
import { ksh } from './data.js';
import { useMerchant } from './merchant.jsx';
import { posSale, confirmPayment, db, firebaseEnabled } from '../../lib/firebase.js';
import { doc, getDoc } from 'firebase/firestore';
const { useState, useRef, useEffect } = React;

let customSeq = 0;

export function Pos({ toast }){
  const { products, store } = useMerchant();
  const catalog = Array.isArray(products) ? products.filter((p) => p.inStock !== false) : [];
  const storeName = store?.name || 'Your store';
  const [q, setQ] = useState('');
  const [cart, setCart] = useState([]); // [{ key, pid?, custom?, name, price, qty }]
  const [disc, setDisc] = useState({ type: 'amount', value: '' });
  const [tendered, setTendered] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [pay, setPay] = useState('cash'); // cash | mpesa
  const [phase, setPhase] = useState('cart'); // cart | waiting | done
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [showCustom, setShowCustom] = useState(false);
  const [cName, setCName] = useState(''); const [cPrice, setCPrice] = useState('');
  const [session, setSession] = useState({ count: 0, total: 0 });
  const ctxRef = useRef(null);
  const searchRef = useRef(null);

  const subtotal = cart.reduce((s, x) => s + (Number(x.price) || 0) * x.qty, 0);
  const discVal = Number(disc.value) || 0;
  const discountAmt = Math.min(subtotal, disc.type === 'percent' ? Math.round(subtotal * Math.min(100, discVal) / 100) : Math.round(discVal));
  const total = Math.max(0, subtotal - discountAmt);
  const tenderedN = Number(tendered) || 0;
  const change = pay === 'cash' && tenderedN > 0 ? tenderedN - total : null;

  const shown = catalog.filter((p) => { const s = q.trim().toLowerCase(); return !s || (p.name || '').toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s); });

  const addProduct = (p) => setCart((c) => {
    const i = c.findIndex((x) => x.pid === p.id);
    if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
    return [...c, { key: 'p_' + p.id, pid: p.id, name: p.name, price: Number(p.price) || 0, icon: p.icon, qty: 1 }];
  });
  const addCustom = () => {
    const price = Math.round(Number(cPrice) || 0);
    if (price <= 0) { setErr('Enter a price for the custom item.'); return; }
    setCart((c) => [...c, { key: 'c_' + (++customSeq), custom: true, name: cName.trim() || 'Custom item', price, qty: 1 }]);
    setCName(''); setCPrice(''); setShowCustom(false); setErr('');
  };
  const inc = (key) => setCart((c) => c.map((x) => x.key === key ? { ...x, qty: x.qty + 1 } : x));
  const dec = (key) => setCart((c) => c.flatMap((x) => x.key === key ? (x.qty <= 1 ? [] : [{ ...x, qty: x.qty - 1 }]) : [x]));
  const reset = () => { setCart([]); setDisc({ type: 'amount', value: '' }); setTendered(''); setPhone(''); setName(''); setReceipt(null); setErr(''); setPhase('cart'); ctxRef.current = null; };

  // Barcode scanner / quick add: scanners type the code then Enter.
  const onSearchKey = (e) => {
    if (e.key !== 'Enter') return;
    const s = q.trim().toLowerCase(); if (!s) return;
    const exact = catalog.find((p) => (p.sku || '').toLowerCase() === s);
    const pick = exact || shown[0];
    if (pick) { addProduct(pick); setQ(''); }
  };

  const showReceipt = async (saleId, invoiceNo, snapshot) => {
    let inv = invoiceNo ? { invoiceNo } : null;
    if (firebaseEnabled && db && saleId) { try { const s = await getDoc(doc(db, 'invoices', 'inv_pos_' + saleId)); if (s.exists()) inv = { ...s.data(), ...inv }; } catch { /* none */ } }
    setReceipt({ ...(inv || { invoiceNo: '—' }), ...snapshot });
    setSession((v) => ({ count: v.count + 1, total: v.total + snapshot.total }));
    setPhase('done');
  };

  const charge = async () => {
    if (cart.length === 0) { setErr('Add at least one item.'); return; }
    if (pay === 'mpesa' && !phone.trim()) { setErr('Enter the customer M-Pesa number.'); return; }
    setBusy(true); setErr('');
    const snapshot = { items: cart.map((x) => ({ name: x.name, price: x.price, qty: x.qty, custom: !!x.custom })), subtotal, discount: discountAmt, total, tendered: tenderedN || null, change: change != null && change >= 0 ? change : null, customerName: name.trim(), payMethod: pay };
    try {
      const payload = {
        items: cart.map((x) => x.custom ? { custom: true, name: x.name, price: x.price, qty: x.qty } : { pid: x.pid, qty: x.qty }),
        payMethod: pay, customerName: name.trim(),
        ...(discountAmt > 0 ? { discount: { type: disc.type, value: discVal } } : {}),
      };
      if (pay === 'mpesa') payload.phone = phone.trim();
      const r = await posSale(payload);
      if (pay === 'cash') { toast && toast('Cash sale recorded'); await showReceipt(r.saleId, r.invoiceNo, snapshot); }
      else { ctxRef.current = { saleId: r.saleId, cid: r.checkoutRequestId, snapshot }; setPhase('waiting'); }
    } catch (e) { setErr(e.message || 'Could not record the sale.'); } finally { setBusy(false); }
  };

  const confirmMpesa = async () => {
    const ctx = ctxRef.current; if (!ctx) return;
    setBusy(true); setErr('');
    try {
      const r = await confirmPayment({ checkoutRequestId: ctx.cid });
      if (r && (r.paid || r.settledCount)) { toast && toast('Payment received'); await showReceipt(ctx.saleId, null, ctx.snapshot); }
      else setErr("Not confirmed yet — if they've paid, wait a few seconds and tap again.");
    } catch (e) { setErr(e.message || 'Could not confirm.'); } finally { setBusy(false); }
  };
  useEffect(() => { if (phase !== 'waiting') return undefined; const t = setTimeout(confirmMpesa, 20000); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [phase]);

  // ── receipt print / share ──
  const receiptText = (r) => {
    const L = [storeName, `Receipt ${r.invoiceNo || ''}`.trim(), '—'.repeat(22)];
    (r.items || []).forEach((it) => L.push(`${it.name} x${it.qty}  ${ksh((it.price || 0) * (it.qty || 1))}`));
    L.push('—'.repeat(22), `Subtotal  ${ksh(r.subtotal)}`);
    if (r.discount > 0) L.push(`Discount  -${ksh(r.discount)}`);
    L.push(`TOTAL  ${ksh(r.total)}`, `Paid  ${r.payMethod === 'mpesa' ? 'M-Pesa' : 'Cash'}`);
    if (r.change != null) L.push(`Cash  ${ksh(r.tendered)}  ·  Change  ${ksh(r.change)}`);
    L.push('', 'Asante — thank you!');
    return L.join('\n');
  };
  const printReceipt = (r) => {
    const rows = (r.items || []).map((it) => `<tr><td>${escapeHtml(it.name)} <span class="q">x${it.qty}</span></td><td class="r">${ksh((it.price || 0) * (it.qty || 1))}</td></tr>`).join('');
    const w = window.open('', '_blank', 'width=360,height=640'); if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Receipt ${r.invoiceNo || ''}</title><style>
      *{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:#000}
      body{width:280px;margin:0 auto;padding:12px}
      h2{font-size:15px;text-align:center;margin:0 0 2px} .sub{text-align:center;color:#555;margin:0 0 10px}
      table{width:100%;border-collapse:collapse} td{padding:2px 0} .r{text-align:right} .q{color:#888}
      hr{border:none;border-top:1px dashed #999;margin:8px 0}
      .tot{display:flex;justify-content:space-between;font-weight:700;font-size:14px}
      .foot{text-align:center;margin-top:12px}
    </style></head><body>
      <h2>${escapeHtml(storeName)}</h2><p class="sub">Tax invoice ${escapeHtml(r.invoiceNo || '')}${r.kraPin ? ' · KRA ' + escapeHtml(r.kraPin) : ''}</p>
      <table>${rows}</table><hr>
      <div class="tot"><span>Subtotal</span><span>${ksh(r.subtotal)}</span></div>
      ${r.discount > 0 ? `<div class="tot" style="font-weight:400"><span>Discount</span><span>-${ksh(r.discount)}</span></div>` : ''}
      <div class="tot" style="font-size:16px;margin-top:4px"><span>TOTAL</span><span>${ksh(r.total)}</span></div>
      <div style="margin-top:6px">Paid: ${r.payMethod === 'mpesa' ? 'M-Pesa' : 'Cash'}${r.change != null ? ` · Cash ${ksh(r.tendered)} · Change ${ksh(r.change)}` : ''}</div>
      <p class="foot">Asante — thank you!</p>
    </body></html>`);
    w.document.close(); w.focus(); setTimeout(() => { try { w.print(); } catch { /* */ } }, 250);
  };

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
        <div style={{ textAlign:'left', marginTop:18, display:'flex', flexDirection:'column', gap:8, borderTop:'1px solid var(--m-border)', paddingTop:16 }}>
          <Line l="Subtotal" v={ksh(receipt?.subtotal)} />
          {receipt?.discount > 0 && <Line l="Discount" v={'-' + ksh(receipt.discount)} />}
          <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, borderTop:'1px solid var(--m-border)' }}><span className="ym-h3">Total</span><span className="ym-h2" style={{ fontSize:20 }}>{ksh(receipt?.total)}</span></div>
          {receipt?.change != null && <Line l={`Cash ${ksh(receipt.tendered)} · Change due`} v={ksh(receipt.change)} />}
        </div>
        <div style={{ display:'flex', gap:8, marginTop:18, flexWrap:'wrap' }}>
          <Btn kind="soft" icon="fa-print" onClick={() => printReceipt(receipt)} style={{ flex:1 }}>Print</Btn>
          <Btn kind="soft" icon="fa-whatsapp" brandIcon onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(receiptText(receipt))}`, '_blank')} style={{ flex:1 }}>WhatsApp</Btn>
          <Btn kind="soft" icon="fa-comment-sms" onClick={() => { window.location.href = `sms:?body=${encodeURIComponent(receiptText(receipt))}`; }} style={{ flex:1 }}>SMS</Btn>
        </div>
        <Btn kind="primary" icon="fa-plus" style={{ width:'100%', marginTop:12 }} onClick={reset}>New sale</Btn>
      </Card>
    </div>
  );

  const itemsCount = cart.reduce((n, x) => n + x.qty, 0);
  return (
    <div className="anim-up">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:6 }}>
        <div><h1 className="ym-h1">Point of sale</h1><p className="ym-sub">Ring up an in-store sale — issues a KRA tax invoice.</p></div>
        {session.count > 0 && <Card style={{ padding:'10px 16px', textAlign:'right' }}><div className="ym-cap">This session</div><div className="ym-h3">{session.count} sale{session.count !== 1 ? 's' : ''} · {ksh(session.total)}</div></Card>}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:22, alignItems:'start', marginTop:14 }} className="pos-grid">
        {/* catalog */}
        <SectionCard title="Products" action={<Btn kind="ghost" size="sm" icon="fa-plus" onClick={() => setShowCustom((s) => !s)}>Custom item</Btn>}>
          <div style={{ padding:16 }}>
            <input ref={searchRef} className="ipt" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onSearchKey} placeholder="Search or scan (name / SKU)…" style={{ marginBottom:14 }} autoFocus />
            {showCustom && (
              <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center', background:'var(--m-surface-2)', borderRadius:12, padding:12 }}>
                <input className="ipt" value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Item name" style={{ flex:2, minWidth:120 }} />
                <input className="ipt" value={cPrice} onChange={(e) => setCPrice(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Price" style={{ width:100 }} />
                <Btn kind="primary" size="sm" onClick={addCustom}>Add</Btn>
              </div>
            )}
            {catalog.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--m-fg3)', fontSize:13.5, padding:'24px 0' }}><FA i="fa-box-open" style={{ fontSize:22, display:'block', marginBottom:8 }} /> No products yet — search adds nothing, but you can still ring up custom items.</div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:10 }}>
                {shown.map((p) => (
                  <button key={p.id} onClick={() => addProduct(p)} style={{ textAlign:'left', padding:12, borderRadius:13, cursor:'pointer', fontFamily:'inherit', background:'var(--m-surface)', border:'1px solid var(--m-border)' }}>
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
        <SectionCard title={`Cart · ${itemsCount} item${itemsCount !== 1 ? 's' : ''}`}>
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:14 }}>
            {cart.length === 0 ? <div className="ym-cap" style={{ textAlign:'center', padding:'16px 0' }}>Tap products or add a custom item.</div> : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {cart.map((x) => (
                  <div key={x.key} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="ym-h3" style={{ fontSize:13.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{x.name}{x.custom && <span className="ym-cap" style={{ marginLeft:6 }}>· custom</span>}</div>
                      <div className="ym-cap">{ksh(x.price)} × {x.qty}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <button onClick={() => dec(x.key)} style={qtyBtn}><FA i="fa-minus" /></button>
                      <span style={{ fontWeight:700, minWidth:16, textAlign:'center' }}>{x.qty}</span>
                      <button onClick={() => inc(x.key)} style={qtyBtn}><FA i="fa-plus" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* discount */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span className="ym-cap" style={{ minWidth:60 }}>Discount</span>
              <input className="ipt" value={disc.value} onChange={(e) => setDisc((d) => ({ ...d, value: e.target.value.replace(/[^0-9]/g, '') }))} inputMode="numeric" placeholder="0" style={{ flex:1, height:40 }} />
              <div style={{ display:'flex', border:'1px solid var(--m-border)', borderRadius:10, overflow:'hidden' }}>
                {[['amount', 'KSh'], ['percent', '%']].map(([t, lb]) => (
                  <button key={t} onClick={() => setDisc((d) => ({ ...d, type: t }))} style={{ padding:'8px 12px', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13, background: disc.type === t ? 'var(--m-primary)' : 'var(--m-surface)', color: disc.type === t ? '#fff' : 'var(--m-fg2)' }}>{lb}</button>
                ))}
              </div>
            </div>

            <div style={{ borderTop:'1px solid var(--m-border)', paddingTop:12, display:'flex', flexDirection:'column', gap:4 }}>
              {discountAmt > 0 && <><Line l="Subtotal" v={ksh(subtotal)} /><Line l="Discount" v={'-' + ksh(discountAmt)} /></>}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}><span className="ym-h3">Total</span><span className="ym-h2" style={{ fontSize:22 }}>{ksh(total)}</span></div>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              {[['cash', 'Cash', 'fa-money-bills'], ['mpesa', 'M-Pesa', 'fa-mobile-screen']].map(([id, lb, ic]) => (
                <button key={id} onClick={() => setPay(id)} style={{ flex:1, padding:'11px 8px', borderRadius:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13.5, display:'inline-flex', gap:8, alignItems:'center', justifyContent:'center', background:'var(--m-surface)', border: pay === id ? '2px solid var(--m-primary)' : '2px solid var(--m-border)', color: pay === id ? 'var(--m-primary)' : 'var(--m-fg2)' }}><FA i={ic} /> {lb}</button>
              ))}
            </div>

            {pay === 'cash' && (
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <input className="ipt" value={tendered} onChange={(e) => setTendered(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Cash received" style={{ flex:1 }} />
                {change != null && <div style={{ textAlign:'right', minWidth:110 }}><div className="ym-cap">Change due</div><div className="ym-h3" style={{ color: change < 0 ? 'var(--m-inactive-fg)' : 'var(--m-success)' }}>{change < 0 ? 'Short ' + ksh(-change) : ksh(change)}</div></div>}
              </div>
            )}
            {pay === 'mpesa' && <input className="ipt" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Customer M-Pesa number" />}
            <input className="ipt" value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name (optional)" />
            {err && <div style={{ color:'var(--m-inactive-fg)', fontSize:13, display:'flex', gap:8, alignItems:'center' }}><FA i="fa-circle-exclamation" /> {err}</div>}
            <Btn kind={pay === 'mpesa' ? 'mpesa' : 'primary'} icon={busy ? 'fa-circle-notch' : 'fa-bolt'} disabled={busy || cart.length === 0 || total <= 0} onClick={charge} style={{ width:'100%' }}>
              {busy ? 'Processing…' : (pay === 'mpesa' ? `Charge ${ksh(total)} via M-Pesa` : `Record ${ksh(total)} cash sale`)}
            </Btn>
          </div>
        </SectionCard>
      </div>
      <style>{`@media (max-width:860px){ .pos-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
const qtyBtn = { width:30, height:30, borderRadius:9, border:'1px solid var(--m-border)', background:'var(--m-surface)', color:'var(--m-fg1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 };
function Line({ l, v }){ return <div style={{ display:'flex', justifyContent:'space-between' }}><span className="ym-sub">{l}</span><span className="ym-sub" style={{ fontWeight:600, color:'var(--m-fg1)' }}>{v}</span></div>; }
