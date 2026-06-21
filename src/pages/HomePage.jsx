import { Link } from 'react-router-dom';

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
              Buy, sell, negotiate over WhatsApp, and pay with M-Pesa.
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
                <i className="fab fa-whatsapp"></i>
                Negotiate via WhatsApp
              </span>
              <span className="mini">
                <i className="fas fa-mobile-alt"></i>
                M-Pesa checkout
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="pad" id="roles">
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">One platform · every role</div>
            <h2>Whoever you are, there's a place for you</h2>
            <p>
              Shoppers, merchants, and marketers each get a dedicated space — built on one shared design system.
            </p>
          </div>
          <div className="cards">
            <Link className="card" to="/storefront">
              <div className="tile" style={{ background: 'linear-gradient(135deg,#7C2BD4,#A020F0)' }}>
                <i className="fas fa-bag-shopping"></i>
              </div>
              <h3>Shop the mall</h3>
              <p>
                Browse hundreds of local stores like a physical mall, negotiate over WhatsApp, and check out with M-Pesa.
              </p>
              <span className="go">Enter storefront <i className="fas fa-arrow-right arrow"></i></span>
            </Link>
            <Link className="card" to="/dashboard">
              <div className="tile" style={{ background: '#4338CA' }}>
                <i className="fas fa-store"></i>
              </div>
              <h3>Sell & grow</h3>
              <p>
                A branded storefront, product management, demand insights, wallet, and subscriptions — from Ksh 500/mo.
              </p>
              <span className="go">Open seller dashboard <i className="fas fa-arrow-right arrow"></i></span>
            </Link>
            <Link className="card" to="/marketers">
              <div className="tile" style={{ background: 'linear-gradient(135deg,#E89B0C,#F4B530)' }}>
                <i className="fas fa-bullhorn"></i>
              </div>
              <h3>Refer & earn</h3>
              <p>
                Refer merchants, stack checkpoints, climb the leaderboard, and cash out to M-Pesa. Top scouts get hired.
              </p>
              <span className="go">Open marketer program <i className="fas fa-arrow-right arrow"></i></span>
            </Link>
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
                <li><a href="#">About us</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4>For business</h4>
              <ul>
                <li><Link to="/dashboard">Sell on YoteMarket</Link></li>
                <li><Link to="/marketers">Marketer program</Link></li>
                <li><a href="#">Pricing</a></li>
                <li><a href="#">Logistics</a></li>
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
