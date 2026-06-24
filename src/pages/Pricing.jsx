import { useState } from 'react';
import { Link } from 'react-router-dom';

// Software-only tiers (flat monthly, no delivery). Shown first.
const SOFTWARE = [
  { name: 'Entry', price: 500, feat: false, items: ['Branded storefront', 'In-app messenger & negotiation', 'M-Pesa escrow checkout', 'Basic platform access'] },
  { name: 'Growth', price: 700, feat: true, items: ['Everything in Entry', 'YoteAI merchant tools', 'Demand insights & order tracking', 'Enhanced software suite'] },
  { name: 'Pro', price: 1000, feat: false, items: ['Everything in Growth', 'Full analytics suite', 'Featured placement', 'Priority support'] },
];

// Delivery plans — "from" prices (the entry 0–5 km tier); price scales with range.
const DELIVERY = [
  { name: 'Starter', from: 1500, deliveries: 10, feat: false, items: ['Branded storefront', '10 bundled hub deliveries/mo', 'In-app messenger & negotiation', 'M-Pesa escrow checkout'] },
  { name: 'Growth', from: 3000, deliveries: 20, feat: true, items: ['Everything in Starter', '20 bundled deliveries/mo', 'YoteAI tools & demand insights', 'Priority support'] },
  { name: 'Pro', from: 4200, deliveries: 30, feat: false, items: ['Everything in Growth', '30 bundled deliveries/mo', 'Featured placement', 'Pickup hub eligibility'] },
];

function PlanCard({ name, priceLabel, sub, items, feat }) {
  return (
    <div className={`price-card ${feat ? 'feat' : ''}`}>
      {feat && <span className="badge">Popular</span>}
      <div className="pn">{name}</div>
      <div className="pp">{priceLabel}<small>/mo</small></div>
      <div className="pd">{sub}</div>
      <ul>
        {items.map((it) => <li key={it}><i className="fas fa-check"></i><span>{it}</span></li>)}
      </ul>
      <Link className={`btn ${feat ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'center' }} to="/dashboard">Choose {name}</Link>
    </div>
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
                  <PlanCard key={p.name} name={p.name} priceLabel={`Ksh ${p.price.toLocaleString()}`} sub="Platform & tools — no delivery runs" items={p.items} feat={p.feat} />
                ))}
              </div>
              <p className="price-note">
                Software-only plans are a flat monthly fee with no physical deliveries. Need bundled deliveries?
                Switch to <button onClick={() => setMode('delivery')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--purple)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>With delivery</button>.
              </p>
            </>
          ) : (
            <>
              <div className="price-grid">
                {DELIVERY.map((p) => (
                  <PlanCard key={p.name} name={p.name} priceLabel={`from Ksh ${p.from.toLocaleString()}`} sub={`${p.deliveries} bundled deliveries / month`} items={p.items} feat={p.feat} />
                ))}
              </div>
              <p className="price-note">
                Delivery prices increase with your distance band — you'll see your exact pricing when you pick
                your delivery range in the dashboard.
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
