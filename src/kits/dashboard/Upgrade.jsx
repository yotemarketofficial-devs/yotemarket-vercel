/* Upgrade.jsx — the locked-feature screen. Rendered by the dashboard router in
   place of a premium screen the merchant's plan doesn't unlock. Explains the
   feature, the tier it needs, and routes to the Subscription screen. */
import React from 'react';
import { FA } from './primitives.jsx';
import { FEATURES, requiredTierName, planUnlocks, TIER_RANK } from '../../lib/entitlements.js';

export function UpgradeScreen({ feature, currentTier = 'Free', onNav }) {
  const f = FEATURES[feature] || { label: 'This feature', blurb: '', icon: 'fa-lock' };
  const need = requiredTierName(feature);
  const needRank = TIER_RANK[need] || 1;
  const unlocks = planUnlocks(needRank);
  return (
    <div className="fadeup" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="ym-card" style={{ padding: 28, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, margin: '4px auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--m-grad-deep)', boxShadow: 'var(--m-glow)', color: '#fff', fontSize: 28, position: 'relative' }}>
          <FA i={f.icon} />
          <span style={{ position: 'absolute', bottom: -6, right: -6, width: 30, height: 30, borderRadius: '50%', background: 'var(--m-amber, #f59e0b)', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, border: '3px solid var(--m-bg)' }}><FA i="fa-lock" /></span>
        </div>
        <div className="ym-cap" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, color: 'var(--m-primary)' }}>{need} feature</div>
        <h2 className="ym-h2" style={{ margin: '6px 0 8px' }}>{f.label}</h2>
        <p style={{ color: 'var(--m-fg2)', fontSize: 15, lineHeight: 1.55, maxWidth: 460, margin: '0 auto 6px' }}>{f.blurb}</p>
        <p className="ym-cap" style={{ marginBottom: 18 }}>{currentTier === 'No plan' ? <>You don't have an active plan yet.</> : <>You're on the <b>{currentTier}</b> plan.</>} {need === 'Entry' ? 'Start on' : 'Upgrade to'} <b>{need}</b> or higher to unlock it.</p>
        <button className="ym-btn ym-btn-primary" style={{ minWidth: 200 }} onClick={() => onNav && onNav('subscription')}><FA i="fa-arrow-up-right-dots" /> See plans &amp; upgrade</button>

        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--m-border)', textAlign: 'left' }}>
          <div className="ym-cap" style={{ fontWeight: 700, marginBottom: 10 }}>Everything you unlock on {need}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px, 100%), 1fr))', gap: 8 }}>
            {unlocks.map((label) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'var(--m-fg2)' }}>
                <FA i="fa-circle-check" style={{ color: 'var(--m-green, #10b981)' }} /> {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
