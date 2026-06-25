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
      { id: 'a05', range: '0–5 km', s: 1500, g: 3000, p: 4200 },
      { id: 'a515', range: '5–15 km', s: 2000, g: 3500, p: 5000 },
      { id: 'a1530', range: '15–30 km', s: 3500, g: 6000, p: 9000 },
    ],
  },
  {
    label: 'Regional', span: '30–60 km', tiers: [
      { id: 'b3040', range: '30–40 km', s: 6500, g: 11000, p: 16000 },
      { id: 'b4050', range: '40–50 km', s: 9000, g: 16000, p: 23500 },
      { id: 'b5060', range: '50–60 km', s: 12000, g: 22000, p: 32000 },
    ],
  },
  {
    label: 'Long-haul', span: '60–90 km', tiers: [
      { id: 'c6070', range: '60–70 km', s: 20000, g: 36000, p: 52000 },
      { id: 'c7080', range: '70–80 km', s: 24000, g: 47000, p: 70000 },
      { id: 'c8090', range: '80–90 km', s: 28000, g: 55000, p: 82000 },
    ],
  },
];

// Deep-link to the dashboard signup with the chosen plan pre-selected.
const softwareLink = (name) => `/dashboard?kind=software&plan=${name}`;
const deliveryLink = (subTier, plan) => `/dashboard?kind=delivery&subTier=${subTier}&plan=${plan}`;

function AmountCell({ to, amount }) {
  return (
    <td><Link className="amt-link" to={to}>{ksh(amount)}<small>/mo</small></Link></td>
  );
}

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
              we never take a cut. Pick a plan to start signing up.
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
                    <Link className={`btn ${p.feat ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'center' }} to={softwareLink(p.name)}>Choose {p.name}</Link>
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
                          <tr key={t.id}>
                            <td>{t.range}</td>
                            <AmountCell to={deliveryLink(t.id, 'Starter')} amount={t.s} />
                            <AmountCell to={deliveryLink(t.id, 'Growth')} amount={t.g} />
                            <AmountCell to={deliveryLink(t.id, 'Pro')} amount={t.p} />
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="price-note">
                Tap any price to start signing up with that plan and range pre-selected. All plans include
                bundled hub deliveries and no sales commission.
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
