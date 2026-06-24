import { Link } from 'react-router-dom';

const PLANS = [
  { name: 'Starter', from: 1500, deliveries: 10, feat: false, items: ['Branded storefront', '10 bundled hub deliveries/mo', 'In-app messenger & negotiation', 'M-Pesa escrow checkout'] },
  { name: 'Growth', from: 3000, deliveries: 20, feat: true, items: ['Everything in Starter', '20 bundled deliveries/mo', 'YoteAI tools & demand insights', 'Priority support'] },
  { name: 'Pro', from: 4200, deliveries: 30, feat: false, items: ['Everything in Growth', '30 bundled deliveries/mo', 'Featured placement', 'Pickup hub eligibility'] },
];

function Pricing() {
  return (
    <main>
      <section className="pad">
        <div className="wrap">
          <div className="page-head">
            <span className="eyebrow"><i className="fas fa-id-card"></i> Merchant pricing</span>
            <h1>Simple monthly plans. No commission.</h1>
            <p>
              Pick a plan and keep 100% of every sale. Plans include bundled hub deliveries; the exact price
              scales with your delivery range, which you choose in your dashboard.
            </p>
          </div>
          <div className="price-grid">
            {PLANS.map((p) => (
              <div key={p.name} className={`price-card ${p.feat ? 'feat' : ''}`}>
                {p.feat && <span className="badge">Popular</span>}
                <div className="pn">{p.name}</div>
                <div className="pp">from Ksh {p.from.toLocaleString()}<small>/mo</small></div>
                <div className="pd">{p.deliveries} bundled deliveries / month</div>
                <ul>
                  {p.items.map((it) => <li key={it}><i className="fas fa-check"></i><span>{it}</span></li>)}
                </ul>
                <Link className={`btn ${p.feat ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'center' }} to="/dashboard">Choose {p.name}</Link>
              </div>
            ))}
          </div>
          <p className="price-note">
            Prefer software only? Non-delivery plans start at Ksh 500/mo. Delivery prices increase with distance
            band — you'll see your exact pricing when you pick your range in the dashboard.
          </p>
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
