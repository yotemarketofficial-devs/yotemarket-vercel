import { Link } from 'react-router-dom';
import PhoneMockup from '../components/PhoneMockup.jsx';

const FEATURES = [
  { icon: 'fa-store', tint: 'linear-gradient(135deg,#7C2BD4,#A020F0)', title: 'Shop the mall', desc: 'Browse 200+ local stores like a physical mall, anywhere you are.' },
  { icon: 'fa-comments', tint: 'linear-gradient(135deg,#7C2BD4,#A020F0)', title: 'Negotiate in chat', desc: 'Message sellers in the app messenger, make offers, and agree a price before you pay.' },
  { icon: 'fa-truck-fast', tint: 'linear-gradient(135deg,#3b82f6,#2563eb)', title: 'Track to your hub', desc: 'Follow your rider in real time and collect at your nearest pickup hub.' },
  { icon: 'fa-mobile-screen', tint: 'linear-gradient(135deg,#009B3A,#057a30)', title: 'Pay with M-Pesa', desc: 'Secure, escrow-protected checkout — your money is safe until you collect.' },
];

function MobilePage() {
  return (
    <main>
      <section className="wrap app-hero">
        <div>
          <span className="eyebrow"><i className="fas fa-mobile-alt"></i> YoteMarket Shopper</span>
          <h1>The mall in <span className="g">your pocket</span>.</h1>
          <p className="lead">
            Shop hundreds of local stores, negotiate over chat, pay with M-Pesa, and track every delivery to your
            nearest hub — all from the YoteMarket app.
          </p>
          <div className="app-badges">
            <a className="store" href="#" aria-label="Get it on Google Play">
              <i className="fab fa-google-play"></i>
              <span className="st"><small>GET IT ON</small><b>Google Play</b></span>
            </a>
            <a className="store" href="#" aria-label="Download on the App Store">
              <i className="fab fa-apple"></i>
              <span className="st"><small>Download on the</small><b>App Store</b></span>
            </a>
          </div>
          <div className="trust">
            <span>Free to download</span><span className="dot"></span>
            <span>4.7★ rating</span><span className="dot"></span>
            <span>Works on Android &amp; iOS</span>
          </div>
        </div>
        <PhoneMockup />
      </section>

      <section className="pad" style={{ paddingTop: '32px' }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">One app · everything you need</div>
            <h2>Built for the way Kenya shops</h2>
          </div>
          <div className="app-feature-grid">
            {FEATURES.map((f) => (
              <article className="app-feature" key={f.title}>
                <div className="fi" style={{ background: f.tint }}>
                  <i className={`${f.brand ? 'fab' : 'fas'} ${f.icon}`}></i>
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

      <section className="pad" style={{ paddingTop: '8px' }}>
        <div className="wrap stats">
          <div className="stat"><div className="v">200+</div><div className="l">Local stores</div></div>
          <div className="stat"><div className="v">47</div><div className="l">Counties served</div></div>
          <div className="stat"><div className="v">4.7★</div><div className="l">App rating</div></div>
          <div className="stat"><div className="v">M-Pesa</div><div className="l">Instant checkout</div></div>
        </div>
      </section>

      <section className="pad" style={{ paddingTop: '8px', paddingBottom: '80px' }}>
        <div className="wrap" style={{ textAlign: 'center' }}>
          <div className="page-actions" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary btn-lg" to="/storefront">Try the web mall <i className="fas fa-arrow-right"></i></Link>
            <Link className="btn btn-outline btn-lg" to="/rider">Ride with us</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default MobilePage;
