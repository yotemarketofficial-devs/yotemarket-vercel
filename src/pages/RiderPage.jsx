import { Link } from 'react-router-dom';

const FEATURES = [
  { icon: 'fa-layer-group', tint: 'linear-gradient(135deg,#7C2BD4,#A020F0)', title: 'Batched routes', desc: 'Pick up several orders on one run — more drops, more earnings per trip.' },
  { icon: 'fa-coins', tint: 'linear-gradient(135deg,#E89B0C,#F4B530)', title: 'Per-run payouts', desc: 'Transparent pay: base + multi-drop + distance. See it before you accept.' },
  { icon: 'fa-mobile-screen', tint: 'linear-gradient(135deg,#009B3A,#057a30)', title: 'Cash out to M-Pesa', desc: 'Earnings settle straight to your M-Pesa — no fees, no waiting.' },
  { icon: 'fa-clock', tint: 'linear-gradient(135deg,#3b82f6,#2563eb)', title: 'Flexible hours', desc: 'Zero-hour contract — ride when it suits you across urban, regional & long-haul bands.' },
];

function RiderPage() {
  return (
    <main>
      <section className="wrap app-hero">
        <div>
          <span className="eyebrow"><i className="fas fa-motorcycle"></i> YoteMarket Rider</span>
          <h1>Ride with us. <span className="g">Earn more.</span></h1>
          <p className="lead">
            Deliver batched orders from local hubs and get paid per run — straight to M-Pesa. Choose your band,
            stack your drops, and keep every shilling of your payout.
          </p>
          <div className="app-badges">
            <a className="store" href="#" aria-label="Get it on Google Play">
              <i className="fab fa-google-play"></i>
              <span className="st"><small>GET IT ON</small><b>Google Play</b></span>
            </a>
            <Link className="btn btn-gold btn-lg" to="/rider"><i className="fas fa-id-card"></i> Join the rider network</Link>
          </div>
          <div className="trust">
            <span>Zero-hour contract</span><span className="dot"></span>
            <span>Instant M-Pesa payouts</span><span className="dot"></span>
            <span>No fuel deductions</span>
          </div>
        </div>

        <div className="download" style={{ aspectRatio: 'auto' }}>
          <div className="glow"></div>
          <div style={{ position: 'relative' }}>
            <div className="icon-row">
              <div className="appicon"><img src="/assets/rider_app_icon.png" alt="YoteMarket Rider app icon" /></div>
              <div className="meta">
                <div className="n">YoteMarket Rider</div>
                <div className="s">Deliver · Earn · Cash out</div>
                <div className="stars">
                  <i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i>
                  <i className="fas fa-star"></i><i className="fas fa-star-half-alt"></i> 4.8
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
              {[['Ksh 70+', 'Base per urban run'], ['Ksh 25', 'Per paid km'], ['5–20', 'Drops per run'], ['Same day', 'M-Pesa payout']].map(([v, l]) => (
                <div key={l} style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', borderRadius: '14px', padding: '16px' }}>
                  <div style={{ color: 'var(--gold-bright)', fontSize: '22px', fontWeight: 800 }}>{v}</div>
                  <div style={{ color: 'rgba(255,255,255,.78)', fontSize: '13px', marginTop: '2px' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pad" style={{ paddingTop: '32px' }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">Why ride with YoteMarket</div>
            <h2>Fair pay, clear routes, instant payouts</h2>
          </div>
          <div className="app-feature-grid">
            {FEATURES.map((f) => (
              <article className="app-feature" key={f.title}>
                <div className="fi" style={{ background: f.tint }}>
                  <i className={`fas ${f.icon}`}></i>
                </div>
                <div>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pad" style={{ paddingTop: '8px', paddingBottom: '80px' }}>
        <div className="wrap" style={{ textAlign: 'center' }}>
          <div className="page-actions" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary btn-lg" to="/">Back to home</Link>
            <Link className="btn btn-outline btn-lg" to="/mobile">Get the shopper app</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default RiderPage;
