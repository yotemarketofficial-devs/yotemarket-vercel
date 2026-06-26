/* SubscribeFlow.jsx — reusable merchant subscribe UI (delivery/software toggle +
   delivery-range selector + plan cards + M-Pesa dialog). Used by the dashboard
   paywall (MerchantGate) and the in-app Subscription screen. Server prices it; on
   success the parent's subscriptions/{uid} listener reflects activation. */
import React from 'react';
import { FA, Card, Btn } from './primitives.jsx';
import { ksh } from './data.js';
import { subscribeMerchant, confirmPayment } from '../../lib/firebase.js';
import { DELIVERY_TIERS, SOFTWARE_TIERS, PLAN_ORDER, DELIVERY_FEATURES, findDeliveryTier } from './pricing.js';
const { useState, useEffect } = React;

const ipt = { width: '100%', padding: '12px 14px', borderRadius: 11, border: '1px solid var(--m-border)', background: 'var(--m-surface)', color: 'var(--m-fg1)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
const errBox = { display: 'flex', gap: 9, alignItems: 'center', background: 'var(--m-inactive-bg)', color: 'var(--m-inactive-fg)', borderRadius: 11, padding: '11px 14px', fontSize: 13, fontWeight: 500, margin: '14px 0 0' };

export default function SubscribeFlow({ onStarted, currentPlan }) {
  const [mode, setMode] = useState('delivery');
  const [tierId, setTierId] = useState('a05');
  const [picking, setPicking] = useState(null); // { kind, plan, price, deliveries?, subTier?, range? }
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState('idle'); // idle | sending | waiting
  const [err, setErr] = useState('');
  const [cid, setCid] = useState(null);
  const [checking, setChecking] = useState(false);

  const tier = findDeliveryTier(tierId);
  const pick = (obj) => { setPicking(obj); setPhone(''); setErr(''); setStage('idle'); setCid(null); };

  const pay = async () => {
    setErr('');
    if (!phone.trim()) { setErr('Enter the M-Pesa phone to bill.'); return; }
    setStage('sending');
    try {
      const payload = picking.kind === 'software'
        ? { kind: 'software', plan: picking.plan, phone: phone.trim() }
        : { kind: 'delivery', subTier: picking.subTier, plan: picking.plan, phone: phone.trim() };
      const res = await subscribeMerchant(payload);
      setCid(res && res.checkoutRequestId);
      setStage('waiting');
      onStarted && onStarted();
    } catch (e) { setErr(e.message || 'Could not start the subscription.'); setStage('idle'); }
  };

  // Actively confirm via Daraja (independent of the M-Pesa callback). On success
  // settlePaid activates subscriptions/{uid}, which the parent listener reflects.
  const confirmNow = async () => {
    if (!cid) return;
    setChecking(true); setErr('');
    try {
      const r = await confirmPayment({ checkoutRequestId: cid });
      if (!(r && (r.paid || r.settledCount))) setErr("Not confirmed yet — if you've paid, wait a few seconds and tap again.");
    } catch (e) { setErr(e.message || 'Could not confirm the payment.'); }
    finally { setChecking(false); }
  };

  // Auto-confirm ~20s after the STK is sent (after the PIN window).
  useEffect(() => {
    if (stage !== 'waiting' || !cid) return undefined;
    const t = setTimeout(() => { confirmNow(); }, 20000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, cid]);

  // Funnel from the /pricing page: ?kind=&plan=&subTier= pre-selects the plan
  // and opens the M-Pesa dialog so the merchant lands ready to pay.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const plan = sp.get('plan');
    if (!plan) return;
    if (sp.get('kind') === 'software') {
      const t = SOFTWARE_TIERS.find((x) => x.name === plan);
      if (t) { setMode('software'); pick({ kind: 'software', plan: t.name, price: t.price }); }
    } else {
      const t = findDeliveryTier(sp.get('subTier') || 'a05');
      const pl = t.plans[plan];
      if (pl) { setMode('delivery'); setTierId(t.id); pick({ kind: 'delivery', plan, price: pl.price, deliveries: pl.deliveries, subTier: t.id, range: t.range }); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ display: 'inline-flex', gap: 4, background: 'var(--m-surface-2)', borderRadius: 10, padding: 4, marginBottom: 18 }}>
        {[['delivery', 'Delivery plans'], ['software', 'Software only']].map(([k, label]) => (
          <button key={k} onClick={() => setMode(k)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, background: mode === k ? 'var(--m-surface)' : 'transparent', color: mode === k ? 'var(--m-fg1)' : 'var(--m-fg3)', boxShadow: mode === k ? 'var(--m-shadow-card)' : 'none' }}>{label}</button>
        ))}
      </div>

      {mode === 'delivery' && (
        <div style={{ marginBottom: 16 }}>
          <label className="ym-label" style={{ display: 'block', marginBottom: 6 }}>Your delivery range</label>
          <select style={ipt} value={tierId} onChange={(e) => setTierId(e.target.value)}>
            {DELIVERY_TIERS.map((t) => <option key={t.id} value={t.id}>{t.range} · Band {t.band}</option>)}
          </select>
          <div className="ym-cap" style={{ marginTop: 6 }}>Your plan price scales with how far your deliveries travel.</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
        {mode === 'delivery'
          ? PLAN_ORDER.map((planName) => {
            const pl = tier.plans[planName];
            const featured = planName === 'Growth';
            const isCurrent = currentPlan && currentPlan.kind === 'delivery' && currentPlan.plan === planName && currentPlan.subTier === tier.id;
            return (
              <Card key={planName} style={{ padding: 22, position: 'relative', border: featured ? '2px solid var(--m-primary)' : undefined }}>
                {featured && <span className="ym-pill ym-pill-active" style={{ position: 'absolute', top: 14, right: 14 }}>Popular</span>}
                <div className="ym-h2" style={{ fontSize: 17 }}>{planName}</div>
                <div style={{ margin: '8px 0 4px' }}><span style={{ fontSize: 26, fontWeight: 800, color: 'var(--m-fg1)' }}>{ksh(pl.price)}</span><span className="ym-cap">/mo</span></div>
                <div className="ym-cap" style={{ marginBottom: 14 }}>{pl.deliveries} bundled deliveries · {tier.range}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {DELIVERY_FEATURES[planName].map((f) => <div key={f} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--m-fg2)' }}><FA i="fa-check" style={{ color: 'var(--m-success)', marginTop: 3 }} /><span>{f}</span></div>)}
                </div>
                <Btn kind={isCurrent ? 'ghost' : 'primary'} disabled={isCurrent} style={{ width: '100%' }} onClick={() => pick({ kind: 'delivery', plan: planName, price: pl.price, deliveries: pl.deliveries, subTier: tier.id, range: tier.range })}>{isCurrent ? 'Current plan' : `Subscribe · ${ksh(pl.price)}/mo`}</Btn>
              </Card>
            );
          })
          : SOFTWARE_TIERS.map((t) => {
            const isCurrent = currentPlan && currentPlan.kind === 'software' && currentPlan.plan === t.name;
            return (
              <Card key={t.name} style={{ padding: 22 }}>
                <div className="ym-h2" style={{ fontSize: 17 }}>{t.name}</div>
                <div style={{ margin: '8px 0 4px' }}><span style={{ fontSize: 26, fontWeight: 800, color: 'var(--m-fg1)' }}>{ksh(t.price)}</span><span className="ym-cap">/mo</span></div>
                <div className="ym-cap" style={{ marginBottom: 16 }}>{t.desc}</div>
                <Btn kind={isCurrent ? 'ghost' : 'primary'} disabled={isCurrent} style={{ width: '100%' }} onClick={() => pick({ kind: 'software', plan: t.name, price: t.price })}>{isCurrent ? 'Current plan' : `Subscribe · ${ksh(t.price)}/mo`}</Btn>
              </Card>
            );
          })}
      </div>

      {picking && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 130, background: 'rgba(17,24,39,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={(e) => { if (e.target === e.currentTarget && stage !== 'waiting') setPicking(null); }}>
          <Card style={{ width: '100%', maxWidth: 420, padding: 26, boxShadow: 'var(--m-shadow-float)' }}>
            {stage === 'waiting' ? (
              <div style={{ textAlign: 'center', padding: '10px 4px' }}>
                <div style={{ width: 70, height: 70, borderRadius: 9999, margin: '0 auto 16px', background: 'var(--m-mpesa)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}><FA i="fa-mobile-screen" /></div>
                <div className="ym-h2">Check your phone</div>
                <p className="ym-sub" style={{ marginTop: 8 }}>Enter your M-Pesa PIN to pay <b style={{ color: 'var(--m-fg1)' }}>{ksh(picking.price)}</b> for the <b style={{ color: 'var(--m-fg1)' }}>{picking.plan}</b> plan{picking.range ? ` (${picking.range})` : ''}. It activates automatically once confirmed.</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginTop: 16, color: 'var(--m-fg3)' }}><FA i="fa-circle-notch" style={{ animation: 'ym-spin 1s linear infinite', color: 'var(--m-primary)' }} /> Waiting for confirmation…</div>
                {err && <div className="ym-cap" style={{ marginTop: 12, color: 'var(--m-inactive-fg)' }}>{err}</div>}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                  <Btn kind="primary" size="sm" disabled={checking} onClick={confirmNow}>{checking ? <><FA i="fa-circle-notch" style={{ animation: 'ym-spin 1s linear infinite' }} /> Checking…</> : <><FA i="fa-rotate" /> I've paid — confirm now</>}</Btn>
                  <Btn kind="ghost" size="sm" onClick={() => { setPicking(null); setStage('idle'); }}>Close</Btn>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <h2 className="ym-h2">Subscribe to {picking.plan}</h2>
                  <button onClick={() => setPicking(null)} className="icon-btn" aria-label="Close"><FA i="fa-xmark" /></button>
                </div>
                <p className="ym-sub" style={{ marginBottom: 16 }}>{ksh(picking.price)}/mo{picking.deliveries ? ` · ${picking.deliveries} bundled deliveries` : ' · software only'}{picking.range ? ` · ${picking.range}` : ''}. Billed monthly via M-Pesa.</p>
                <label className="ym-label" style={{ display: 'block', marginBottom: 6 }}>M-Pesa phone number</label>
                <input style={ipt} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" inputMode="tel" />
                {err && <div role="alert" style={errBox}><FA i="fa-circle-exclamation" /> {err}</div>}
                <Btn kind="mpesa" style={{ width: '100%', marginTop: 14 }} disabled={stage === 'sending'} onClick={pay}>{stage === 'sending' ? <><FA i="fa-circle-notch" style={{ animation: 'ym-spin 1s linear infinite' }} /> Sending…</> : <><FA i="fa-bolt" /> Pay {ksh(picking.price)} with M-Pesa</>}</Btn>
                <div className="ym-cap" style={{ textAlign: 'center', marginTop: 10 }}>Secure · server-verified · cancel anytime</div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
