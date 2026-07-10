/* possetup.jsx — Merchant dashboard: POS setup. The register itself runs as its own
   full-screen subsystem at /pos; here the merchant opens it and (owner only) manages
   which devices are authorized to ring up sales (anti-fraud device lock). */
import React from 'react';
import { FA, Btn, SectionCard } from './primitives.jsx';
import { useMerchant } from './merchant.jsx';
import { listPosDevices, removePosDevice } from '../../lib/firebase.js';
import { ScreenCoach } from './ScreenCoach.jsx';
const { useState, useEffect } = React;

const POS_COACH = [
  { selector: '[data-coach="pos-open"]', title: 'Sell in person', body: 'Open the register in a new tab to ring up in-store sales and print receipts. The first device you authorize becomes a locked till, sharing the same products and stock as your online store.' },
];

export function PosSetup({ toast }){
  const { role } = useMerchant();
  const isOwner = !role || role === 'owner'; // demo mode has no role → treat as owner
  const [devices, setDevices] = useState(null);
  const load = () => { if (!isOwner) { setDevices([]); return; } listPosDevices().then((r) => setDevices(r.devices || [])).catch(() => setDevices([])); };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [isOwner]);
  const revoke = async (deviceId, label) => {
    if (!window.confirm(`Revoke “${label}”? That device won’t be able to ring up sales.`)) return;
    try { await removePosDevice({ deviceId }); load(); toast && toast('Terminal revoked'); } catch (e) { toast && toast(e.message || 'Could not revoke'); }
  };
  return (
    <div className="fadeup" style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:680 }}>
      <ScreenCoach id="pos" steps={POS_COACH} />
      <div>
        <h1 className="ym-h1" style={{ marginBottom:6 }}>Point of sale</h1>
        <p className="ym-sub">The register runs full-screen as its own app. Open it here, and (as the owner) control which devices are allowed to sell.</p>
      </div>

      <SectionCard title="Open the register" sub="Runs full-screen — cashiers can bookmark it on the till.">
        <div style={{ padding:16, display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <Btn kind="primary" icon="fa-store" onClick={() => window.open('/pos', '_blank')} data-coach="pos-open">Open POS terminal</Btn>
          <span className="ym-cap">Opens <b>/pos</b> in a new tab.</span>
        </div>
      </SectionCard>

      {isOwner && (
        <SectionCard title={`Authorized terminals${devices && devices.length ? ` · ${devices.length}` : ''}`} sub="For fraud protection only these devices can ring up sales. To add one, open /pos on that device and authorize it there (add one per branch).">
          {devices === null ? <div style={{ padding:16, color:'var(--m-fg3)' }}>Loading…</div>
            : devices.length === 0 ? <div style={{ padding:16, color:'var(--m-fg3)' }}>No terminals yet — open POS on a device to authorize it.</div>
            : <div style={{ padding:8 }}>
                {devices.map((d) => (
                  <div key={d.deviceId} style={{ display:'flex', alignItems:'center', gap:12, padding:12 }}>
                    <div style={{ width:40, height:40, borderRadius:11, background:'var(--m-surface-3)', color:'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><FA i="fa-desktop" /></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="ym-h3" style={{ fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.label}</div>
                      <div className="ym-cap" style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{String(d.deviceId).slice(0, 16)}…{d.at ? ` · added ${d.at}` : ''}</div>
                    </div>
                    <button onClick={() => revoke(d.deviceId, d.label)} title="Revoke terminal" style={{ width:38, height:38, borderRadius:10, border:'1px solid var(--m-border)', background:'var(--m-surface)', color:'var(--m-fg2)', cursor:'pointer', flexShrink:0 }}><FA i="fa-trash" /></button>
                  </div>
                ))}
              </div>}
        </SectionCard>
      )}
    </div>
  );
}
