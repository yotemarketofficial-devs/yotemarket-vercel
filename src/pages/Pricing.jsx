import { useEffect, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { FEATURES } from '../lib/entitlements.js';
import { fulfilmentStatus } from '../lib/firebase.js';
import PageHero from '../components/PageHero.jsx';
import { Icon } from '../components/LineIcon.jsx';
import merchantPhoto from '../assets/pages/pricing-merchant.webp';
import merchantPhoto2x from '../assets/pages/pricing-merchant@2x.webp';
import '../styles/pages.css';

/* /pricing — laid out to the 2026-10-09 pricing board: hero with the merchant photo,
   three plan cards with the middle one raised, a "Compare features" table and a help strip.
   The board's prices, plan names, Annual toggle and feature lines were placeholders; every
   price, tier and feature here is the product's own:
   - the ladder is Entry → Growth → Pro → Enterprise (lib/entitlements.js TIER_NAMES), and
     each feature's tier comes from FEATURES there — the single source of truth the dashboard
     gates on — so this page can't drift from what a plan actually unlocks;
   - billing is monthly only (there is no annual plan), so the toggle switches between the
     software plans and the same plans with hub deliveries. */

const ksh = (n) => 'Ksh ' + Number(n).toLocaleString('en-KE');

// Features unlocked AT a given tier rank, from the entitlements matrix.
const addsAt = (rank) => Object.values(FEATURES).filter((f) => f.minTier === rank).map((f) => f.label);

// Entry is the floor — the core toolkit every plan includes. There is no free tier;
// a free offer or scout activation code simply unlocks the Entry software package.
const ENTRY_CORE = [
  'Branded storefront & unlimited listings',
  'M‑Pesa escrow checkout',
  'In-app messenger & price negotiation',
  'Orders, receipts & wallet payouts',
  'Reviews, followers & YoteAI assistant',
];

const PLANS = [
  { name: 'Entry', rank: 1, price: 500, tagline: 'Everything to start selling.', note: 'Free with a scout code or launch offer', items: [...ENTRY_CORE, ...addsAt(1)] },
  { name: 'Growth', rank: 2, price: 700, tagline: 'Power tools for a growing store.', feat: true, prev: 'Entry', items: addsAt(2) },
  { name: 'Pro', rank: 3, price: 1000, tagline: 'Close more sales and rank higher.', prev: 'Growth', items: addsAt(3) },
];

// The compare table: every row is a real gate. Core rows are in every plan.
const COMPARE = [
  ...ENTRY_CORE.map((label) => ({ label, minTier: 1 })),
  ...Object.values(FEATURES).map((f) => ({ label: f.label, minTier: f.minTier })),
];
const COLS = [{ name: 'Entry', rank: 1 }, { name: 'Growth', rank: 2 }, { name: 'Pro', rank: 3 }, { name: 'Enterprise', rank: 4 }];

// With delivery — every delivery plan is the matching software tier PLUS hub
// deliveries, priced by distance (Entry = 10, Growth = 20, Pro = 30 runs/mo).
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
  // Delivery is temporarily suspended (Terms, clause 1). Read the same live flag the
  // subscribe flow reads, so the delivery prices never show without saying so.
  const [paused, setPaused] = useState(null);
  useEffect(() => {
    let live = true;
    fulfilmentStatus().then((st) => { if (live) setPaused(st ? st.riderDelivery === false : null); }).catch(() => {});
    return () => { live = false; };
  }, []);

  const toggle = (
    <div className="pr-seg" role="tablist" aria-label="Plan type">
      <button type="button" role="tab" className={mode === 'plans' ? 'on' : ''} aria-selected={mode === 'plans'} onClick={() => setMode('plans')}>Plans</button>
      <button type="button" role="tab" className={mode === 'delivery' ? 'on' : ''} aria-selected={mode === 'delivery'} onClick={() => setMode('delivery')}>With delivery</button>
      <span className="pr-seg-note">Monthly · no commission</span>
    </div>
  );

  return (
    <main className="pg pricing">
      <PageHero
        pill={{ icon: 'tag', text: 'Seller plans & pricing' }}
        title={<>Simple monthly plans for<br /><span className="g">Kenyan businesses</span></>}
        lead="Your own storefront, M‑Pesa checkout, YoteFeed and YoteAI on one flat monthly fee. No commission on your sales — you keep 100% of every sale."
        actions={toggle}
        art={{ src: merchantPhoto, src2x: merchantPhoto2x, width: 360, height: 285, position: '42% 35%',
          alt: 'A smiling merchant in a YoteMarket apron checks her store on a tablet between stocked shelves' }}
        note={'Grow your\nbusiness\nwith YoteMarket.'}
      />

      {mode === 'plans' ? (
        <>
          <section className="pg-sec pr-plans-sec">
            <div className="pg-wrap">
              <div className="pr-plans">
                {PLANS.map((t) => (
                  <article key={t.name} className={'pg-card pr-plan' + (t.feat ? ' is-feat' : '')}>
                    {t.feat && <span className="pr-badge">Popular</span>}
                    <h2>{t.name}</h2>
                    <p className="pr-tag">{t.tagline}</p>
                    <p className="pr-price"><span>Ksh</span>{Number(t.price).toLocaleString('en-KE')}<small>/month</small></p>
                    <ul>
                      {t.prev && <li className="is-prev"><Icon name="check" /><span>Everything in {t.prev}, plus:</span></li>}
                      {t.items.map((it) => <li key={it}><Icon name="check" /><span>{it}</span></li>)}
                    </ul>
                    {t.note && <p className="pr-note"><Icon name="gift" /> {t.note}</p>}
                    <Link className={'pg-btn' + (t.feat ? '' : ' is-ghost')} to={softwareLink(t.name)}>Choose {t.name}</Link>
                  </article>
                ))}
              </div>
              <p className="pr-fine">
                Every plan is software-only: a flat monthly fee, no delivery runs. Want us to deliver too?{' '}
                <button type="button" className="pr-linkbtn" onClick={() => setMode('delivery')}>See the plans with delivery</button>.
              </p>
            </div>
          </section>

          <section className="pg-sec pr-compare-sec">
            <div className="pg-wrap">
              <div className="pr-compare pg-card">
                <div className="pr-compare-copy">
                  <h2 className="pg-h2">Compare features</h2>
                  <p>Every plan gives you the tools to sell, grow and manage your business on one platform. Each feature is unlocked from the plan where it is ticked.</p>
                  <Link className="pr-more" to="/contact">Questions about a feature? <Icon name="arrow" /></Link>
                </div>
                <div className="pr-table-wrap">
                  <table className="pr-table">
                    <thead>
                      <tr>
                        <th scope="col"><span className="sr-only">Feature</span></th>
                        {COLS.map((c) => <th scope="col" key={c.name} className={c.rank === 2 ? 'is-feat' : ''}>{c.name}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARE.map((r) => (
                        <tr key={r.label}>
                          <th scope="row">{r.label}</th>
                          {COLS.map((c) => (
                            <td key={c.name} className={c.rank === 2 ? 'is-feat' : ''}>
                              {c.rank >= r.minTier
                                ? <><Icon name="check" className="pr-yes" /><span className="sr-only">Included</span></>
                                : <><span className="pr-no" aria-hidden="true">—</span><span className="sr-only">Not included</span></>}
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr className="pr-price-row">
                        <th scope="row">Monthly price</th>
                        {COLS.map((c) => {
                          const p = PLANS.find((x) => x.rank === c.rank);
                          return <td key={c.name} className={c.rank === 2 ? 'is-feat' : ''}>{p ? ksh(p.price) : 'Quote'}</td>;
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="pg-sec">
          <div className="pg-wrap">
            {paused && (
              <p className="rider-paused pr-paused" role="status">
                <Icon name="clock" />
                <span><b>Delivery is temporarily paused</b> while we restructure the service to meet new regulations. Orders are collected from the store in the meantime, and no delivery fee is charged.</span>
              </p>
            )}
            <div className="pr-legend">
              <span><b>Entry</b> · 10 deliveries/mo</span>
              <span><b>Growth</b> · 20 deliveries/mo</span>
              <span><b>Pro</b> · 30 deliveries/mo</span>
            </div>
            <div className="ptable-wrap pr-delivery">
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
            <p className="pr-fine">
              Each delivery plan pairs the matching software plan (Entry / Growth / Pro) with hub
              deliveries — tap any price to sign up with it pre-selected. Higher volume or nationwide?{' '}
              <Link to="/contact">Enterprise delivery is quote-based</Link>.
            </p>
          </div>
        </section>
      )}

      <section className="pg-sec pr-help-sec">
        <div className="pg-wrap pr-help">
          <div className="pg-strip">
            <span className="pg-ic"><Icon name="layers" /></span>
            <div>
              <h3>Need a custom plan?</h3>
              <p>Enterprise is for businesses that run several stores: more than one storefront under one account, top-brand placement, custom rates and a dedicated account manager.</p>
            </div>
            <Link className="pg-btn" to="/contact">Talk to sales <Icon name="arrow" /></Link>
          </div>
          <div className="pg-strip">
            <span className="pg-ic"><Icon name="headset" /></span>
            <div>
              <h3>Need help choosing a plan?</h3>
              <p>Our team will help you find the right plan for your business. Also earn with us — <Link to="/marketers">refer merchants</Link> or <Link to="/rider">ride</Link>.</p>
            </div>
            <Link className="pg-btn is-ghost" to="/contact">Contact us <Icon name="arrow" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Pricing;
