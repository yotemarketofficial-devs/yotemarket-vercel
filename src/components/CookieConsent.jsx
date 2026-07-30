/* CookieConsent — first-visit cookie notice (Kenya DPA 2019). Essential cookies keep the
   user signed in + their cart; "Accept all" additionally enables analytics/retargeting.
   The choice is stored as a first-party cookie, so it only shows until the user decides. */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { hasChosenConsent, setConsent } from '../lib/consent.js';

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(!hasChosenConsent()); }, []);
  if (!show) return null;

  const choose = (level) => { setConsent(level); setShow(false); };

  const btnBase = {
    fontFamily: 'inherit', fontSize: 13, fontWeight: 700, padding: '9px 16px',
    borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap',
  };

  return (
    <div role="dialog" aria-label="Cookie preferences" style={{
      position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 100000,
      maxWidth: 860, margin: '0 auto', background: '#16162a', color: '#fff',
      borderRadius: 16, padding: '16px 18px', boxShadow: '0 12px 40px rgba(0,0,0,.35)',
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14,
      justifyContent: 'space-between', border: '1px solid rgba(255,255,255,.08)',
    }}>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, flex: '1 1 320px', color: 'rgba(255,255,255,.9)' }}>
        🍪 We use cookies to keep you signed in, remember your cart, and understand how
        YoteMarket is used. See our{' '}
        <Link to="/privacy" style={{ color: '#c4b5fd', textDecoration: 'underline' }}>Privacy Policy</Link>.
      </p>
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <button onClick={() => choose('essential')} style={{
          ...btnBase, background: 'transparent', color: '#fff',
          border: '1px solid rgba(255,255,255,.28)',
        }}>Essentials only</button>
        <button onClick={() => choose('all')} style={{
          ...btnBase, background: '#7c3aed', color: '#fff', border: 'none',
        }}>Accept all</button>
      </div>
    </div>
  );
}
