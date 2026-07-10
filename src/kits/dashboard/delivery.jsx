/* delivery.jsx — Merchant dashboard: store delivery rules. Sets whether the store
   offers delivery, the fee, a free-delivery threshold, and whether paid delivery
   orders auto-dispatch to a rider or wait for a per-order "offer delivery" decision.
   Rules live on stores/{id}.delivery (setStoreDelivery) and drive checkout. */
import React from 'react';
import { FA, Card, Btn, SectionCard } from './primitives.jsx';
import { useMerchant } from './merchant.jsx';
import { ksh } from './data.js';
import { setStoreDelivery } from '../../lib/firebase.js';
import { ScreenCoach } from './ScreenCoach.jsx';
const { useState, useEffect } = React;

const DELIVERY_COACH = [
  { selector: '[data-coach="delivery-rules"]', title: 'Set your delivery rules', body: 'Choose whether you offer delivery, a free-delivery threshold, and an optional note. Shoppers see all of this at checkout.' },
  { selector: '[data-coach="delivery-save"]', title: 'Save to go live', body: 'Save and your rules apply at checkout right away. Above, you can also decide whether paid orders auto-dispatch to a rider or wait for your OK.' },
];

function Toggle({ on, onChange, disabled }){
  return (
    <button role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)}
      style={{ width:46, height:27, borderRadius:9999, border:'none', cursor: disabled ? 'default' : 'pointer', padding:3, background: on ? 'var(--m-primary)' : 'var(--m-border)', transition:'background .15s', flexShrink:0, opacity: disabled ? .5 : 1 }}>
      <span style={{ display:'block', width:21, height:21, borderRadius:9999, background:'#fff', transform: on ? 'translateX(19px)' : 'translateX(0)', transition:'transform .15s' }} />
    </button>
  );
}

function Row({ title, sub, children }){
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 0', borderTop:'1px solid var(--m-border)' }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div className="ym-h3" style={{ fontSize:14 }}>{title}</div>
        {sub && <div className="ym-cap" style={{ marginTop:2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export function DeliverySettings({ toast }){
  const { store } = useMerchant();
  const d = store?.delivery || {};
  const [offers, setOffers] = useState(true);
  const [freeOver, setFreeOver] = useState('0');
  const [autoDispatch, setAutoDispatch] = useState(true);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Hydrate from the store's saved rules once they load.
  useEffect(() => {
    setOffers(d.offers !== false);
    setFreeOver(String(d.freeOver != null ? d.freeOver : 0));
    setAutoDispatch(d.autoDispatch !== false);
    setNote(d.note || '');
  }, [store?.id, d.offers, d.freeOver, d.autoDispatch, d.note]); // eslint-disable-line

  const save = async () => {
    setBusy(true);
    try {
      await setStoreDelivery({ offers, freeOver: Number(freeOver) || 0, autoDispatch, note: note.trim() });
      toast && toast('Delivery rules saved');
    } catch (e) { toast && toast(e.message || 'Could not save delivery rules'); } finally { setBusy(false); }
  };

  const freeN = Number(freeOver) || 0;
  return (
    <div className="fadeup" style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:640 }}>
      <ScreenCoach id="delivery" steps={DELIVERY_COACH} />
      <div>
        <h1 className="ym-h1" style={{ marginBottom:6 }}>Delivery rules</h1>
        <p className="ym-sub">How shoppers get their orders — this drives your checkout and how new orders are handled.</p>
      </div>

      <SectionCard title="Delivery" sub="Shown to shoppers at checkout for your store." data-coach="delivery-rules">
        <div style={{ padding:'0 16px 8px' }}>
          <Row title="Offer delivery" sub={offers ? 'Shoppers can choose delivery at checkout.' : 'Store pickup only — delivery is hidden at checkout.'}>
            <Toggle on={offers} onChange={setOffers} />
          </Row>
          {offers && <>
            <Row title="Free delivery over" sub={freeN > 0 ? `Orders of ${ksh(freeN)}+ ship free.` : 'No free-delivery threshold (0 = off).'}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span className="ym-cap">KSh</span>
                <input className="ym-input" value={freeOver} onChange={(e) => setFreeOver(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" style={{ width:110, height:42 }} />
              </div>
            </Row>
            <Row title="Delivery note (optional)" sub="e.g. “Same-day within Nairobi”.">
              <input className="ym-input" value={note} onChange={(e) => setNote(e.target.value.slice(0, 120))} placeholder="Add a note" style={{ width:220, height:42 }} />
            </Row>
          </>}
        </div>
      </SectionCard>

      <SectionCard title="New delivery orders" sub="What happens when a delivery order is paid.">
        <div style={{ padding:'0 16px 8px' }}>
          <Row title="Auto-dispatch to a rider" sub={autoDispatch ? 'Paid delivery orders are sent to a rider automatically.' : 'You review each paid order and tap “Offer delivery” before it goes out.'}>
            <Toggle on={autoDispatch} onChange={setAutoDispatch} />
          </Row>
          {!autoDispatch && (
            <div style={{ display:'flex', gap:10, alignItems:'flex-start', background:'var(--m-surface-2)', borderRadius:12, padding:'12px 14px', marginTop:6, fontSize:13, color:'var(--m-fg2)' }}>
              <FA i="fa-circle-info" style={{ color:'var(--m-primary)', marginTop:2 }} />
              <span>New paid delivery orders will wait in <b>Orders</b> for you to <b>Offer delivery</b> (request a rider) or ask the buyer to collect. Store-pickup orders are unaffected.</span>
            </div>
          )}
        </div>
      </SectionCard>

      <Btn kind="primary" icon={busy ? 'fa-circle-notch' : 'fa-check'} disabled={busy} onClick={save} style={{ alignSelf:'flex-start' }} data-coach="delivery-save">{busy ? 'Saving…' : 'Save delivery rules'}</Btn>

      <div style={{ display:'flex', gap:10, alignItems:'center', color:'var(--m-fg3)', fontSize:12.5 }}>
        <FA i="fa-store" /> Preview: {offers ? <>Delivery on{freeN > 0 ? ` · free over ${ksh(freeN)}` : ''}</> : 'Pickup only'} · {autoDispatch ? 'auto-dispatch' : 'manual decision'}
      </div>
    </div>
  );
}
