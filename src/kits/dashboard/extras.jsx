/* extras.jsx — Merchant: Sales, Wallet, Subscription, Settings, Chat (aligned theme). */
import React from 'react';
import { doc, onSnapshot, collection, query, where, limit } from 'firebase/firestore';
import { FA, Card, Btn, Pill, Avatar, Stat, SectionCard, useTheme } from './primitives.jsx';
import Markdown from '../../components/Markdown.jsx';
import YoteAiMark from '../../components/YoteAiMark.jsx';
import { OrdersTable } from './overview.jsx';
import { ORDER_ROWS, WALLET, ksh } from './data.js';
import { useAuth } from '../../lib/useAuth.jsx';
import { useMerchant, useShop, useEntitlements } from './merchant.jsx';
import SubscribeFlow from './SubscribeFlow.jsx';
import { FEATURES, requiredTierName } from '../../lib/entitlements.js';
import { db, firebaseEnabled, aiAssistant, updateStoreMedia, updateStoreLocation, setMerchantTaxInfo, setMerchantPayout, requestPayoutChange, requestMerchantWithdrawal, dismissSettlement, updateStoreProfile, setStoreSocials, listStoreFollowers, requestAccountDeletion } from '../../lib/firebase.js';
import {
  chatEnabled, subscribeConversations, subscribeMessages, sendChatMessage,
  markConversationRead, otherParticipant, hideConversation, fmtTime, fmtWhen, tsMillis, visibleMessages, dayLabel, sameDayMs, offerItems, offerTotal,
} from '../../lib/chat.js';
import { usePushPrompt } from '../../lib/push.js';
import ImageUpload from '../../components/ImageUpload.jsx';
import { Receipt, normalizeReceipt } from '../../components/Receipt.jsx';
import { coverPath, logoPath } from '../../lib/storage.js';
import { ScreenCoach } from './ScreenCoach.jsx';
const { useState: useStateX, useRef: useRefX, useEffect: useEffX } = React;

const WALLET_COACH = [
  { selector: '[data-coach="wallet-balance"]', title: 'Your earnings', body: 'This is your available balance from sales. Withdraw it straight to M-Pesa whenever you like.' },
  { selector: '[data-coach="wallet-payout"]', title: 'Set your payout method', body: 'Add where you want to be paid — M-Pesa number, Pochi, Till or Paybill. For your security, changing it later needs a quick staff approval.' },
];

const fmtTs = (ts) => { try { return new Date((ts.seconds || ts._seconds) * 1000).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }); } catch { return ''; } };

/* ---------- SALES (live) ---------- */
export function Sales(){
  const { orders, live } = useMerchant();
  const [tab, setTab] = useStateX('completed');
  const os = live ? (orders || []) : [];
  const paid = os.filter((o) => o.paid === true || o.status === 'delivered');
  const revenue = paid.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const avg = paid.length ? Math.round(revenue / paid.length) : 0;
  const delivered = os.filter((o) => o.status === 'delivered').length;
  const rows = os.map((o) => ({
    id: o.id, orderNo: o.orderNo || null, buyer: o.buyerName || 'Customer', avatar: 'avatar-1.png',
    items: Array.isArray(o.items) ? `${o.items.length} item${o.items.length !== 1 ? 's' : ''}` : '—',
    total: Number(o.total) || 0, status: o.status === 'delivered' ? 'active' : (o.status === 'cancelled' ? 'inactive' : 'pending'),
    rawStatus: o.status, fulfillment: o.fulfillment || 'hub',
    date: o.placed || (o.createdAt ? fmtTs(o.createdAt) : ''),
    hub: o.fulfillment === 'store_pickup' ? 'Store pickup' : (o.hub || '—'),
    raw: o,
  }));
  // Split by status: Completed (delivered/collected), Cancelled, Pending (everything else in-flight).
  const groups = {
    completed: rows.filter((r) => r.rawStatus === 'delivered'),
    pending: rows.filter((r) => r.rawStatus !== 'delivered' && r.rawStatus !== 'cancelled'),
    cancelled: rows.filter((r) => r.rawStatus === 'cancelled'),
  };
  const TABS = [['completed', 'Completed', 'fa-circle-check'], ['pending', 'Pending', 'fa-clock'], ['cancelled', 'Cancelled', 'fa-ban']];
  const tabLabel = (TABS.find((t) => t[0] === tab) || TABS[0])[1];
  return (
    <div className="anim-up">
      <h1 className="ym-h1" style={{ marginBottom:20 }}>Sales</h1>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16, marginBottom:22 }}>
        <Stat label="Revenue" value={ksh(revenue)} icon="fa-coins" tone="#7c3aed" />
        <Stat label="Orders" value={String(os.length)} icon="fa-bag-shopping" tone="#3b82f6" />
        <Stat label="Avg order value" value={ksh(avg)} icon="fa-receipt" tone="#10b981" />
        <Stat label="Delivered" value={String(delivered)} icon="fa-circle-check" tone="#10b981" />
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {TABS.map(([id, lb, ic]) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'9px 14px', borderRadius:11, cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:13.5, border: on ? '2px solid var(--m-primary)' : '1px solid var(--m-border)', background: on ? 'var(--m-surface-3)' : 'var(--m-surface)', color: on ? 'var(--m-primary)' : 'var(--m-fg2)' }}>
              <FA i={ic} /> {lb}
              <span style={{ minWidth:20, height:20, borderRadius:9999, background: on ? 'var(--m-primary)' : 'var(--m-surface-2)', color: on ? '#fff' : 'var(--m-fg3)', fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 5px' }}>{groups[id].length}</span>
            </button>
          );
        })}
      </div>
      <OrdersTable rows={groups[tab]} title={`${tabLabel} orders`} />
    </div>
  );
}

/* ---------- WALLET ---------- */
const RCPT_ICON = { subscription:'fa-id-card', pos:'fa-store', payout:'fa-money-bill-transfer', order:'fa-bag-shopping', wallet_topup:'fa-wallet', redemption:'fa-gift' };
const PAYOUT_TYPES = [
  { id:'phone',   label:'M-Pesa phone',      icon:'fa-mobile-screen', hint:'Send money to a Safaricom number' },
  { id:'pochi',   label:'Pochi la Biashara', icon:'fa-store',         hint:'Business wallet on a phone number' },
  { id:'till',    label:'Till (Buy Goods)',  icon:'fa-cash-register', hint:'Your M-Pesa Buy Goods till' },
  { id:'paybill', label:'Paybill',           icon:'fa-building-columns', hint:'Your Paybill number + account' },
];
export const payoutLabel = (p) => {
  if (!p) return 'Not set';
  const t = p.type || (p.method === 'b2b' ? 'paybill' : 'phone');
  if (t === 'phone') return `M-Pesa · ${p.phone}`;
  if (t === 'pochi') return `Pochi la Biashara · ${p.phone}`;
  if (t === 'till') return `Till · ${p.till}`;
  if (t === 'paybill') return `Paybill ${p.paybill} · Acc ${p.account}`;
  return 'Set';
};
const SETTLE_TONE = { paid:'active', processing:'pending', failed:'inactive' };
const SETTLE_LBL = { paid:'Paid', processing:'Processing', failed:'Failed' };

/* Overlay modal shell (dashboard has no shared Modal). */
function Sheet({ title, onClose, children }){
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(8,10,24,.5)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={(e)=>e.stopPropagation()} className="ym-card" style={{ width:'100%', maxWidth:440, maxHeight:'88vh', overflowY:'auto', padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h3 className="ym-h2" style={{ fontSize:18 }}>{title}</h3>
          <button onClick={onClose} className="icon-btn" aria-label="Close"><FA i="fa-xmark" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const wIpt = { width:'100%', padding:'12px 14px', borderRadius:11, border:'1px solid var(--m-border)', background:'var(--m-surface)', color:'var(--m-fg1)', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };
const wErr = { display:'flex', gap:9, alignItems:'center', background:'var(--m-inactive-bg)', color:'var(--m-inactive-fg)', borderRadius:11, padding:'11px 14px', fontSize:13, fontWeight:500, marginTop:12 };

/* Set-up / change payout destination. `change=true` submits a staff-approved request. */
function PayoutForm({ change, onClose, toast }){
  const [type, setType] = useStateX('phone');
  const [phone, setPhone] = useStateX('');
  const [till, setTill] = useStateX('');
  const [paybill, setPaybill] = useStateX('');
  const [account, setAccount] = useStateX('');
  const [busy, setBusy] = useStateX(false);
  const [err, setErr] = useStateX('');
  const submit = async () => {
    setErr(''); setBusy(true);
    const data = { type, phone, till, paybill, account };
    try {
      if (change) { await requestPayoutChange(data); toast && toast('Change request submitted for review'); }
      else { await setMerchantPayout(data); toast && toast('Payout method saved'); }
      onClose();
    } catch (e) { setErr(e.message || 'Could not save.'); setBusy(false); }
  };
  return (
    <Sheet title={change ? 'Request payout change' : 'Set payout method'} onClose={onClose}>
      {change && <p className="ym-sub" style={{ marginBottom:14 }}>For your security, changing where money is sent needs staff approval. Your withdrawals keep using the current method until it's approved.</p>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        {PAYOUT_TYPES.map((t) => (
          <button key={t.id} onClick={()=>setType(t.id)} style={{ display:'flex', flexDirection:'column', gap:4, padding:'12px', textAlign:'left', borderRadius:12, cursor:'pointer', fontFamily:'inherit', background:'var(--m-surface)', border: type===t.id ? '2px solid var(--m-primary)' : '2px solid var(--m-border)' }}>
            <FA i={t.icon} style={{ color: type===t.id ? 'var(--m-primary)' : 'var(--m-fg3)' }} />
            <span className="ym-h3" style={{ fontSize:13.5 }}>{t.label}</span>
            <span className="ym-cap" style={{ fontSize:11 }}>{t.hint}</span>
          </button>
        ))}
      </div>
      {(type === 'phone' || type === 'pochi') && (
        <div><label className="ym-label">{type==='pochi'?'Pochi la Biashara number':'M-Pesa number'}</label><input style={wIpt} value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="07XX XXX XXX" inputMode="tel" /></div>
      )}
      {type === 'till' && <div><label className="ym-label">Till (Buy Goods) number</label><input style={wIpt} value={till} onChange={(e)=>setTill(e.target.value.replace(/\D/g,''))} placeholder="e.g. 5678901" inputMode="numeric" /></div>}
      {type === 'paybill' && (<>
        <div style={{ marginBottom:10 }}><label className="ym-label">Paybill number</label><input style={wIpt} value={paybill} onChange={(e)=>setPaybill(e.target.value.replace(/\D/g,''))} placeholder="e.g. 400200" inputMode="numeric" /></div>
        <div><label className="ym-label">Account number</label><input style={wIpt} value={account} onChange={(e)=>setAccount(e.target.value)} placeholder="Account / reference" /></div>
      </>)}
      {err && <div role="alert" style={wErr}><FA i="fa-circle-exclamation" /> {err}</div>}
      <Btn kind="primary" style={{ width:'100%', marginTop:16 }} disabled={busy} onClick={submit}>{busy ? 'Saving…' : (change ? 'Submit change request' : 'Save payout method')}</Btn>
    </Sheet>
  );
}

/* Withdraw available balance to the set payout. */
function WithdrawSheet({ balance, payout, onClose, toast }){
  const [amount, setAmount] = useStateX(String(balance || ''));
  const [busy, setBusy] = useStateX(false);
  const [err, setErr] = useStateX('');
  const [done, setDone] = useStateX(false);
  const n = Math.floor(Number(amount)) || 0;
  const submit = async () => {
    setErr('');
    if (n < 1) { setErr('Enter an amount to withdraw.'); return; }
    if (n > balance) { setErr('Amount exceeds your available balance.'); return; }
    setBusy(true);
    try { const r = await requestMerchantWithdrawal({ amount: n }); toast && toast(`Withdrawal of ${ksh(r.amount)} initiated`); setDone(true); }
    catch (e) { setErr(e.message || 'Withdrawal failed.'); setBusy(false); }
  };
  if (done) return (
    <Sheet title="Withdrawal sent" onClose={onClose}>
      <div style={{ textAlign:'center', padding:'8px 0' }}>
        <div style={{ width:64, height:64, borderRadius:9999, background:'var(--m-success)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, margin:'0 auto 14px' }}><FA i="fa-check" /></div>
        <p className="ym-body">Your payout to <b style={{ color:'var(--m-fg1)' }}>{payoutLabel(payout)}</b> is processing. It'll show as <b>Paid</b> here once M-Pesa confirms.</p>
        <Btn kind="primary" style={{ width:'100%', marginTop:18 }} onClick={onClose}>Done</Btn>
      </div>
    </Sheet>
  );
  return (
    <Sheet title="Withdraw to M-Pesa" onClose={onClose}>
      <div style={{ padding:'12px 14px', borderRadius:12, background:'var(--m-surface-2)', marginBottom:14 }}>
        <div className="ym-cap">Sending to</div><div className="ym-h3" style={{ fontSize:14 }}>{payoutLabel(payout)}</div>
      </div>
      <label className="ym-label">Amount (KSh)</label>
      <input style={wIpt} value={amount} onChange={(e)=>setAmount(e.target.value.replace(/[^0-9]/g,''))} inputMode="numeric" />
      <div className="ym-cap" style={{ marginTop:8 }}>Available: {ksh(balance)}</div>
      {n > 0 && n < 10 && <div className="ym-cap" style={{ marginTop:6 }}><FA i="fa-circle-info" /> M-Pesa's minimum payout is KSh 10 — smaller amounts may be declined.</div>}
      {err && <div role="alert" style={wErr}><FA i="fa-circle-exclamation" /> {err}</div>}
      <Btn kind="primary" style={{ width:'100%', marginTop:16 }} disabled={busy} onClick={submit}>{busy ? 'Sending…' : `Withdraw ${ksh(n)}`}</Btn>
    </Sheet>
  );
}

/* Receipt detail — opened from the Wallet receipts list. */
function RcptRow({ l, v }){ return <div style={{ display:'flex', justifyContent:'space-between' }}><span className="ym-sub">{l}</span><span className="ym-sub" style={{ fontWeight:600, color:'var(--m-fg1)' }}>{v}</span></div>; }
/* Renders the shared modular <Receipt> so merchant + shopper receipts stay identical
   (and it's crash-safe — a bad field can't take down the dashboard). */
function ReceiptSheet({ r, onClose }){
  return (
    <Sheet title="Receipt" onClose={onClose}>
      <Receipt receipt={normalizeReceipt(r)} variant="digital" />
      <Btn kind="primary" style={{ width:'100%', marginTop:16 }} onClick={onClose}>Done</Btn>
    </Sheet>
  );
}

export function Wallet({ toast }){
  const { merchant, live } = useMerchant();
  const { user } = useAuth();
  const [receipts, setReceipts] = useStateX([]);
  const [settlements, setSettlements] = useStateX([]);
  const [pendingChange, setPendingChange] = useStateX(false);
  const [modal, setModal] = useStateX(null); // 'setup' | 'change' | 'withdraw'
  const [rcpt, setRcpt] = useStateX(null);   // open receipt detail
  const [dismissing, setDismissing] = useStateX(null); // settlement id being removed
  useEffX(() => {
    if (!firebaseEnabled || !db || !user?.uid) return undefined;
    const u = onSnapshot(query(collection(db, 'receipts'), where('userId', '==', user.uid), limit(40)),
      (s) => setReceipts(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))),
      () => {});
    const us = onSnapshot(query(collection(db, 'merchant_settlements'), where('merchantId', '==', user.uid), limit(30)),
      (s) => setSettlements(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))),
      () => {});
    const uc = onSnapshot(query(collection(db, 'payout_change_requests'), where('merchantId', '==', user.uid), where('status', '==', 'pending'), limit(1)),
      (s) => setPendingChange(!s.empty), () => {});
    return () => { u(); us(); uc(); };
  }, [user?.uid]);
  const visibleSettlements = settlements.filter((s) => !s.merchantHidden);
  const balance = live ? (merchant?.balanceAvailable || 0) : 0;
  const processing = live ? (merchant?.balanceProcessing || 0) : 0;
  const payout = merchant?.payout || null;
  const now = new Date();
  const thisMonth = receipts.filter((r) => { const s = r.createdAt?.seconds; if (!s) return false; const d = new Date(s * 1000); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && r.type !== 'payout'; });
  const monthIn = thisMonth.reduce((s, r) => s + (r.amount || 0), 0);
  const fmtRcptWhen = (r) => r.createdAt?.seconds ? new Date(r.createdAt.seconds*1000).toLocaleDateString('en-KE',{ day:'numeric', month:'short' }) : '';
  const onWithdraw = () => { if (!payout || !payout.method) setModal('setup'); else if (balance < 1) toast && toast('You have no balance to withdraw yet'); else setModal('withdraw'); };
  return (
    <div className="anim-up">
      <ScreenCoach id="wallet" steps={WALLET_COACH} />
      <h1 className="ym-h1" style={{ marginBottom:20 }}>Wallet</h1>
      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:20, alignItems:'start' }} className="wallet-grid">
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <Card style={{ padding:24, color:'#fff', background:'var(--m-grad-deep)', boxShadow:'var(--m-glow)', position:'relative', overflow:'hidden' }} data-coach="wallet-balance">
            <FA i="fa-wallet" style={{ position:'absolute', right:14, bottom:-10, fontSize:96, color:'rgba(255,255,255,.1)' }} />
            <div style={{ color:'rgba(255,255,255,.78)', fontSize:13 }}>Available payout</div>
            <div style={{ fontSize:40, fontWeight:800, margin:'4px 0' }}>{ksh(balance)}</div>
            <div style={{ color:'rgba(255,255,255,.78)', fontSize:13, marginBottom:18 }}>{processing > 0 ? `${ksh(processing)} processing · ` : ''}Withdraw to {payout ? payoutLabel(payout) : 'M-Pesa'}</div>
            <button className="ym-btn ym-btn-mpesa" style={{ width:'auto' }} onClick={onWithdraw}><FA i="fa-mobile-screen" /> {payout ? 'Withdraw to M-Pesa' : 'Set up payout'}</button>
          </Card>

          {/* payout method */}
          <SectionCard title="Payout method" sub="Where your withdrawals are sent" data-coach="wallet-payout">
            <div style={{ padding:'4px 18px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--m-surface-2)', color:'var(--m-primary)' }}><FA i="fa-money-bill-transfer" /></div>
                  <div><div className="ym-h3" style={{ fontSize:14 }}>{payout ? payoutLabel(payout) : 'Not set up yet'}</div><div className="ym-cap">{payout ? 'Active destination' : 'Add where you want to be paid'}</div></div>
                </div>
                {payout
                  ? (pendingChange ? <Pill tone="pending">Change under review</Pill> : <Btn kind="ghost" size="sm" onClick={()=>setModal('change')}>Request change</Btn>)
                  : <Btn kind="primary" size="sm" onClick={()=>setModal('setup')}>Set up</Btn>}
              </div>
            </div>
          </SectionCard>

          {/* withdrawals history */}
          <SectionCard title="Withdrawals" sub="Your M-Pesa payouts">
            <div>
              {visibleSettlements.length === 0 && <div style={{ padding:'28px 18px', textAlign:'center', color:'var(--m-fg3)', fontSize:13.5 }}>No withdrawals yet.</div>}
              {visibleSettlements.map((s,i)=>(
                <div key={s.id||i} style={{ display:'flex', alignItems:'center', gap:13, padding:'13px 18px', borderTop:i?'1px solid var(--m-border)':'none' }}>
                  <div style={{ width:40, height:40, borderRadius:12, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--m-surface-2)', color:'var(--m-fg3)' }}><FA i="fa-money-bill-transfer" /></div>
                  <div style={{ flex:1, minWidth:0 }}><div className="ym-h3" style={{ fontSize:14 }}>{ksh(s.amount||0)}</div><div className="ym-cap">{payoutLabel(s.payout)}{s.receipt?` · ${s.receipt}`:''}{s.status==='failed'&&(s.resultDesc||s.reason)?` · ${s.resultDesc||s.reason}`:''}</div></div>
                  <Pill tone={SETTLE_TONE[s.status]||'pending'}>{SETTLE_LBL[s.status]||s.status}</Pill>
                  {s.status==='failed' && (
                    <button title="Remove" aria-label="Remove failed withdrawal" disabled={dismissing===s.id}
                      onClick={()=>{ setDismissing(s.id); dismissSettlement({ settlementId:s.id }).then(()=>toast&&toast('Removed')).catch((e)=>toast&&toast(e?.message||'Could not remove')).finally(()=>setDismissing(null)); }}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--m-fg3)', padding:6, flexShrink:0 }}><FA i="fa-xmark" /></button>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Receipts" sub="A digital receipt for every transaction">
            <div>
              {(live ? receipts.length === 0 : WALLET.tx.length === 0) && <div style={{ padding:'28px 18px', textAlign:'center', color:'var(--m-fg3)', fontSize:13.5 }}>No receipts yet.</div>}
              {live
                ? receipts.map((r,i)=>{
                    const out = r.type === 'payout';
                    return (
                      <button key={r.id||i} onClick={()=>setRcpt(r)} style={{ display:'flex', alignItems:'center', gap:13, padding:'13px 18px', borderTop:i?'1px solid var(--m-border)':'none', width:'100%', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                        <div style={{ width:40, height:40, borderRadius:12, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:out?'var(--m-surface-2)':'var(--m-active-bg)', color:out?'var(--m-fg3)':'var(--m-active-fg)' }}><FA i={RCPT_ICON[r.type]||'fa-receipt'} /></div>
                        <div style={{ flex:1, minWidth:0 }}><div className="ym-h3" style={{ fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.title||'Payment'}</div><div className="ym-cap">{fmtRcptWhen(r)}{r.ref?` · ${r.ref}`:''}</div></div>
                        <div style={{ fontWeight:700, color:out?'var(--m-fg1)':'var(--m-success)' }}>{out?'−':'+'}{ksh(r.amount||0)}</div>
                        <FA i="fa-chevron-right" style={{ color:'var(--m-fg3)', fontSize:12 }} />
                      </button>
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
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span className="ym-sub">Received</span><span className="ym-h3" style={{ fontSize:16 }}>{ksh(monthIn)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span className="ym-sub">Transactions</span><span className="ym-h3" style={{ fontSize:16 }}>{thisMonth.length}</span></div>
            <div style={{ borderTop:'1px solid var(--m-border)', paddingTop:14, display:'flex', justifyContent:'space-between' }}><span className="ym-h3">Available payout</span><span className="ym-h2" style={{ fontSize:18 }}>{ksh(balance)}</span></div>
          </div>
        </Card>
      </div>
      <style>{`@media (max-width:820px){ .wallet-grid{ grid-template-columns:1fr !important; } }`}</style>
      {modal === 'setup' && <PayoutForm onClose={()=>setModal(null)} toast={toast} />}
      {modal === 'change' && <PayoutForm change onClose={()=>setModal(null)} toast={toast} />}
      {modal === 'withdraw' && <WithdrawSheet balance={balance} payout={payout} onClose={()=>setModal(null)} toast={toast} />}
      {rcpt && <ReceiptSheet r={rcpt} onClose={()=>setRcpt(null)} />}
    </div>
  );
}

/* ---------- SUBSCRIPTION (live status + SubscribeFlow) ---------- */
/* What the plan actually unlocks — the merchant can see what they have and exactly
   what the next tier adds, instead of inferring it from padlocks in the sidebar.
   Driven by the SAME matrix the router gates on (lib/entitlements.js) and asked via
   `can()`, so it can never drift from what's really enforced (and it honours the
   staff bypass rather than re-deriving it from `rank`). */
function PlanFeatures(){
  const ent = useEntitlements();
  const rows = Object.entries(FEATURES);
  const have = rows.filter(([k]) => ent.can(k)).length;
  return (
    <SectionCard
      title="What your plan includes"
      sub={ent.staff
        ? 'Staff access — every feature is unlocked for internal testing.'
        : `${have} of ${rows.length} premium features unlocked on ${ent.tier}.`}
    >
      <div style={{ padding:8 }}>
        {rows.map(([key, f]) => {
          const on = ent.can(key);
          return (
            <div key={key} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 10px', opacity: on ? 1 : 0.72 }}>
              <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                background: on ? 'var(--m-surface-3)' : 'var(--m-surface-2)', color: on ? 'var(--m-primary)' : 'var(--m-fg4)' }}>
                <FA i={f.icon} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div className="ym-h3" style={{ fontSize:14 }}>{f.label}</div>
                <div className="ym-cap">{f.blurb}</div>
              </div>
              {on
                ? <span className="ym-cap" style={{ color:'var(--m-success)', fontWeight:700, whiteSpace:'nowrap', flexShrink:0 }}><FA i="fa-circle-check" /> Included</span>
                : <span className="ym-cap" style={{ whiteSpace:'nowrap', flexShrink:0, display:'inline-flex', alignItems:'center', gap:6 }}><FA i="fa-lock" style={{ fontSize:11 }} /> {requiredTierName(key)}</span>}
            </div>
          );
        })}
      </div>
      <div style={{ padding:'12px 18px', borderTop:'1px solid var(--m-border)' }}>
        <div className="ym-cap"><FA i="fa-circle-info" style={{ marginRight:6 }} />Every plan also includes the essentials — your storefront, M-Pesa checkout, orders, chat, wallet payouts and KRA tax invoices.</div>
      </div>
    </SectionCard>
  );
}

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
            <div className="ym-sub" style={{ marginTop:4 }}>{ksh(current.price)}/mo{isSoftware ? ' · software only' : ` · ${current.deliveriesCap} hub deliveries`}{current.range ? ` · ${current.range}` : ''}{current.renewsAt ? ` · renews ${fmtTs(current.renewsAt)}` : ''}</div>
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

      <div style={{ marginBottom:22 }}><PlanFeatures /></div>

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
    <div style={{ padding:'16px 20px 4px', display:'flex', flexDirection:'column', gap:16 }}>
      {/* cover banner */}
      <div>
        <label className="ym-label">Cover photo</label>
        <ImageUpload aspect={16/6} outputSize={1280} title="Cover photo" pathFor={()=>coverPath(storeId)} onUploaded={(u)=>saveMedia('img',u,setCover)} onError={(e)=>toast&&toast(e.message)}>
          {({ pick, uploading })=>(
            <button type="button" onClick={pick} aria-label="Change cover photo"
              style={{ width:'100%', height:120, border:'none', cursor:'pointer', borderRadius:12, overflow:'hidden', position:'relative', padding:0, marginTop:6,
                background: cover?`center/cover no-repeat url(${cover})`:'var(--m-grad-deep)' }}>
              <span style={{ position:'absolute', right:10, bottom:10, background:'rgba(0,0,0,.5)', color:'#fff', borderRadius:9999, padding:'6px 12px', fontSize:12.5, fontWeight:600, display:'inline-flex', gap:6, alignItems:'center' }}>
                <FA i={uploading?'fa-circle-notch':'fa-camera'} style={{ animation: uploading?'ym-spin 1s linear infinite':'none' }} /> {cover?'Change cover':'Add cover'}
              </span>
            </button>
          )}
        </ImageUpload>
      </div>
      {/* logo row */}
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <ImageUpload aspect={1} round outputSize={400} title="Store logo" pathFor={()=>logoPath(storeId)} onUploaded={(u)=>saveMedia('logo',u,setLogo)} onError={(e)=>toast&&toast(e.message)}>
          {({ pick, uploading })=>(
            <button type="button" onClick={pick} title="Change logo"
              style={{ width:60, height:60, borderRadius:9999, border:'1px solid var(--m-border)', cursor:'pointer', overflow:'hidden', position:'relative', padding:0, flexShrink:0,
                background: logo?`center/cover no-repeat url(${logo})`:'var(--m-surface-2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {!logo && <FA i="fa-store" style={{ color:'var(--m-primary)', fontSize:20 }} />}
              <span style={{ position:'absolute', right:0, bottom:0, width:22, height:22, borderRadius:9999, background:'var(--m-primary)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--m-surface)' }}>
                <FA i={uploading?'fa-circle-notch':'fa-camera'} style={{ fontSize:9, animation: uploading?'ym-spin 1s linear infinite':'none' }} />
              </span>
            </button>
          )}
        </ImageUpload>
        <div>
          <div className="ym-h3" style={{ fontSize:14 }}>Store logo</div>
          <div className="ym-cap">Square · shown on your store page &amp; cards</div>
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
  const [n, setN] = useStateX(() => { try { return { orders:true, payouts:true, chat:true, promos:false, ...JSON.parse(localStorage.getItem('ym_merchant_notif') || '{}') }; } catch { return { orders:true, payouts:true, chat:true, promos:false }; } });
  const tg = k=>setN(s=>{ const next={ ...s, [k]:!s[k] }; try { localStorage.setItem('ym_merchant_notif', JSON.stringify(next)); } catch { /* private mode */ } return next; });
  return (
    <div className="anim-up">
      <h1 className="ym-h1" style={{ marginBottom:20 }}>Settings</h1>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }} className="set-grid">
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <SectionCard title="Shop profile">
            <StoreBranding toast={toast} />
            <ShopProfileForm shop={shop} toast={toast} />
          </SectionCard>
          <StoreSocialsForm shop={shop} toast={toast} />
          <FollowersCard toast={toast} />
        </div>
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
          <CloseStoreCard shop={shop} toast={toast} />
        </div>
      </div>
      <style>{`@media (max-width:820px){ .set-grid{ grid-template-columns:1fr !important; } }`}</style>
    </div>
  );
}

/* Danger zone — a merchant requests store closure; STAFF must approve it. Shows
   the pending/approved/rejected state live from deletion_requests/{storeId}. */
function CloseStoreCard({ shop, toast }){
  const [req, setReq] = useStateX(null);   // { status } | null
  const [confirm, setConfirm] = useStateX(false);
  const [reason, setReason] = useStateX('');
  const [busy, setBusy] = useStateX(false);
  useEffX(() => {
    if (!firebaseEnabled || !db || !shop.shopId) return undefined;
    return onSnapshot(doc(db, 'deletion_requests', shop.shopId),
      (s) => setReq(s.exists() ? s.data() : null),
      // A listener that errors is dead for good — don't fail silently, or the card
      // would keep offering "Request closure" for a request already filed.
      (e) => console.warn('[close-store] closure-status listener stopped', e));
  }, [shop.shopId]);
  const pending = req && req.status === 'pending';
  const submit = () => {
    setBusy(true);
    requestAccountDeletion({ reason: reason.trim() })
      .then(()=>{
        toast && toast('Closure request sent for review','fa-check');
        setConfirm(false);
        // Reflect it immediately rather than waiting on the listener: the callable is
        // the source of truth that it's filed, and the snapshot may not deliver.
        setReq((r)=>({ ...(r||{}), status:'pending' }));
      })
      .catch((e)=>toast && toast(e?.message||'Could not send request'))
      .finally(()=>setBusy(false));
  };
  return (
    <SectionCard title="Close store">
      <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
        {pending ? (
          <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:38, height:38, borderRadius:11, flexShrink:0, background:'var(--m-surface-2)', color:'var(--m-warning, #d97706)', display:'flex', alignItems:'center', justifyContent:'center' }}><FA i="fa-hourglass-half" /></div>
            <div><div className="ym-h3" style={{ fontSize:14 }}>Closure request under review</div><div className="ym-cap">Our team is reviewing your request. Your store stays live until it's approved.</div></div>
          </div>
        ) : req && req.status === 'rejected' ? (
          <>
            <div className="ym-cap" style={{ color:'var(--m-fg2)' }}>Your last closure request was declined{req.resolution?`: ${req.resolution}`:'.'} You can request again below.</div>
            <Btn kind="ghost" icon="fa-store-slash" onClick={()=>setConfirm(true)} style={{ alignSelf:'flex-start', color:'var(--m-danger,#dc2626)' }}>Request store closure</Btn>
          </>
        ) : (
          <>
            <div className="ym-cap" style={{ color:'var(--m-fg2)', lineHeight:1.5 }}>Closing removes your store from the marketplace and ends your subscription. Because orders, payouts and employees are involved, closure needs <b>staff approval</b>.</div>
            <Btn kind="ghost" icon="fa-store-slash" onClick={()=>setConfirm(true)} style={{ alignSelf:'flex-start', color:'var(--m-danger,#dc2626)' }}>Request store closure</Btn>
          </>
        )}
      </div>
      {confirm && (
        <Sheet title="Request store closure" onClose={()=>!busy&&setConfirm(false)}>
          <p className="ym-sub" style={{ marginBottom:14 }}>This sends a request to our team. Once approved, your store is removed from the marketplace and your subscription ends. This can’t be undone.</p>
          <label className="ym-label">Reason (optional)</label>
          <textarea className="ipt" value={reason} onChange={e=>setReason(e.target.value)} maxLength={500} rows={3} placeholder="Tell us why you're closing (helps us improve)" style={{ resize:'vertical', minHeight:76, paddingTop:10 }} />
          <div style={{ display:'flex', gap:10, marginTop:18 }}>
            <Btn kind="ghost" onClick={()=>setConfirm(false)} disabled={busy} style={{ flex:1 }}>Cancel</Btn>
            <Btn kind="primary" onClick={submit} disabled={busy} style={{ flex:1, background:'var(--m-danger,#dc2626)' }}>{busy?'Sending…':'Send request'}</Btn>
          </div>
        </Sheet>
      )}
    </SectionCard>
  );
}
function F({ label, v }){ return <div><label className="ym-label">{label}</label><div className="ipt" style={{ display:'flex', alignItems:'center', minHeight:44, color:'var(--m-fg1)' }}>{v || '—'}</div></div>; }
function Row({ label, sub, children, last }){ return <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:14, padding:'12px 0', borderBottom:last?'none':'1px solid var(--m-border)' }}><div><div className="ym-h3" style={{ fontSize:14 }}>{label}</div><div className="ym-cap">{sub}</div></div>{children}</div>; }

/* Editable shop name / area / tagline → updateStoreProfile callable. */
function ShopProfileForm({ shop, toast }){
  const [name, setName] = useStateX(shop.name || '');
  const [area, setArea] = useStateX(shop.area || '');
  const [tagline, setTagline] = useStateX(shop.tagline || '');
  const [busy, setBusy] = useStateX(false);
  useEffX(()=>{ setName(shop.name||''); setArea(shop.area||''); setTagline(shop.tagline||''); }, [shop.shopId, shop.name, shop.area, shop.tagline]);
  const dirty = name.trim() !== (shop.name||'').trim() || area.trim() !== (shop.area||'').trim() || tagline.trim() !== (shop.tagline||'').trim();
  const save = () => {
    if (name.trim().length < 2) { toast && toast('Enter a shop name'); return; }
    setBusy(true);
    updateStoreProfile({ name:name.trim(), area:area.trim(), tagline:tagline.trim() })
      .then(()=>toast&&toast('Shop profile updated','fa-check'))
      .catch((e)=>toast&&toast(e?.message||'Could not update'))
      .finally(()=>setBusy(false));
  };
  return (
    <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>
      <div><label className="ym-label">Shop name</label><input className="ipt" value={name} onChange={e=>setName(e.target.value)} maxLength={80} placeholder="Your shop name" /></div>
      <div><label className="ym-label">Owner</label><div className="ipt" style={{ display:'flex', alignItems:'center', minHeight:44, color:'var(--m-fg3)' }}>{shop.owner || '—'}</div></div>
      <div><label className="ym-label">Area / town</label><input className="ipt" value={area} onChange={e=>setArea(e.target.value)} maxLength={80} placeholder="e.g. Westlands, Nairobi" /></div>
      <div><label className="ym-label">Tagline</label><input className="ipt" value={tagline} onChange={e=>setTagline(e.target.value)} maxLength={160} placeholder="A short line shoppers see on your store" /></div>
      <Btn kind="primary" icon="fa-check" disabled={busy || !dirty} onClick={save} style={{ alignSelf:'flex-start' }}>{busy?'Saving…':'Save changes'}</Btn>
    </div>
  );
}

const SOCIAL_FIELDS = [
  { k:'instagram', label:'Instagram', icon:'fa-instagram', ph:'@handle or link' },
  { k:'facebook',  label:'Facebook',  icon:'fa-facebook',  ph:'Page name or link' },
  { k:'tiktok',    label:'TikTok',    icon:'fa-tiktok',    ph:'@handle or link' },
  { k:'x',         label:'X',         icon:'fa-x-twitter', ph:'@handle or link' },
  { k:'whatsapp',  label:'WhatsApp',  icon:'fa-whatsapp',  ph:'2547XXXXXXXX' },
  { k:'website',   label:'Website',   icon:'fa-globe',     ph:'yourshop.co.ke' },
];
/* Social links shown on the public store page → setStoreSocials callable. */
function StoreSocialsForm({ shop, toast }){
  const init = () => { const o = {}; SOCIAL_FIELDS.forEach(f => o[f.k] = (shop.socials && shop.socials[f.k]) || ''); return o; };
  const [vals, setVals] = useStateX(init);
  const [busy, setBusy] = useStateX(false);
  useEffX(()=>{ setVals(init()); /* eslint-disable-next-line */ }, [shop.shopId, shop.socials]);
  const save = () => {
    setBusy(true);
    setStoreSocials(vals)
      .then(()=>toast&&toast('Social links saved','fa-check'))
      .catch((e)=>toast&&toast(e?.message||'Could not save'))
      .finally(()=>setBusy(false));
  };
  return (
    <SectionCard title="Social links" sub="Shown on your public store page">
      <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
        {SOCIAL_FIELDS.map(f=>(
          <div key={f.k}>
            <label className="ym-label"><FA i={f.icon} brand={f.k!=='website'} style={{ width:16, marginRight:6, color:'var(--m-fg3)' }} />{f.label}</label>
            <input className="ipt" value={vals[f.k]||''} onChange={e=>setVals(v=>({ ...v, [f.k]:e.target.value }))} maxLength={200} placeholder={f.ph} />
          </div>
        ))}
        <Btn kind="primary" icon="fa-check" disabled={busy} onClick={save} style={{ alignSelf:'flex-start' }}>{busy?'Saving…':'Save links'}</Btn>
      </div>
    </SectionCard>
  );
}

/* Who follows this store → listStoreFollowers callable (loaded on demand). */
function FollowersCard({ toast }){
  const [open, setOpen] = useStateX(false);
  const [state, setState] = useStateX({ loading:false, loaded:false, list:[], count:0 });
  const load = () => {
    setState(s=>({ ...s, loading:true }));
    listStoreFollowers({})
      .then((r)=>{ const d = r?.data || r || {}; setState({ loading:false, loaded:true, list:d.followers||[], count:d.count||0 }); })
      .catch((e)=>{ setState({ loading:false, loaded:true, list:[], count:0 }); toast&&toast(e?.message||'Could not load followers'); });
  };
  const toggle = () => { const nx = !open; setOpen(nx); if (nx && !state.loaded && !state.loading) load(); };
  return (
    <SectionCard title="Followers" sub="Shoppers who follow your store">
      <div style={{ padding:'8px 20px 18px' }}>
        <button onClick={toggle} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', gap:12, background:'none', border:'none', cursor:'pointer', padding:'8px 0', fontFamily:'inherit' }}>
          <span style={{ display:'flex', alignItems:'center', gap:10 }}><FA i="fa-heart" style={{ color:'var(--m-primary)' }} /><span className="ym-h3" style={{ fontSize:14 }}>{state.loaded ? `${state.count} follower${state.count===1?'':'s'}` : 'View followers'}</span></span>
          <FA i={open?'fa-chevron-up':'fa-chevron-down'} style={{ color:'var(--m-fg3)', fontSize:12 }} />
        </button>
        {open && (
          <div style={{ marginTop:10 }}>
            {state.loading && <div className="ym-cap" style={{ padding:'12px 0' }}>Loading…</div>}
            {!state.loading && state.loaded && state.list.length===0 && <div className="ym-cap" style={{ padding:'12px 0' }}>No followers yet. Share your store link to grow your following.</div>}
            {!state.loading && state.list.map((f)=>(
              <div key={f.uid} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderTop:'1px solid var(--m-border)' }}>
                <Avatar name={f.name} src={f.photoUrl} size={34} />
                <div style={{ flex:1, minWidth:0 }}><div className="ym-h3" style={{ fontSize:13.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.name||'Shopper'}</div>{f.followedAt && <div className="ym-cap">{new Date(f.followedAt).toLocaleDateString('en-KE',{ day:'numeric', month:'short', year:'numeric' })}</div>}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

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

  useEffX(() => { if (live) return subscribeConversations(uid, setConvos, 'merchant'); setConvos([]); return undefined; }, [uid, live]);

  const list = convos || [];
  const visible = list.filter((c) => !c.hidden); // rows exclude "deleted for me"
  const selConv = list.find((c) => c.id === sel) || visible[0] || null;
  const removeConv = (c) => {
    if (!window.confirm('Remove this conversation from your inbox? It’ll come back if the customer messages you again.')) return;
    if (sel === c.id) setSel(null);
    hideConversation(c.id, uid).catch(() => {});
  };

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
      <Card data-view={sel ? 'thread' : 'list'} style={{ display:'grid', gridTemplateColumns:'300px 1fr', overflow:'hidden', height:'min(660px, calc(100vh - 220px))', minHeight:480 }} className="chat-grid">
        <div className="chat-list" style={{ borderRight:'1px solid var(--m-border)', overflowY:'auto' }}>
          {convos === null && <div style={{ padding:'22px 16px', color:'var(--m-fg3)', fontSize:13.5 }}>Loading chats…</div>}
          {convos !== null && visible.length === 0 && (
            <div style={{ padding:'26px 16px', textAlign:'center', color:'var(--m-fg3)', fontSize:13.5 }}>
              <FA i="fa-comments" style={{ fontSize:28, color:'var(--m-fg4)', marginBottom:10, display:'block' }} />
              No customer messages yet.
            </div>
          )}
          {visible.map((x) => {
            const otherId = otherParticipant(x, uid);
            const info = (x.info && x.info[otherId]) || {};
            const unread = (x.unread && x.unread[uid]) || 0;
            return (
              <div key={x.id} className="conv-row" style={{ position:'relative', borderBottom:'1px solid var(--m-border)' }}>
                <button onClick={()=>setSel(x.id)} style={{ width:'100%', textAlign:'left', border:'none', cursor:'pointer', fontFamily:'inherit', padding:'13px 42px 13px 14px', display:'flex', gap:12, alignItems:'center', background:(selConv&&selConv.id===x.id)?'var(--m-surface-3)':'transparent' }}>
                  <div style={{ position:'relative', flexShrink:0 }}><Avatar name={info.name || 'Customer'} size={44} />{unread>0 && <span style={{ position:'absolute', top:-2, right:-2, minWidth:18, height:18, borderRadius:9999, background:'var(--m-primary)', color:'#fff', fontSize:10.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--m-surface)' }}>{unread}</span>}</div>
                  <div style={{ flex:1, minWidth:0 }}><div style={{ display:'flex', justifyContent:'space-between' }}><span className="ym-h3" style={{ fontSize:14 }}>{info.name || 'Customer'}</span><span className="ym-cap">{fmtWhen(x.updatedAt)}</span></div><div className="ym-sub" style={{ fontSize:12.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', color:unread?'var(--m-fg1)':'var(--m-fg3)', fontWeight:unread?600:400 }}>{x.lastMessage || 'New conversation'}</div></div>
                </button>
                <button onClick={(e)=>{ e.stopPropagation(); removeConv(x); }} className="conv-del" aria-label="Delete conversation" title="Delete conversation" style={{ position:'absolute', top:'50%', right:6, transform:'translateY(-50%)', width:30, height:30, borderRadius:8, border:'none', background:'transparent', color:'var(--m-fg4)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><FA i="fa-trash" style={{ fontSize:12 }} /></button>
              </div>
            );
          })}
        </div>
        {selConv
          ? <MerchantChatThread key={selConv.id} conv={selConv} user={user} onBack={()=>setSel(null)} />
          : <div className="chat-thread" style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--m-fg3)', fontSize:14, padding:24 }}>Select a conversation.</div>}
      </Card>
      )}
      <style>{`@media (max-width:640px){
        .chat-grid{ grid-template-columns:1fr !important; }
        .chat-grid[data-view="thread"] .chat-list{ display:none !important; }
        .chat-grid[data-view="list"] .chat-thread{ display:none !important; }
        .chat-back{ display:inline-flex !important; }
      }`}</style>
    </div>
  );
}

/* Compact order-reference card inside a chat bubble when a message carries an
   `order` tag (a shopper messaging about a specific order). `dark` = my bubble. */
function OrderRefCard({ order, dark }){
  const fg = dark ? 'rgba(255,255,255,.95)' : 'var(--m-fg1)';
  const sub = dark ? 'rgba(255,255,255,.72)' : 'var(--m-fg3)';
  const bits = [order.items ? `${order.items} item${order.items !== 1 ? 's' : ''}` : '', order.total != null ? ksh(order.total) : ''].filter(Boolean).join(' · ');
  return (
    <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:7, padding:'8px 10px', borderRadius:10, background: dark ? 'rgba(255,255,255,.15)' : 'var(--m-surface-2)' }}>
      <span style={{ width:30, height:30, borderRadius:8, flexShrink:0, background: dark ? 'rgba(255,255,255,.2)' : 'var(--m-bg)', color: dark ? '#fff' : 'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center' }}><FA i="fa-receipt" style={{ fontSize:13 }} /></span>
      <span style={{ minWidth:0 }}>
        <span style={{ display:'block', fontWeight:700, fontSize:12.5, fontFamily:'monospace', color:fg, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{order.no || 'Order'}</span>
        {bits && <span style={{ fontSize:11, color:sub }}>{bits}</span>}
      </span>
    </div>
  );
}

// Canned one-tap replies for merchants answering customers fast.
const QUICK_REPLIES = [
  'Yes, it’s available! 😊',
  'It’s in stock — how many would you like?',
  'Thanks for reaching out!',
  'Let me check and get back to you shortly.',
  'You can pay via M-Pesa or your YoteWallet at checkout.',
  'We deliver to your nearest pickup hub.',
];

/* Negotiation card in the merchant thread — an offer/counter from either side. On
   the latest, still-open offer FROM THE CUSTOMER the merchant can Accept (which
   re-posts it as a payable deal), Counter or Decline. The merchant's own offers
   show a "waiting" note. Older/closed offers render static. */
function OfferCard({ offer, myRole, active, onAccept, onCounter, onDecline }){
  const mine = offer.by === myRole; // the merchant's own offer
  const dark = mine;
  const fg = dark ? 'rgba(255,255,255,.96)' : 'var(--m-fg1)';
  const sub = dark ? 'rgba(255,255,255,.78)' : 'var(--m-fg3)';
  const accent = dark ? '#fff' : 'var(--m-primary)';
  const its = offerItems(offer);
  const total = offerTotal(offer);
  const bundle = its.length > 1;
  const ico = { flexShrink:0, width:38, height:34, borderRadius:9, border:'none', cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:13, background: dark ? 'rgba(255,255,255,.16)' : 'var(--m-surface-3)' };
  return (
    <div style={{ marginBottom:7, borderRadius:12, overflow:'hidden', border:'1px solid ' + (dark ? 'rgba(255,255,255,.25)' : 'var(--m-primary)'), opacity: active ? 1 : .66 }}>
      <div style={{ padding:'8px 11px', display:'flex', alignItems:'center', gap:7, background: dark ? 'rgba(255,255,255,.15)' : 'color-mix(in srgb, var(--m-primary) 12%, transparent)' }}>
        <FA i={bundle ? 'fa-boxes-stacked' : 'fa-handshake'} style={{ color:accent, fontSize:12 }} />
        <span style={{ fontSize:10.5, fontWeight:800, letterSpacing:.4, textTransform:'uppercase', color:accent }}>{bundle ? 'Bundle offer' : (mine ? 'Your offer' : 'Customer’s offer')}</span>
      </div>
      <div style={{ padding:'9px 11px', background: dark ? 'rgba(255,255,255,.06)' : 'var(--m-surface-2)' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {its.map((it, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ flex:1, minWidth:0, fontWeight:600, fontSize:12.5, color:fg, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.productName || 'Product'}</div>
              {(Number(it.qty) || 1) > 1 && <span style={{ fontSize:11, color:sub, flexShrink:0 }}>× {it.qty}</span>}
            </div>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginTop:7, paddingTop:7, borderTop:'1px solid '+(dark?'rgba(255,255,255,.16)':'var(--m-border)') }}>
          <span style={{ fontSize:11, color:sub }}>{bundle ? `${its.length} items` : 'Total'}</span>
          <b style={{ fontSize:14.5, color:fg }}>{ksh(total)}</b>
        </div>
        {offer.note && <div style={{ fontSize:11.5, color:sub, marginTop:6 }}>{offer.note}</div>}
        {active && !mine && (
          <div style={{ display:'flex', gap:7, marginTop:9 }}>
            <button onClick={()=>onAccept(offer)} style={{ flex:1, height:34, borderRadius:9, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:12.5, fontWeight:700, background:'var(--m-primary)', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6 }}><FA i="fa-check" /> Accept {ksh(total)}</button>
            <button onClick={()=>onCounter(offer)} title="Counter" aria-label="Counter" style={{ ...ico, color:'var(--m-fg2)' }}><FA i="fa-arrow-right-arrow-left" /></button>
            <button onClick={()=>onDecline(offer)} title="Decline" aria-label="Decline" style={{ ...ico, color:'var(--m-danger)' }}><FA i="fa-xmark" /></button>
          </div>
        )}
        {active && mine && <div style={{ fontSize:10.5, color:sub, marginTop:6 }}>Sent — the customer can Accept &amp; pay, counter or decline.</div>}
      </div>
    </div>
  );
}

/* Price prompt to counter/make an offer. Items are fixed (from the offer being
   countered); only the TOTAL is negotiated. */
function OfferCounterModal({ base, onClose, onSend }){
  const its = offerItems(base);
  const bundle = its.length > 1;
  const [price, setPrice] = useStateX(String(offerTotal(base) || ''));
  const [note, setNote] = useStateX('');
  const pr = Number(price);
  const inp = { width:'100%', padding:'11px 13px', borderRadius:11, border:'1px solid var(--m-border)', background:'var(--m-surface)', color:'var(--m-fg1)', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(8,10,24,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={(e)=>e.stopPropagation()} className="ym-card" style={{ width:'100%', maxWidth:400, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div className="ym-h2" style={{ fontSize:17, display:'flex', alignItems:'center', gap:8 }}><FA i={bundle ? 'fa-boxes-stacked' : 'fa-handshake'} style={{ color:'var(--m-primary)' }} /> {bundle ? 'Counter the bundle' : 'Counter-offer'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--m-fg3)', fontSize:18 }}><FA i="fa-xmark" /></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
          {its.map((it, i) => <div key={i} className="ym-sub" style={{ fontSize:13, display:'flex', justifyContent:'space-between', gap:8 }}><span style={{ minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.productName || 'Product'}</span>{(Number(it.qty) || 1) > 1 && <span style={{ color:'var(--m-fg3)', flexShrink:0 }}>× {it.qty}</span>}</div>)}
        </div>
        <label className="ym-cap" style={{ fontWeight:600, display:'block' }}>Your price{bundle ? ' for the bundle' : ''} (KSh)
          <input value={price} onChange={(e)=>setPrice(e.target.value.replace(/[^\d.]/g,''))} inputMode="decimal" placeholder="0" style={inp} autoFocus />
        </label>
        <label className="ym-cap" style={{ fontWeight:600, display:'block', marginTop:10 }}>Note (optional)
          <input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="e.g. best I can do" style={inp} />
        </label>
        <Btn kind="primary" disabled={!(pr > 0)} style={{ width:'100%', marginTop:16, justifyContent:'center' }} onClick={()=>onSend(base, pr, note.trim())}><FA i="fa-paper-plane" /> Send · {ksh(pr > 0 ? pr : 0)}</Btn>
      </div>
    </div>
  );
}

/* Merchant composes a deal — ONE or MANY catalog products bundled at a single
   negotiated total — sent as an `offer`-tagged message the shopper can accept & pay. */
function OfferComposer({ products, storeId, initialItems, initialPrice, onClose, onSend }){
  const list = Array.isArray(products) ? products : [];
  const [sel, setSel] = useStateX(Array.isArray(initialItems) ? initialItems.map((i) => ({ productId: i.productId, qty: Number(i.qty) || 1 })) : []); // [{ productId, qty }]
  const [addPid, setAddPid] = useStateX('');
  const [price, setPrice] = useStateX(initialPrice ? String(initialPrice) : '');
  const [touched, setTouched] = useStateX(!!initialPrice);
  const [note, setNote] = useStateX('');
  const rows = sel.map((s) => { const p = list.find((x) => x.id === s.productId) || {}; return { ...s, p, line: (Number(p.price) || 0) * (Number(s.qty) || 1) }; });
  const catalogTotal = rows.reduce((a, r) => a + r.line, 0);
  useEffX(() => { if (!touched) setPrice(catalogTotal ? String(catalogTotal) : ''); }, [catalogTotal, touched]);
  const add = () => { if (!addPid || sel.some((s) => s.productId === addPid)) return; setSel((a) => [...a, { productId: addPid, qty: 1 }]); setAddPid(''); };
  const setQty = (pid, q) => setSel((a) => a.map((s) => s.productId === pid ? { ...s, qty: Math.max(1, Number(q) || 1) } : s));
  const remove = (pid) => setSel((a) => a.filter((s) => s.productId !== pid));
  const pr = Number(price);
  const valid = sel.length > 0 && pr > 0;
  const bundle = sel.length > 1;
  const available = list.filter((p) => !sel.some((s) => s.productId === p.id));
  const submit = () => {
    if (!valid) return;
    const items = rows.map((r) => ({ productId: r.productId, productName: r.p.name || 'Product', productImage: r.p.img || null, productIcon: r.p.icon || 'fa-box', qty: Number(r.qty) || 1 }));
    onSend({ id: 'of_' + Math.random().toString(36).slice(2, 9), by: 'merchant', items, price: pr, note: note.trim(), storeId: storeId || null });
  };
  const inp = { width:'100%', padding:'11px 13px', borderRadius:11, border:'1px solid var(--m-border)', background:'var(--m-surface)', color:'var(--m-fg1)', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(8,10,24,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={(e)=>e.stopPropagation()} className="ym-card" style={{ width:'100%', maxWidth:440, maxHeight:'86vh', overflowY:'auto', padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div className="ym-h2" style={{ fontSize:17, display:'flex', alignItems:'center', gap:8 }}><FA i={bundle ? 'fa-boxes-stacked' : 'fa-handshake'} style={{ color:'var(--m-primary)' }} /> {bundle ? 'Bundle offer' : 'Send an offer'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--m-fg3)', fontSize:18 }}><FA i="fa-xmark" /></button>
        </div>
        {list.length === 0 ? (
          <div className="ym-sub" style={{ textAlign:'center', padding:'20px 0' }}>Add a product to your store first, then you can offer it here.</div>
        ) : (
          <>
            <label className="ym-cap" style={{ fontWeight:600 }}>Add a product
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <select value={addPid} onChange={(e)=>setAddPid(e.target.value)} style={{ ...inp, flex:1 }}>
                  <option value="">Choose a product…</option>
                  {available.map((p) => <option key={p.id} value={p.id}>{p.name}{p.price != null ? ` · ${ksh(p.price)}` : ''}</option>)}
                </select>
                <Btn kind="ghost" disabled={!addPid} onClick={add}><FA i="fa-plus" /> Add</Btn>
              </div>
            </label>
            {rows.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:12 }}>
                {rows.map((r) => (
                  <div key={r.productId} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ flex:1, minWidth:0 }}><div className="ym-sub" style={{ color:'var(--m-fg1)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.p.name || 'Product'}</div><div className="ym-cap">{ksh(r.p.price || 0)} each</div></div>
                    <input value={r.qty} onChange={(e)=>setQty(r.productId, e.target.value.replace(/[^\d]/g,''))} inputMode="numeric" aria-label="Quantity" style={{ ...inp, width:54, textAlign:'center', padding:'8px 6px' }} />
                    <button onClick={()=>remove(r.productId)} title="Remove" aria-label="Remove" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--m-fg3)', fontSize:14 }}><FA i="fa-trash-can" /></button>
                  </div>
                ))}
              </div>
            )}
            {sel.length > 0 && (
              <>
                <label className="ym-cap" style={{ fontWeight:600, display:'block', marginTop:14 }}>{bundle ? 'Bundle price' : 'Agreed price'} (KSh, total)
                  <input value={price} onChange={(e)=>{ setTouched(true); setPrice(e.target.value.replace(/[^\d.]/g,'')); }} inputMode="decimal" placeholder="0" style={inp} />
                </label>
                {catalogTotal > 0 && pr > 0 && pr < catalogTotal && <div className="ym-cap" style={{ marginTop:8, color:'var(--m-primary)' }}><FA i="fa-tag" /> {Math.round((1 - pr / catalogTotal) * 100)}% off · saves {ksh(catalogTotal - pr)} vs {ksh(catalogTotal)}</div>}
                <label className="ym-cap" style={{ fontWeight:600, display:'block', marginTop:10 }}>Note (optional)
                  <input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="e.g. valid today only" style={inp} />
                </label>
              </>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16 }}>
              <div><div className="ym-cap">Customer pays</div><div className="ym-h3" style={{ fontSize:18 }}>{ksh(pr > 0 ? pr : 0)}</div></div>
              <Btn kind="primary" disabled={!valid} onClick={submit}><FA i="fa-paper-plane" /> Send offer</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* Pro-tier AI Deal Assist — shows what THIS shopper has in their cart from the
   store (shared via conv.cartHint) and asks YoteAI for a price + one-line pitch to
   close. One tap prefills the bundle-offer composer at the suggested price. */
function DealAssist({ conv, products, onOffer }){
  const list = Array.isArray(products) ? products : [];
  const hint = Array.isArray(conv.cartHint) ? conv.cartHint : [];
  const rows = hint.map((h) => { const p = list.find((x) => x.id === h.productId); const price = Number((p && p.price != null) ? p.price : h.price) || 0; return { productId: h.productId, name: (p && p.name) || h.name || 'Item', qty: Number(h.qty) || 1, price }; }).filter((r) => r.productId);
  const catalog = rows.reduce((s, r) => s + r.price * r.qty, 0);
  const heuristic = () => { const n = rows.reduce((s, r) => s + r.qty, 0); const f = n >= 4 ? 0.85 : n >= 2 ? 0.9 : 0.95; return Math.max(0, Math.round((catalog * f) / 10) * 10); };
  const [suggested, setSuggested] = useStateX(heuristic());
  const [pitch, setPitch] = useStateX('');
  const [busy, setBusy] = useStateX(false);
  useEffX(() => {
    if (rows.length === 0) return undefined;
    let alive = true; setBusy(true); setSuggested(heuristic());
    const desc = rows.map((r) => `${r.qty}× ${r.name} (listed ${ksh(r.price)} each)`).join(', ');
    const prompt = `A customer is chatting with me right now. Their cart from my store: ${desc}. Suggest ONE bundle price to offer them to close the sale now — a strategic discount that still protects my margin — plus a short one-sentence pitch I can send. Reply on ONE line EXACTLY as: PRICE=<number> | <pitch>`;
    aiAssistant({ role: 'merchant', messages: [{ role: 'user', content: prompt }] })
      .then(({ reply }) => {
        if (!alive) return;
        const m = /PRICE\s*=\s*([\d,]+)/i.exec(reply || '');
        if (m) { const v = Number(m[1].replace(/,/g, '')); if (v > 0) setSuggested(v); }
        const p = (reply || '').includes('|') ? (reply || '').split('|').slice(1).join('|').trim() : (reply || '').replace(/PRICE\s*=\s*[\d,]+/i, '').trim();
        if (p) setPitch(p.slice(0, 240));
      })
      .catch(() => {})
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [conv.id, catalog, rows.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (rows.length === 0) return null;
  const off = catalog > suggested && suggested > 0;
  return (
    <div style={{ margin:'0 16px', borderRadius:12, overflow:'hidden', border:'1px solid var(--m-primary)' }}>
      <div style={{ padding:'7px 12px', display:'flex', alignItems:'center', gap:8, background:'color-mix(in srgb, var(--m-primary) 14%, transparent)' }}>
        <YoteAiMark size={15} color="var(--m-primary)" />
        <span style={{ fontSize:11, fontWeight:800, letterSpacing:.3, textTransform:'uppercase', color:'var(--m-primary)' }}>YoteAI Deal Assist</span>
        <span style={{ marginLeft:'auto', fontSize:9.5, fontWeight:800, color:'var(--m-primary)', border:'1px solid var(--m-primary)', borderRadius:9999, padding:'1px 7px' }}>PRO</span>
      </div>
      <div style={{ padding:'10px 12px', background:'var(--m-surface)' }}>
        <div className="ym-cap" style={{ marginBottom:6 }}>In this customer’s cart from your store:</div>
        <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:8 }}>
          {rows.map((r) => <div key={r.productId} style={{ display:'flex', justifyContent:'space-between', gap:8, fontSize:12.5, color:'var(--m-fg1)' }}><span style={{ minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.qty > 1 ? `${r.qty}× ` : ''}{r.name}</span><span style={{ color:'var(--m-fg3)', flexShrink:0 }}>{ksh(r.price * r.qty)}</span></div>)}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, paddingTop:8, borderTop:'1px solid var(--m-border)' }}>
          <div style={{ minWidth:0 }}>
            <div className="ym-cap">Catalog {ksh(catalog)} · YoteAI suggests</div>
            <div className="ym-h3" style={{ fontSize:17, color:'var(--m-primary)' }}>{busy ? '…' : ksh(suggested)}{off && !busy ? <span className="ym-cap" style={{ marginLeft:6, color:'var(--m-fg3)', fontWeight:600 }}>{Math.round((1 - suggested / catalog) * 100)}% off</span> : null}</div>
          </div>
          <Btn kind="primary" onClick={()=>onOffer({ items: rows.map((r) => ({ productId: r.productId, qty: r.qty })), price: suggested })}><FA i="fa-handshake" /> Offer bundle</Btn>
        </div>
        {pitch && <div style={{ marginTop:9, fontSize:12.5, lineHeight:1.5, color:'var(--m-fg2)', display:'flex', gap:7 }}><FA i="fa-wand-magic-sparkles" style={{ color:'var(--m-primary)', fontSize:11, marginTop:3, flexShrink:0 }} /> <span>{pitch}</span></div>}
      </div>
    </div>
  );
}

function MerchantChatThread({ conv, user, onBack }){
  const uid = user.uid;
  const otherId = otherParticipant(conv, uid);
  const info = (conv.info && conv.info[otherId]) || {};
  const blocked = conv.status === 'blocked';
  const { store, products } = useMerchant();
  const ent = useEntitlements();
  const [msgs, setMsgs] = useStateX([]);
  const [draft, setDraft] = useStateX('');
  const [offerOpen, setOfferOpen] = useStateX(false);
  const [counterFor, setCounterFor] = useStateX(null);
  const [showJump, setShowJump] = useStateX(false);
  const [newBelow, setNewBelow] = useStateX(false);
  const scrollRef = useRefX(null);
  const atBottomRef = useRefX(true);

  const onScroll = () => {
    const el = scrollRef.current; if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = near;
    setShowJump(!near);
    if (near) setNewBelow(false);
  };
  const jumpToLatest = () => {
    const el = scrollRef.current; if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    atBottomRef.current = true; setShowJump(false); setNewBelow(false);
  };

  useEffX(() => subscribeMessages(conv.id, setMsgs), [conv.id]);
  useEffX(() => { markConversationRead(conv.id, uid); }, [conv.id, msgs.length]);
  // Stick to the newest message only when already at the bottom — never yank the
  // reader back down while they're scrolled up; flag "new messages" instead.
  useEffX(() => {
    const el = scrollRef.current; if (!el) return;
    if (atBottomRef.current) el.scrollTop = el.scrollHeight;
    else if (msgs.length) setNewBelow(true);
  }, [msgs]);

  const send = (t, extra) => {
    const v=(t||draft).trim(); if(!v || blocked) return;
    setDraft('');
    sendChatMessage({ convId: conv.id, user, text: v, recipientUid: otherId, ...(extra || {}) }).catch(()=>{});
  };

  // Messages I can see — a chat I "deleted" starts fresh for me on re-open.
  const shown = visibleMessages(msgs, conv, uid);
  // Read receipt: has the customer read past my latest reply?
  const otherReadMs = tsMillis((conv.lastReadAt && conv.lastReadAt[otherId]) || 0);
  let myLastIdx = -1;
  for (let i = shown.length - 1; i >= 0; i--) { if (shown[i].senderId === uid) { myLastIdx = i; break; } }

  // Negotiation: only the latest offer is actionable, until a decline closes it.
  let lastOfferIdx = -1;
  for (let i = shown.length - 1; i >= 0; i--) { if (shown[i].offer) { lastOfferIdx = i; break; } }
  const negotiationClosed = lastOfferIdx >= 0 && shown.some((m, i) => i > lastOfferIdx && m.offerClosed);
  // Merchant accepting the customer's offer re-posts it as a payable merchant offer.
  const acceptOffer = (o) => send(`Deal agreed ✓ — ${ksh(offerTotal(o))}. You can pay now.`, { offer: { id: 'of_' + Math.random().toString(36).slice(2, 9), by: 'merchant', items: offerItems(o), price: offerTotal(o), note: 'Agreed ✓', storeId: o.storeId || null } });
  const declineOffer = () => send('Sorry, I can’t do that price on this one.', { offerClosed: true });
  const sendCounter = (base, price, note) => { setCounterFor(null); const its = offerItems(base); send(`Counter-offer: ${ksh(price)}${its.length > 1 ? ` for the bundle (${its.length} items)` : ''}`, { offer: { id: 'of_' + Math.random().toString(36).slice(2, 9), by: 'merchant', items: its, price: Number(price), note: note || '', storeId: base.storeId || null } }); };

  return (
    <div className="chat-thread" style={{ display:'flex', flexDirection:'column', height:'100%', minWidth:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:'1px solid var(--m-border)' }}>
        <button className="chat-back" onClick={onBack} aria-label="Back to chats" style={{ display:'none', width:34, height:34, borderRadius:9999, border:'none', background:'var(--m-surface-2)', color:'var(--m-fg2)', cursor:'pointer', alignItems:'center', justifyContent:'center', flexShrink:0 }}><FA i="fa-arrow-left" /></button>
        <Avatar name={info.name || 'Customer'} size={40} />
        <div style={{ flex:1 }}><div className="ym-h3">{info.name || 'Customer'}</div><div className="ym-cap" style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:7, height:7, borderRadius:9999, background:blocked?'var(--m-danger)':'var(--m-success)' }} /> {blocked ? 'Conversation closed' : 'Customer'}</div></div>
      </div>
      {ent.can('dealAssist') && Array.isArray(conv.cartHint) && conv.cartHint.length > 0 && (
        <div style={{ padding:'10px 0 0' }}><DealAssist conv={conv} products={products} onOffer={(d)=>setOfferOpen(d)} /></div>
      )}
      <div style={{ flex:1, minHeight:0, position:'relative' }}>
      <div ref={scrollRef} onScroll={onScroll} style={{ position:'absolute', inset:0, overflowY:'auto', padding:18, display:'flex', flexDirection:'column', gap:10, background:'var(--m-bg)' }}>
        {shown.length===0 && <div style={{ margin:'auto', color:'var(--m-fg3)', fontSize:13.5 }}>No messages yet.</div>}
        {shown.map((m, idx) => {
          const mine = m.senderId === uid;
          const seen = mine && idx === myLastIdx && tsMillis(m.at) > 0 && otherReadMs >= tsMillis(m.at);
          const ms = tsMillis(m.at);
          const showDay = !!ms && (idx === 0 || !sameDayMs(ms, tsMillis(shown[idx-1].at)));
          return (
            <React.Fragment key={m.id}>
              {showDay && <div style={{ alignSelf:'center', margin:'4px 0', padding:'3px 12px', borderRadius:9999, background:'var(--m-surface-2)', color:'var(--m-fg3)', fontSize:11, fontWeight:600 }}>{dayLabel(ms)}</div>}
              <div style={{ maxWidth:'80%', padding:'10px 14px', fontSize:14, lineHeight:1.45, alignSelf:mine?'flex-end':'flex-start', background:mine?'var(--m-primary-deep)':'var(--m-surface)', color:mine?'#fff':'var(--m-fg1)', borderRadius:mine?'16px 16px 4px 16px':'16px 16px 16px 4px', boxShadow:'var(--m-shadow-card)' }}>{m.offer && <OfferCard offer={m.offer} myRole="merchant" active={idx === lastOfferIdx && !negotiationClosed} onAccept={acceptOffer} onCounter={setCounterFor} onDecline={declineOffer} />}{m.order && <OrderRefCard order={m.order} dark={mine} />}{m.text}<div style={{ fontSize:10, opacity:.65, marginTop:4, textAlign:'right' }}>{fmtTime(m.at)}{seen ? <> · <FA i="fa-check-double" /> Seen</> : ''}</div></div>
            </React.Fragment>
          );
        })}
      </div>
      {showJump && (
        <button onClick={jumpToLatest} aria-label="Jump to latest messages" title="Jump to latest" style={{ position:'absolute', right:14, bottom:12, height:34, padding: newBelow ? '0 13px' : 0, width: newBelow ? 'auto' : 34, borderRadius:9999, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:12.5, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7, background: newBelow ? 'var(--m-primary)' : 'var(--m-surface)', color: newBelow ? '#fff' : 'var(--m-fg2)', boxShadow:'var(--m-shadow-float)' }}>
          <FA i="fa-arrow-down" style={{ fontSize:12 }} />{newBelow ? 'New messages' : ''}
        </button>
      )}
      </div>
      {!blocked && (
        <div className="scroll-x" style={{ display:'flex', gap:8, padding:'10px 16px 0', overflowX:'auto' }}>
          {QUICK_REPLIES.map((q) => (
            <button key={q} onClick={()=>send(q)} title={q} style={{ flexShrink:0, height:32, padding:'0 13px', borderRadius:9999, border:'1px solid var(--m-border)', background:'var(--m-surface-2)', color:'var(--m-fg2)', fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>{q}</button>
          ))}
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderTop:'1px solid var(--m-border)', background:'var(--m-surface)' }}>
        <button onClick={()=>setOfferOpen(true)} disabled={blocked} title="Send an offer" aria-label="Send an offer" style={{ flexShrink:0, width:46, height:46, borderRadius:9999, border:'1px solid var(--m-border)', background:'var(--m-surface-2)', color:'var(--m-primary)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, opacity:blocked?.6:1 }}><FA i="fa-handshake" /></button>
        <input className="ym-input" placeholder={blocked ? 'Conversation closed' : 'Reply…'} aria-label="Reply" disabled={blocked} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') send(); }} style={{ flex:1, minWidth:0, height:46, padding:'0 18px', fontSize:15, borderRadius:9999, background:'var(--m-surface-2)', border:'none', opacity:blocked?.6:1 }} />
        <button onClick={()=>send()} disabled={blocked} aria-label="Send" style={{ flexShrink:0, width:46, height:46, borderRadius:9999, border:'none', background:'var(--m-primary-deep)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, opacity:blocked?.6:1 }}><FA i="fa-paper-plane" /></button>
      </div>
      {offerOpen && <OfferComposer products={products} storeId={store?.id} initialItems={offerOpen === true ? null : offerOpen.items} initialPrice={offerOpen === true ? null : offerOpen.price} onClose={()=>setOfferOpen(false)} onSend={(offer)=>{ setOfferOpen(false); const its = offer.items || []; send(its.length > 1 ? `Bundle offer: ${its.length} items — ${ksh(offer.price)}` : `Offer: ${its[0]?.productName || 'product'} — ${ksh(offer.price)}`, { offer }); }} />}
      {counterFor && <OfferCounterModal base={counterFor} onClose={()=>setCounterFor(null)} onSend={sendCounter} />}
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
          <div style={{ width:42, height:42, borderRadius:12, background:'rgba(255,255,255,.16)', display:'flex', alignItems:'center', justifyContent:'center' }}><YoteAiMark size={22} color="#fff" /></div>
          <div style={{ flex:1 }}><div style={{ color:'#fff', fontWeight:700, fontSize:16 }}>YoteAI</div><div style={{ color:'rgba(255,255,255,.82)', fontSize:12.5, display:'flex', alignItems:'center', gap:5 }}><span style={{ width:7, height:7, borderRadius:9999, background:'#6ee7b7' }} /> Growth assistant</div></div>
        </div>
        <div ref={scrollRef} style={{ flex:1, minHeight:0, overflowY:'auto', padding:'18px 20px', display:'flex', flexDirection:'column', gap:10, background:'var(--m-bg)' }}>
          {msgs.map((m,i)=>(
            <div key={i} style={{ maxWidth:'80%', padding:'11px 15px', fontSize:14.5, lineHeight:1.5, whiteSpace:m.role==='user'?'pre-wrap':'normal',
              alignSelf:m.role==='user'?'flex-end':'flex-start', background:m.role==='user'?'var(--m-primary-deep)':'var(--m-surface)',
              color:m.role==='user'?'#fff':'var(--m-fg1)', borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', boxShadow:'var(--m-shadow-card)' }}>{m.role==='assistant' ? <Markdown text={m.content} /> : m.content}</div>
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

/* ---------- YOTEMARKET INSIGHT — an on-demand, GENERATED business-intelligence
   report (not a chat; YoteAI is the conversational assistant). Reads real stats +
   the market and renders a structured briefing with tables/charts. ---------- */
const INSIGHT_FOCUS = [
  { key:'overview',  label:'Full report',    icon:'fa-chart-pie',      prompt:'Give me a full business-intelligence report on my store.' },
  { key:'sales',     label:'Sales & growth', icon:'fa-arrow-trend-up', prompt:'Focus on my sales performance and the biggest growth opportunities.' },
  { key:'pricing',   label:'Pricing',        icon:'fa-tags',           prompt:'Focus on pricing: benchmark my products against comparable market prices and flag anything mispriced.' },
  { key:'inventory', label:'Inventory',      icon:'fa-boxes-stacked',  prompt:'Focus on inventory: what to restock, what is underperforming, and what to promote.' },
];
const REPORT_PROMPT = (focus) => `${focus}

Produce a concise business-intelligence report grounded in my REAL store data — call getMyStats and getMyProducts first, and searchProducts to compare the market. Format it in Markdown with these sections:

## Headline
One or two sentences on where the store stands, key numbers in **bold**.

## What's working
2-3 bullets.

## Needs attention
2-3 bullets.

## Price benchmark
A Markdown table comparing a few of my products to comparable market prices.

## Momentum
A \`\`\`chart block with one "Label: number" line per top product (by the most relevant metric).

## Do this next
3 prioritised, specific actions.

Be specific to my numbers; never invent data.`;

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
  const [focus, setFocus] = useStateX('overview');
  const [report, setReport] = useStateX('');     // generated markdown ('' = not generated yet)
  const [products, setProducts] = useStateX([]);
  const [busy, setBusy] = useStateX(false);
  const [err, setErr] = useStateX('');
  const [genAt, setGenAt] = useStateX(null);

  const generate = async (fk) => {
    const item = INSIGHT_FOCUS.find(x=>x.key===fk) || INSIGHT_FOCUS[0];
    setFocus(item.key); setBusy(true); setErr('');
    try {
      if (!ready) { setErr('Sign in to your merchant account to generate insights from your real store data.'); setReport(''); return; }
      const { reply, products:prods } = await aiAssistant({ role:'merchant', variant:'insight', messages:[{ role:'user', content: REPORT_PROMPT(item.prompt) }] });
      const r = (reply||'').trim();
      setReport(r); setProducts(Array.isArray(prods) ? prods : []); if (r) setGenAt(Date.now());
      if (!r) setErr('Could not generate the report just now — please try again.');
    } catch (e) {
      setErr(e?.message || 'Sorry, I couldn’t reach the AI service. Please try again in a moment.'); setReport('');
    } finally { setBusy(false); }
  };

  return (
    <div className="anim-up">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
        <div>
          <h1 className="ym-h1" style={{ marginBottom:6 }}>YoteMarket Insight</h1>
          <p className="ym-sub">A generated business-intelligence report on your {live ? 'real store stats, products' : 'store data'} and live market prices. Want a conversation instead? Use <b>YoteAI</b>.</p>
        </div>
        {report && <Btn kind="ghost" size="sm" icon={busy?'fa-circle-notch':'fa-rotate'} onClick={()=>generate(focus)} disabled={busy}>{busy?'Working…':'Refresh'}</Btn>}
      </div>

      {/* focus chips — regenerate the report for a given lens */}
      <div className="scroll-x" style={{ gap:8, margin:'16px 0 18px' }}>
        {INSIGHT_FOCUS.map(f => {
          const on = focus===f.key && (report || busy);
          return (
            <button key={f.key} onClick={()=>generate(f.key)} disabled={busy}
              style={{ flexShrink:0, display:'inline-flex', alignItems:'center', gap:7, height:38, padding:'0 15px', borderRadius:9999,
                border:'1px solid '+(on?'var(--m-primary)':'var(--m-border)'), background:on?'var(--m-primary)':'var(--m-surface)',
                color:on?'#fff':'var(--m-fg2)', fontFamily:'inherit', fontSize:13.5, fontWeight:600, whiteSpace:'nowrap', cursor:busy?'default':'pointer' }}>
              <FA i={f.icon} style={{ fontSize:12 }} /> {f.label}
            </button>
          );
        })}
      </div>

      {err && <div className="ym-card" style={{ padding:16, color:'var(--m-danger,#dc2626)', display:'flex', gap:9, alignItems:'center' }}><FA i="fa-triangle-exclamation" /> {err}</div>}

      {busy ? (
        <Card style={{ padding:'40px 24px', textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:15, background:'var(--m-grad-deep)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', boxShadow:'var(--m-glow)' }}><FA i="fa-wand-magic-sparkles" className="fa-fade" style={{ color:'#fff', fontSize:22 }} /></div>
          <div className="ym-h3">YoteAI is analyzing your store<span className="ai-dots"><i>.</i><i>.</i><i>.</i></span></div>
          <div className="ym-sub" style={{ marginTop:4 }}>Reading your stats, products and comparable market prices — this can take a few seconds.</div>
          <div className="ai-bar" style={{ margin:'18px auto 0', maxWidth:220 }}><span/></div>
          <style>{`
            .ai-dots i{ animation:aiDot 1.2s infinite; opacity:.3; } .ai-dots i:nth-child(2){ animation-delay:.2s; } .ai-dots i:nth-child(3){ animation-delay:.4s; }
            @keyframes aiDot{ 0%,80%,100%{opacity:.3;} 40%{opacity:1;} }
            .ai-bar{ position:relative; height:4px; border-radius:999px; overflow:hidden; background:color-mix(in srgb,var(--m-primary) 16%, transparent); }
            .ai-bar>span{ position:absolute; top:0; bottom:0; width:40%; border-radius:999px; background:var(--m-primary); animation:aiBar 1.3s cubic-bezier(.65,.05,.36,1) infinite; }
            @keyframes aiBar{ 0%{transform:translateX(-130%);} 100%{transform:translateX(320%);} }
          `}</style>
        </Card>
      ) : report ? (
        <>
          <Card style={{ padding:'22px 24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, paddingBottom:14, borderBottom:'1px solid var(--m-border)' }}>
              <YoteAiMark size={16} color="var(--m-primary)" />
              <span style={{ fontSize:12.5, fontWeight:700, color:'var(--m-primary)' }}>Generated by YoteAI</span>
              {genAt && <span className="ym-cap" style={{ marginLeft:'auto' }}>{new Date(genAt).toLocaleTimeString('en-KE',{ hour:'numeric', minute:'2-digit' })}</span>}
            </div>
            <Markdown text={report} />
          </Card>
          {products.length>0 && (
            <div style={{ marginTop:16 }}>
              <div className="ym-cap" style={{ fontWeight:600, marginBottom:8 }}>Comparable products in the market</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{products.slice(0,6).map(r=><InsightResultCard key={r.id} r={r} />)}</div>
            </div>
          )}
        </>
      ) : (
        <Card style={{ padding:'46px 24px', textAlign:'center' }}>
          <div style={{ width:60, height:60, borderRadius:16, background:'var(--m-grad-deep)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:'var(--m-glow)' }}><FA i="fa-lightbulb" style={{ color:'#fff', fontSize:24 }} /></div>
          <div className="ym-h2" style={{ fontSize:20 }}>Generate your store report</div>
          <p className="ym-sub" style={{ maxWidth:430, margin:'8px auto 18px' }}>A data-grounded briefing — what’s working, what needs attention, price benchmarks, momentum and your next three moves.</p>
          <Btn kind="primary" size="md" icon="fa-wand-magic-sparkles" onClick={()=>generate('overview')}>Generate insights</Btn>
        </Card>
      )}
    </div>
  );
}
