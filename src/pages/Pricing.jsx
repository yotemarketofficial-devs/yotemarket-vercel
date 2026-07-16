import { useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { FEATURES } from '../lib/entitlements.js';

const ksh = (n) => 'Ksh ' + n.toLocaleString();

// Features unlocked AT a given tier rank — pulled straight from the entitlements
// matrix (the single source of truth), so pricing can never drift from what the
// product actually gates. Entry(1) → Growth(2) → Pro(3) → Enterprise(4).
const addsAt = (rank) => Object.values(FEATURES).filter((f) => f.minTier === rank).map((f) => f.label);

// Entry is the floor — the core toolkit every plan includes. There is no free tier;
// a free offer or scout activation code simply unlocks the Entry software package.
const ENTRY_CORE = [
  'Branded storefront & unlimited listings',
  'M-Pesa escrow checkout',
  'In-app messenger & price negotiation',
  'Orders, receipts & wallet payouts',
  'Reviews, followers & YoteAI assistant',
];

const TIERS = [
  { name: 'Entry', price: 500, tagline: 'Everything to start selling', note: 'Free with a scout code or launch offer', items: [...ENTRY_CORE, ...addsAt(1)] },
  { name: 'Growth', price: 700, tagline: 'Power tools to scale', feat: true, prev: 'Entry', items: addsAt(2) },
  { name: 'Pro', price: 1000, tagline: 'Close more, rank higher', prev: 'Growth', items: addsAt(3) },
  { name: 'Enterprise', price: null, tagline: 'For multi-store businesses', prev: 'Pro', items: [...addsAt(4), 'High-volume delivery', 'Custom pricing & rates', 'Dedicated account manager'] },
];

// With bundled delivery — every delivery plan is the matching software tier PLUS
// hub deliveries, priced by distance (Entry = 10, Growth = 20, Pro = 30 runs/mo).
// Column plan keys stay Starter/Growth/Pro (server tier ids); Entry is shown for
// the entry delivery tier so the name lines up with the software ladder.
const DELIVERY_BANDS = [
  { label: 'Urban', span: '0–30 km', tiers: [
    { id: 'a05', range: '0–5 km', s: 1500, g: 3000, p: 4200 },
    { id: 'a515', range: '5–15 km', s: 2000, g: 3500, p: 5000 },
    { id: 'a1530', range: '15–30 km', s: 3500, g: 6000, p: 9000 },
  ] },
  { label: 'Regional', span: '30–60 km', tiers: [
    { id: 'b3040', range: '30–40 km', s: 6500, g: 11000, p: 16000 },
    { id: 'b4050', range: '40–50 km', s: 9000, g: 16000, p: 23500 },
    { id: 'b5060', range: '50–60 km', s: 12000, g: 22000, p: 32000 },
  ] },
  { label: 'Long-haul', span: '60–90 km', tiers: [
    { id: 'c6070', range: '60–70 km', s: 20000, g: 36000, p: 52000 },
    { id: 'c7080', range: '70–80 km', s: 24000, g: 47000, p: 70000 },
    { id: 'c8090', range: '80–90 km', s: 28000, g: 55000, p: 82000 },
  ] },
];

const softwareLink = (name) => `/dashboard?kind=software&plan=${name}`;
const deliveryLink = (subTier, plan) => `/dashboard?kind=delivery&subTier=${subTier}&plan=${plan}`;

function AmountCell({ to, amount }) {
  return <td><Link className="amt-link" to={to}>{ksh(amount)}<small>/mo</small></Link></td>;
}

function Pricing() {
  const [mode, setMode] = useState('plans'); // plans (default) | delivery

  return (
    <main>
      <section className="pad">
        <div className="wrap">
          <div className="page-head">
            <span className="eyebrow"><i className="fas fa-id-card"></i> Merchant pricing</span>
            <h1>One ladder. No commission.</h1>
            <p>
              Pick a software tier — that's your feature set. Need us to deliver? The same tier is
              available with bundled hub deliveries, priced by distance. Either way you keep 100% of
              every sale; we never take a cut.
            </p>
          </div>

          <div className="seg-wrap">
            <div className="seg" role="tablist" aria-label="Plan type">
              <button className={mode === 'plans' ? 'on' : ''} aria-selected={mode === 'plans'} onClick={() => setMode('plans')}>Plans</button>
              <button className={mode === 'delivery' ? 'on' : ''} aria-selected={mode === 'delivery'} onClick={() => setMode('delivery')}>With delivery</button>
            </div>
          </div>

          {mode === 'plans' ? (
            <>
              <div className="price-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
                {TIERS.map((t) => (
                  <div key={t.name} className={`price-card ${t.feat ? 'feat' : ''}`} style={t.price === null ? { borderColor: 'var(--purple)' } : undefined}>
                    {t.feat && <span className="badge">Popular</span>}
                    {t.price === null && <span className="badge" style={{ background: 'linear-gradient(135deg,#5B16A8,#A020F0)' }}>Enterprise</span>}
                    <div className="pn">{t.name}</div>
                    <div className="pp">{t.price !== null ? <>{ksh(t.price)}<small>/mo</small></> : <>Custom<small> · quote</small></>}</div>
                    <div className="pd">{t.tagline}</div>
                    <ul>
                      {t.prev && <li style={{ fontWeight: 600 }}><i className="fas fa-circle-check" style={{ color: 'var(--purple)' }}></i><span>Everything in {t.prev}</span></li>}
                      {t.items.map((it) => <li key={it}><i className="fas fa-check"></i><span>{it}</span></li>)}
                    </ul>
                    {t.note && <div className="price-note" style={{ margin: '0 0 12px', fontSize: '12.5px' }}><i className="fas fa-gift" style={{ color: 'var(--purple)', marginRight: 6 }}></i>{t.note}</div>}
                    {t.price !== null
                      ? <Link className={`btn ${t.feat ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'center' }} to={softwareLink(t.name)}>Choose {t.name}</Link>
                      : <Link className="btn btn-primary" style={{ justifyContent: 'center' }} to="/contact">Talk to sales</Link>}
                  </div>
                ))}
              </div>
              <p className="price-note">
                Every tier is software-only by default (a flat monthly fee, no delivery runs). Want us to
                deliver too? See{' '}
                <button onClick={() => setMode('delivery')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--purple)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>With delivery</button>.
              </p>
            </>
          ) : (
            <>
              <div className="plan-legend">
                <span><b>Entry</b> · 10 deliveries/mo</span>
                <span><b>Growth</b> · 20 deliveries/mo</span>
                <span><b>Pro</b> · 30 deliveries/mo</span>
              </div>
              <div className="ptable-wrap">
                <table className="ptable">
                  <thead>
                    <tr>
                      <th>Delivery range</th>
                      <th>Entry<span>10 deliveries</span></th>
                      <th>Growth<span>20 deliveries</span></th>
                      <th>Pro<span>30 deliveries</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {DELIVERY_BANDS.map((band) => (
                      <Fragment key={band.label}>
                        <tr className="bandrow"><td colSpan={4}>{band.label} · {band.span}</td></tr>
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
                Each delivery plan bundles the matching software tier (Entry / Growth / Pro) plus hub
                deliveries — tap any price to sign up with it pre-selected. Higher volume or nationwide?{' '}
                <Link to="/contact" style={{ color: 'var(--purple)', fontWeight: 600 }}>Enterprise delivery is quote-based</Link>.
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
