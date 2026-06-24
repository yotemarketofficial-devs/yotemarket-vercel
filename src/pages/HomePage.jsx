import { Link } from 'react-router-dom';

const MERCHANT_FEATURES = [
  { icon: 'fa-store', tint: 'linear-gradient(135deg,#7C2BD4,#A020F0)', title: 'Branded storefront', desc: 'Your own shopfront in the mall — products, photos and reviews, live in minutes.' },
  { icon: 'fa-id-card', tint: 'linear-gradient(135deg,#5B16A8,#7C2BD4)', title: 'Subscriptions, no commission', desc: 'Flat monthly plans from Ksh 1,500 with bundled hub deliveries. Keep 100% of every sale — we never take a cut.' },
  { icon: 'fa-wand-magic-sparkles', tint: 'linear-gradient(135deg,#A020F0,#E89B0C)', title: 'YoteAI merchant tools', desc: 'AI writes your product listings, surfaces demand insights, and answers shopper questions for you.' },
  { icon: 'fa-comments', tint: 'linear-gradient(135deg,#3b82f6,#2563eb)', title: 'In-app messenger', desc: 'Chat and negotiate with buyers inside the app — agree a price, then get paid through escrow.' },
  { icon: 'fa-wallet', tint: 'linear-gradient(135deg,#009B3A,#057a30)', title: 'Wallet & M-Pesa payouts', desc: 'Track earnings and withdraw to M-Pesa or your Paybill on demand. Funds are escrow-protected.' },
  { icon: 'fa-chart-line', tint: 'linear-gradient(135deg,#E89B0C,#F4B530)', title: 'Demand insights', desc: 'See what shoppers search for and which products trend in your area — and stock the winners.' },
];

function HomePage() {
  return (
    <main>
      <header id="top" className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">
              <i className="fas fa-location-dot"></i>
              Kenya's Virtual Mall
            </span>
            <h1>
              Shop local.<br />
              <span className="g">Delivered</span> fast.
            </h1>
            <p className="lead">
              YoteMarket bundles a virtual mall, merchant tools, and last-mile delivery into one ecosystem.
              Buy, sell, chat &amp; negotiate in the app messenger, and pay with M-Pesa.
            </p>
            <div className="hero-cta">
              <Link className="btn btn-primary btn-lg" to="/storefront">
                Start shopping <i className="fas fa-arrow-right"></i>
              </Link>
              <Link className="btn btn-outline btn-lg" to="/dashboard">
                Become a seller
              </Link>
            </div>
            <div className="trust">
              <span>Easy Ordering</span>
              <span className="dot"></span>
              <span>Secure Payments</span>
              <span className="dot"></span>
              <span>Fast Deliveries</span>
            </div>
          </div>
          <div className="hero-art">
            <img src="/assets/hero-bg.png" alt="YoteMarket delivery in a Kenyan city at golden hour" />
            <div className="ov"></div>
            <div className="hero-badge">
              <span className="mini">
                <i className="fas fa-store"></i>
                200+ local stores
              </span>
              <span className="mini">
                <i className="fas fa-comments"></i>
                Chat in the app
              </span>
              <span className="mini">
                <i className="fas fa-mobile-alt"></i>
                M-Pesa checkout
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* trust metrics strip */}
      <div className="trust-strip">
        <div className="wrap trust-strip-in">
          <div className="ts"><b>200+</b><span>Local stores</span></div>
          <div className="ts"><b>47</b><span>Counties served</span></div>
          <div className="ts"><b>1,200+</b><span>Active merchants</span></div>
          <div className="ts"><b>M-Pesa</b><span>Instant checkout</span></div>
        </div>
      </div>

      <section className="pad" id="roles">
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">One platform · every role</div>
            <h2>Whoever you are, there's a place for you</h2>
            <p>
              Shoppers, merchants, marketers and riders each get a dedicated space — built on one shared design system.
            </p>
          </div>
          <div className="cards">
            <Link className="card" to="/storefront">
              <div className="tile" style={{ background: 'linear-gradient(135deg,#7C2BD4,#A020F0)' }}>
                <i className="fas fa-bag-shopping"></i>
              </div>
              <h3>Shop the mall</h3>
              <p>
                Browse hundreds of local stores like a physical mall, chat with sellers in the app messenger, and check out with M-Pesa.
              </p>
              <span className="go">Enter storefront <i className="fas fa-arrow-right arrow"></i></span>
            </Link>
            <Link className="card" to="/dashboard">
              <div className="tile" style={{ background: '#4338CA' }}>
                <i className="fas fa-store"></i>
              </div>
              <h3>Sell &amp; grow</h3>
              <p>
                A branded storefront, product management, AI tools, demand insights, wallet and subscriptions — no sales commission.
              </p>
              <span className="go">Open seller dashboard <i className="fas fa-arrow-right arrow"></i></span>
            </Link>
            <Link className="card" to="/marketers">
              <div className="tile" style={{ background: 'linear-gradient(135deg,#E89B0C,#F4B530)' }}>
                <i className="fas fa-bullhorn"></i>
              </div>
              <h3>Refer &amp; earn</h3>
              <p>
                Refer merchants, stack checkpoints, climb the leaderboard, and cash out to M-Pesa. Top scouts get hired.
              </p>
              <span className="go">Open marketer program <i className="fas fa-arrow-right arrow"></i></span>
            </Link>
          </div>
        </div>
      </section>

      {/* merchant features — AI tools + subscription benefits */}
      <section className="pad" id="sell" style={{ paddingTop: '8px' }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">For merchants</div>
            <h2>Everything you need to sell &amp; grow</h2>
            <p>
              Launch a storefront, reach shoppers across 47 counties, and let AI do the heavy lifting — on a flat monthly plan with no commission.
            </p>
          </div>
          <div className="mfeat-grid">
            {MERCHANT_FEATURES.map((f) => (
              <article className="mfeat-card" key={f.title}>
                <div className="mfeat-ic" style={{ background: f.tint }}>
                  <i className={`fas ${f.icon}`}></i>
                </div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
          <div className="sec-cta">
            <Link className="btn btn-primary btn-lg" to="/dashboard">Start selling <i className="fas fa-arrow-right"></i></Link>
            <span className="sec-cta-note">From Ksh 1,500/mo · bundled deliveries · no commission</span>
          </div>
        </div>
      </section>

      {/* earn with YoteMarket — marketers + riders */}
      <section className="pad" id="earn" style={{ paddingTop: '8px' }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">Earn with YoteMarket</div>
            <h2>Two ways to make money with us</h2>
            <p>Bring merchants on board, or deliver across town — both pay out to M-Pesa.</p>
          </div>
          <div className="earn-grid">
            <article className="earn-card">
              <div className="earn-ic" style={{ background: 'linear-gradient(135deg,#E89B0C,#F4B530)' }}>
                <i className="fas fa-bullhorn"></i>
              </div>
              <h3>Marketer Program</h3>
              <p>Become a YoteMarket scout. Sign up merchants with your referral link and earn as they grow.</p>
              <ul className="feats">
                <li><i className="fas fa-check"></i> Unique referral link &amp; QR</li>
                <li><i className="fas fa-check"></i> Milestone checkpoint payouts</li>
                <li><i className="fas fa-check"></i> Leaderboard, badges &amp; streaks</li>
                <li><i className="fas fa-check"></i> Cash out to M-Pesa — top scouts get hired</li>
              </ul>
              <Link className="btn btn-gold" to="/marketers">Join the program <i className="fas fa-arrow-right"></i></Link>
            </article>
            <article className="earn-card">
              <div className="earn-ic" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                <i className="fas fa-motorcycle"></i>
              </div>
              <h3>Rider Program</h3>
              <p>Deliver on your own schedule. Pick up batched runs, drop at hubs, and grow your earnings.</p>
              <ul className="feats">
                <li><i className="fas fa-check"></i> Flexible runs — work your own hours</li>
                <li><i className="fas fa-check"></i> Get paid per run, straight to M-Pesa</li>
                <li><i className="fas fa-check"></i> Unlock higher delivery tiers with badges</li>
                <li><i className="fas fa-check"></i> Real-time routes to your nearest hubs</li>
              </ul>
              <Link className="btn btn-outline" to="/rider">Ride with us <i className="fas fa-arrow-right"></i></Link>
            </article>
          </div>
        </div>
      </section>

      <section className="pad" id="download" style={{ paddingTop: '8px' }}>
        <div className="wrap">
          <div className="download">
            <div className="glow"></div>
            <div className="dl-grid">
              <div className="dl-text">
                <div className="kicker">Get the app</div>
                <h2>YoteMarket in your pocket</h2>
                <div className="icon-row" style={{ marginTop: '24px' }}>
                  <div className="appicon">
                    <img src="/assets/favicon.png" alt="YoteMarket app icon" />
                  </div>
                  <div className="meta">
                    <div className="n">YoteMarket</div>
                    <div className="s">Shop · Sell · Deliver</div>
                    <div className="stars">
                      <i className="fas fa-star"></i>
                      <i className="fas fa-star"></i>
                      <i className="fas fa-star"></i>
                      <i className="fas fa-star"></i>
                      <i className="fas fa-star-half-alt"></i>
                      4.7
                    </div>
                  </div>
                </div>
                <p>
                  Shop on the go, manage your store, or ride with us — more stops, more earnings.
                  One app for shoppers and riders alike.
                </p>
                <div className="badges" style={{ marginTop: '26px' }}>
                  <Link className="store" to="/mobile">
                    <i className="fab fa-google-play"></i>
                    <span className="st"><small>GET IT ON</small><b>Google Play</b></span>
                  </Link>
                  <Link className="store" to="/mobile">
                    <i className="fab fa-apple"></i>
                    <span className="st"><small>Download on the</small><b>App Store</b></span>
                  </Link>
                </div>
              </div>
              <div className="phone-wrap">
                <div className="phone">
                  <div className="screen">
                    <div className="island"></div>
                    <div className="ap-head">
                      <div className="ap-status">
                        <span>9:41</span>
                        <span className="r">
                          <i className="fas fa-signal"></i>
                          <i className="fas fa-wifi"></i>
                          <i className="fas fa-battery-full"></i>
                        </span>
                      </div>
                      <div className="ap-top">
                        <img src="/assets/logo-white.png" alt="YoteMarket" />
                        <div className="ap-icons">
                          <span className="ap-ic"><i className="fas fa-coins" style={{ color: '#f4b530' }}></i></span>
                          <span className="ap-ic"><i className="fas fa-cart-shopping"></i></span>
                        </div>
                      </div>
                      <div className="ap-search">
                        <i className="fas fa-magnifying-glass"></i>
                        Search the mall
                      </div>
                    </div>
                    <div className="ap-body">
                      <div className="ap-chips">
                        <span className="ap-chip on"><i className="fas fa-border-all"></i> All</span>
                        <span className="ap-chip"><i className="fas fa-mobile-screen" style={{ color: '#3b82f6' }}></i> Electronics</span>
                        <span className="ap-chip"><i className="fas fa-shirt" style={{ color: '#a020f0' }}></i> Fashion</span>
                      </div>
                      <div className="ap-sec">Explore the mall</div>
                      <div className="ap-store">
                        <div className="bn"><i className="fas fa-store"></i></div>
                        <div className="bd">
                          <div className="lg"><i className="fas fa-store"></i></div>
                          <div className="nm">
                            Wanjiku Electronics <i className="fas fa-circle-check" style={{ color: '#5b2c9c', fontSize: '9px' }}></i>
                          </div>
                          <div className="mt">★ 4.8 · 124 products</div>
                        </div>
                      </div>
                      <div className="ap-sec">For you</div>
                      <div className="ap-grid">
                        <div className="ap-pc">
                          <div className="im" style={{ background: 'linear-gradient(135deg,#3b82f62e,#3b82f655)', color: '#3b82f6' }}>
                            <i className="fas fa-mobile-screen-button"></i>
                          </div>
                          <div className="pb">
                            <div className="pn">Samsung Galaxy A15 128GB</div>
                            <div className="pr">
                              <span className="pp">Ksh 18,500</span>
                              <span className="pa"><i className="fas fa-plus"></i></span>
                            </div>
                          </div>
                        </div>
                        <div className="ap-pc">
                          <div className="im" style={{ background: 'linear-gradient(135deg,#10b9812e,#10b98155)', color: '#10b981' }}>
                            <i className="fas fa-seedling"></i>
                          </div>
                          <div className="pb">
                            <div className="pn">Fresh Avocados (6 pack)</div>
                            <div className="pr">
                              <span className="pp">Ksh 350</span>
                              <span className="pa"><i className="fas fa-plus"></i></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ap-nav">
                      <div className="nv on"><div className="pillx"><i className="fas fa-house"></i></div><span>Home</span></div>
                      <div className="nv"><div className="pillx"><i className="fas fa-store"></i></div><span>Mall</span></div>
                      <div className="nv"><div className="pillx"><i className="fas fa-comments"></i></div><span>Chats</span></div>
                      <div className="nv"><div className="pillx"><i className="fas fa-box"></i></div><span>Orders</span></div>
                      <div className="nv"><div className="pillx"><i className="fas fa-user"></i></div><span>Profile</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pad" style={{ paddingTop: '24px' }}>
        <div className="wrap stats">
          <div className="stat"><div className="v">200+</div><div className="l">Local stores</div></div>
          <div className="stat"><div className="v">47</div><div className="l">Counties served</div></div>
          <div className="stat"><div className="v">1,200+</div><div className="l">Active merchants</div></div>
          <div className="stat"><div className="v">M-Pesa</div><div className="l">Instant checkout</div></div>
        </div>
      </section>

      {/* final CTA band */}
      <section className="pad" style={{ paddingTop: '8px' }}>
        <div className="wrap">
          <div className="cta-band">
            <div className="cta-glow"></div>
            <div className="cta-inner">
              <h2>Ready when you are.</h2>
              <p>Shop the mall, open your store, or earn with us — it all starts here.</p>
              <div className="cta-actions">
                <Link className="btn btn-gold btn-lg" to="/storefront">Start shopping <i className="fas fa-arrow-right"></i></Link>
                <Link className="btn btn-ghost-line btn-lg" to="/dashboard">Become a seller</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="foot">
            <div className="brand">
              <img id="footlogo" src="/assets/logo.png" alt="YoteMarket" />
              <p>
                Kenya's virtual mall — bundling commerce, merchant tools, and last-mile delivery into one ecosystem.
              </p>
              <div className="contact">
                <a href="mailto:general@yotemarket.com"><i className="fas fa-envelope"></i> general@yotemarket.com</a>
                <a href="tel:0720730861"><i className="fas fa-phone"></i> 0720 730 861</a>
              </div>
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                <li><Link to="/about">About us</Link></li>
                <li><Link to="/pricing">Pricing</Link></li>
                <li><Link to="/careers">Careers</Link></li>
                <li><Link to="/contact">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4>For business</h4>
              <ul>
                <li><Link to="/dashboard">Sell on YoteMarket</Link></li>
                <li><Link to="/marketers">Marketer program</Link></li>
                <li><Link to="/rider">Ride with us</Link></li>
                <li><Link to="/pricing">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4>Get the app</h4>
              <ul>
                <li><Link to="/mobile"><i className="fab fa-google-play" style={{ marginRight: '7px' }}></i>Google Play</Link></li>
                <li><Link to="/mobile"><i className="fab fa-apple" style={{ marginRight: '7px' }}></i>App Store</Link></li>
                <li><Link to="/rider"><i className="fas fa-motorcycle" style={{ marginRight: '7px' }}></i>Ride with us</Link></li>
              </ul>
            </div>
          </div>
          <div className="foot-bar">
            <span className="cr">© 2026 YoteMarket Limited — Shop Local. Delivered Fast.</span>
            <div className="socials">
              <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
              <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
              <a href="#" aria-label="WhatsApp"><i className="fab fa-whatsapp"></i></a>
              <a href="#" aria-label="X"><i className="fab fa-x-twitter"></i></a>
            </div>
            <Link className="staff-btn" to="/staff"><i className="fas fa-lock"></i> Staff login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default HomePage;
