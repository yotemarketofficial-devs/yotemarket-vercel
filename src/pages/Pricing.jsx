import { useState, Fragment } from 'react';
import { Link } from 'react-router-dom';

const ksh = (n) => 'Ksh ' + n.toLocaleString();

// Software-only tiers (flat monthly, no delivery). Shown first.
const SOFTWARE = [
  { name: 'Entry', price: 500, feat: false, items: ['Branded storefront', 'In-app messenger & negotiation', 'M-Pesa escrow checkout', 'Basic platform access'] },
  { name: 'Growth', price: 700, feat: true, items: ['Everything in Entry', 'YoteAI merchant tools', 'Demand insights & order tracking', 'Enhanced software suite'] },
  { name: 'Pro', price: 1000, feat: false, items: ['Everything in Growth', 'Full analytics suite', 'Featured placement', 'Priority support'] },
];

// Full delivery pricing — every distance range × plan (server is authoritative).
const DELIVERY_BANDS = [
  {
    label: 'Urban', span: '0–30 km', tiers: [
      { range: '0–5 km', s: 1500, g: 3000, p: 4200 },
      { range: '5–15 km', s: 2000, g: 3500, p: 5000 },
      { range: '15–30 km', s: 3500, g: 6000, p: 9000 },
    ],
  },
  {
    label: 'Regional', span: '30–60 km', tiers: [
      { range: '30–40 km', s: 6500, g: 11000, p: 16000 },
      { range: '40–50 km', s: 9000, g: 16000, p: 23500 },
      { range: '50–60 km', s: 12000, g: 22000, p: 32000 },
    ],
  },
  {
    label: 'Long-haul', span: '60–90 km', tiers: [
      { range: '60–70 km', s: 20000, g: 36000, p: 52000 },
      { range: '70–80 km', s: 24000, g: 47000, p: 70000 },
      { range: '80–90 km', s: 28000, g: 55000, p: 82000 },
    ],
  },
];

function Pricing() {
  const [mode, setMode] = useState('software'); // software (default) | delivery

  return (
    <main>
      <section className="pad">
        <div className="wrap">
          <div className="page-head">
            <span className="eyebrow"><i className="fas fa-id-card"></i> Merchant pricing</span>
            <h1>Simple monthly plans. No commission.</h1>
            <p>
              Start with software only, or add bundled hub deliveries. Either way you keep 100% of every sale —
              we never take a cut.
            </p>
          </div>

          <div className="seg-wrap">
            <div className="seg" role="tablist" aria-label="Plan type">
              <button className={mode === 'software' ? 'on' : ''} aria-selected={mode === 'software'} onClick={() => setMode('software')}>Software only</button>
              <button className={mode === 'delivery' ? 'on' : ''} aria-selected={mode === 'delivery'} onClick={() => setMode('delivery')}>With delivery</button>
            </div>
          </div>

          {mode === 'software' ? (
            <>
              <div className="price-grid">
                {SOFTWARE.map((p) => (
                  <div key={p.name} className={`price-card ${p.feat ? 'feat' : ''}`}>
                    {p.feat && <span className="badge">Popular</span>}
                    <div className="pn">{p.name}</div>
                    <div className="pp">{ksh(p.price)}<small>/mo</small></div>
                    <div className="pd">Platform & tools — no delivery runs</div>
                    <ul>
                      {p.items.map((it) => <li key={it}><i className="fas fa-check"></i><span>{it}</span></li>)}
                    </ul>
                    <Link className={`btn ${p.feat ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'center' }} to="/dashboard">Choose {p.name}</Link>
                  </div>
                ))}
              </div>
              <p className="price-note">
                Software-only plans are a flat monthly fee with no physical deliveries. Need bundled deliveries?
                Switch to{' '}
                <button onClick={() => setMode('delivery')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--purple)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>With delivery</button>.
              </p>
            </>
          ) : (
            <>
              <div className="plan-legend">
                <span><b>Starter</b> · 10 deliveries/mo</span>
                <span><b>Growth</b> · 20 deliveries/mo</span>
                <span><b>Pro</b> · 30 deliveries/mo</span>
              </div>
              <div className="ptable-wrap">
                <table className="ptable">
                  <thead>
                    <tr>
                      <th>Delivery range</th>
                      <th>Starter<span>10 deliveries</span></th>
                      <th>Growth<span>20 deliveries</span></th>
                      <th>Pro<span>30 deliveries</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {DELIVERY_BANDS.map((band) => (
                      <Fragment key={band.label}>
                        <tr className="bandrow">
                          <td colSpan={4}>{band.label} · {band.span}</td>
                        </tr>
                        {band.tiers.map((t) => (
                          <tr key={t.range}>
                            <td>{t.range}</td>
                            <td className="amt">{ksh(t.s)}<small style={{ color: 'var(--t3)', fontWeight: 500 }}>/mo</small></td>
                            <td className="amt">{ksh(t.g)}<small style={{ color: 'var(--t3)', fontWeight: 500 }}>/mo</small></td>
                            <td className="amt">{ksh(t.p)}<small style={{ color: 'var(--t3)', fontWeight: 500 }}>/mo</small></td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="price-note">
                Your price is set by the distance your deliveries travel — pick your range when you subscribe in
                the dashboard. All plans include bundled hub deliveries and no sales commission.
              </p>
            </>
          )}

          <div className="sec-cta" style={{ marginTop: '30px' }}>
            <Link className="btn btn-primary btn-lg" to="/dashboard">Start selling <i className="fas fa-arrow-right"></i></Link>
            <span className="sec-cta-note">
              Also earn with us — <Link to="/marketers" style={{ color: 'var(--purple)', fontWeight: 600 }}>refer merchants</Link> or <Link to="/rider" style={{ color: 'var(--purple)', fontWeight: 600 }}>ride</Link>.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Pricing;
