import { useEffect, useState } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import YoteAiMark from '../components/YoteAiMark.jsx';
import YoteFeedMark from '../components/YoteFeedMark.jsx';
import { SOCIAL_LINKS } from '../lib/socials.js';
import '../styles/home-hero.css';
import { YoteAiSection, YoteFeedSection, AppsSection } from './HomeSections.jsx';
// Imported, not referenced from public/, so Vite fingerprints the file names: every
// change to the art gets a new URL. A fixed name sat in browsers' caches for up to an
// hour (plus a week of stale-while-revalidate, see vercel.json), so edits didn't show.
import heroArtLight from '../assets/hero/hero-art.webp';
import heroArtLight2x from '../assets/hero/hero-art-2x.webp';
import heroArtDark from '../assets/hero/hero-art-dark.webp';

// The art's width on screen, mirroring home-hero.css: the art column is 59% of the hero
// (which stops at 1536px) and, once the hero stacks at 1100px, the full width up to 820px.
// The browser uses it to pick the 906px or the 1812px light file for the screen's density.
// 1535, not 1536: at 1536 59vw is 906.24px, a hair over the 906px file, which would send
// every 1x desktop at that width to the 2x file.
const HERO_ART_SIZES = '(max-width: 820px) 100vw, (max-width: 1100px) 820px, (max-width: 1535px) 59vw, 906px';

const SHOPPER_FEATURES = [
  { icon: 'fa-store', tint: 'linear-gradient(135deg,#7C2BD4,#A020F0)', title: 'The whole mall, by category', desc: 'Browse hundreds of local stores by category and subcategory — just like walking a real mall.' },
  { icon: 'fa-comments', tint: 'linear-gradient(135deg,#3b82f6,#2563eb)', title: 'Chat & negotiate', desc: 'Message sellers, agree a price in the app messenger, then pay — no jumping to other apps.' },
  { icon: 'fa-shield-halved', tint: 'linear-gradient(135deg,#009B3A,#057a30)', title: 'M-Pesa wallet & escrow', desc: 'Top up, pay with M-Pesa, and your money stays in escrow until your order arrives.' },
  { icon: 'fa-warehouse', tint: 'linear-gradient(135deg,#E89B0C,#F4B530)', title: 'Pickup hubs near you', desc: 'Collect at your nearest neighbourhood hub, or have it delivered to your door.' },
  { mark: 'ai', tint: 'linear-gradient(135deg,#A020F0,#E89B0C)', title: 'Ask YoteAI', desc: 'Your shopping assistant — find products, compare options, and track orders just by asking.' },
  { mark: 'feed', tint: 'linear-gradient(135deg,#ec4899,#f43f5e)', title: 'Watch & shop on YoteFeed', desc: 'Short videos from real local stores — see products in action and tap to buy the exact item on screen.' },
];

// The YoteAI / YoteFeed brand marks (not generic icons) wherever the brand appears.
function FeatureIcon({ f }) {
  if (f.mark === 'ai') return <div className="mfeat-ic" style={{ background: f.tint }}><YoteAiMark size={24} color="#fff" /></div>;
  if (f.mark === 'feed') return <div className="mfeat-ic mfeat-ic-brand"><YoteFeedMark size={22} /></div>;
  return <div className="mfeat-ic" style={{ background: f.tint }}><i className={`fas ${f.icon}`}></i></div>;
}

const MERCHANT_FEATURES = [
  { icon: 'fa-store', tint: 'linear-gradient(135deg,#7C2BD4,#A020F0)', title: 'Branded storefront', desc: 'Your own shopfront in the mall — products, photos and reviews, live in minutes.' },
  { icon: 'fa-id-card', tint: 'linear-gradient(135deg,#5B16A8,#7C2BD4)', title: 'Subscriptions, no commission', desc: 'Flat monthly plans from Ksh 500 — software only, or add hub deliveries. Keep 100% of every sale — we never take a cut.' },
  { mark: 'ai', tint: 'linear-gradient(135deg,#A020F0,#E89B0C)', title: 'YoteAI merchant tools', desc: 'AI writes your product listings, surfaces demand insights, and answers shopper questions for you.' },
  { icon: 'fa-comments', tint: 'linear-gradient(135deg,#3b82f6,#2563eb)', title: 'In-app messenger', desc: 'Chat and negotiate with buyers inside the app — agree a price, then get paid through escrow.' },
  { icon: 'fa-wallet', tint: 'linear-gradient(135deg,#009B3A,#057a30)', title: 'Wallet & M-Pesa payouts', desc: 'Track earnings and withdraw to M-Pesa or your Paybill on demand. Funds are escrow-protected.' },
  { icon: 'fa-chart-line', tint: 'linear-gradient(135deg,#E89B0C,#F4B530)', title: 'Demand insights', desc: 'See what shoppers search for and which products trend in your area — and stock the winners.' },
  { icon: 'fa-cash-register', tint: 'linear-gradient(135deg,#0d9488,#14b8a6)', title: 'Point of sale (POS)', desc: 'Sell in-store and online from one till — stock, receipts and KRA invoices stay in sync.' },
  { mark: 'feed', tint: 'linear-gradient(135deg,#ec4899,#f43f5e)', title: 'YoteFeed shoppable video', desc: 'Post short clips to your store and the feed — shoppers watch and tap to buy on the spot.' },
  { icon: 'fa-handshake', tint: 'linear-gradient(135deg,#0ea5e9,#6366f1)', title: 'AI Deal Assist', desc: 'In chat, YoteAI sees what a shopper has in their cart from your store and suggests the right price to close the sale.' },
  { icon: 'fa-layer-group', tint: 'linear-gradient(135deg,#5B16A8,#A020F0)', title: 'Manage multiple stores', desc: 'Enterprise businesses run several storefronts from one account — manage your whole portfolio in one place.' },
  { icon: 'fa-crown', tint: 'linear-gradient(135deg,#E89B0C,#F4B530)', title: 'Grow to a Top Brand', desc: 'Enterprise storefronts earn premium “Top brands” placement across the mall and search.' },
];

/* Hero line icons, 24-unit grid, drawn with currentColor so CSS sets the purple. */
const HX_ICONS = {
  store: (
    <>
      <path d="M3 9.5V7.6L5.2 3h13.6L21 7.6v1.9a2.6 2.6 0 0 1-4.5 1.7 2.6 2.6 0 0 1-4.5 0 2.6 2.6 0 0 1-4.5 0A2.6 2.6 0 0 1 3 9.5z" />
      <path d="M8 3.2 7 7.8M12 3v4.8M16 3.2l1 4.6M3.4 7.8h17.2" />
      <path d="M4.5 12v8.5h15V12" />
      <path d="M9.5 20.5v-5h5v5" />
    </>
  ),
  truck: (
    <>
      <path d="M14 17.5V6.5a1.5 1.5 0 0 0-1.5-1.5h-9A1.5 1.5 0 0 0 2 6.5v9.5a1.5 1.5 0 0 0 1.5 1.5H5" />
      <path d="M14 8.5h3.6a1.5 1.5 0 0 1 1.2.6l2.9 3.8a1.5 1.5 0 0 1 .3.9v2.2a1.5 1.5 0 0 1-1.5 1.5H19M9.5 17.5H14" />
      <circle cx="7.2" cy="17.6" r="2.2" />
      <circle cx="16.8" cy="17.6" r="2.2" />
    </>
  ),
  mpesa: (
    <>
      <rect x="5.5" y="2" width="13" height="20" rx="2.6" />
      <path d="M10.5 18.5h3" />
      <path d="M14.4 8.6a3 3 0 1 0 0 4.2M10.4 10.7h5" />
    </>
  ),
  chat: (
    <>
      <path d="M20.5 15.5a2 2 0 0 1-2 2H8l-4.5 3.5V5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
      <path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" strokeWidth="2.6" />
    </>
  ),
  arrow: <path d="M4.5 12h15M13 5.5l6.5 6.5-6.5 6.5" />,
};

function HxIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" focusable="false">
      {HX_ICONS[name]}
    </svg>
  );
}

const HERO_FEATURES = [
  { icon: 'store', top: '200+', bottom: 'Local Stores' },
  { icon: 'truck', top: 'Nationwide', bottom: 'Delivery' },
  { icon: 'mpesa', top: 'M-Pesa', bottom: 'Checkout' },
  { icon: 'chat', top: 'Chat &', bottom: 'Negotiate' },
  { icon: 'feed', top: 'YoteFeed', bottom: 'Videos' },
  { icon: 'ai', top: 'YoteAI', bottom: 'Assistant' },
];

function HomePage() {
  // Real YoteFeed clips for the landing demo (was three blank gradient mockups).
  // Only the newest few; egress is the real cost on KE mobile data — see FeedFan in HomeSections.jsx.
  const [clips, setClips] = useState([]);
  // lib/feed.js reaches Firestore, so importing it at the top of this page put the whole
  // 199 KB Firebase SDK on the homepage's critical path — for a decorative band far below
  // the fold. Loaded after mount instead; the fan shows its stills until it arrives,
  // which is the same thing it already did before any merchant had posted.
  const [feedMod, setFeedMod] = useState(null);
  useEffect(() => {
    let off = null;
    let cancelled = false;
    import('../lib/feed.js').then((m) => {
      if (cancelled) return;
      setFeedMod(m);
      off = m.subscribeFeed((rows) => setClips(rows.slice(0, 4)), 12);
    }).catch(() => { /* band keeps its placeholders */ });
    return () => { cancelled = true; if (off) off(); };
  }, []);

  // Reveal-on-scroll: elements tagged `.reveal` fade/slide in as they enter view
  // (and immediately for anything already on-screen, e.g. the hero). CSS handles
  // prefers-reduced-motion; this just toggles the `.in` class.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal'));
    if (!els.length) return undefined;
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return undefined; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  // Links to a homepage section (/#roles, /#download, …) land on it. The router doesn't
  // scroll to hashes, and ScrollToTop sends a cross-page visit to the top first — this
  // effect runs after it. location.key changes on every click, so a repeat click still scrolls.
  const location = useLocation();
  useEffect(() => {
    if (!location.hash) return undefined;
    const el = document.getElementById(location.hash.slice(1));
    if (!el) return undefined;
    const go = () => el.scrollIntoView({ block: 'start' });
    go();
    // If the link was tapped in the mobile menu, the menu is still collapsing (.28s) and
    // shrinking the sticky header above us, which moves the target — land on it again.
    const t = setTimeout(go, 320);
    return () => clearTimeout(t);
  }, [location.key, location.hash]);

  // Layout owns the theme. Dark mode has its own hero art, a night scene (see home-hero.css).
  const { dark } = useOutletContext() || {};

  return (
    <main>
      {/* Hero — laid out to the brand mockup, worded in the brand's own voice ("Shop
          local. Delivered fast."). The copy, feature row and buttons are live HTML;
          the right-hand composition (phone, store/M-Pesa/YoteFeed/YoteAI cards,
          ribbon, rider, Nairobi skyline) is ONE image cut from that mockup, because
          its pieces overlap each other and the photo too much to rebuild as layers
          without it drifting from the design. Swap the file to update the art. */}
      <header id="top" className="hx">
        <div className="hx-in">
          <div className="hx-copy">
            <span className="hx-eyebrow">Kenya&rsquo;s Virtual Mall</span>
            <h1 className="hx-title">
              Shop local.<br />
              <span className="g">Delivered</span> fast.
            </h1>
            <p className="hx-lead">
              YoteMarket combines a virtual mall, merchant tools, and last-mile delivery into one ecosystem.
              Buy, sell, chat &amp; negotiate in the app messenger, and pay with M-Pesa.
            </p>
            <ul className="hx-feats">
              {HERO_FEATURES.map((f) => (
                <li key={f.icon}>
                  {/* YoteAI and YoteFeed get their brand marks, never generic icons (see FeatureIcon). */}
                  {f.icon === 'ai' ? <YoteAiMark size={31} /> : f.icon === 'feed' ? <YoteFeedMark size={24} /> : <HxIcon name={f.icon} />}
                  <span>{f.top}<br />{f.bottom}</span>
                </li>
              ))}
            </ul>
            <div className="hx-cta">
              <Link className="hx-btn hx-btn-primary" to="/storefront">
                Start shopping <HxIcon name="arrow" />
              </Link>
              <Link className="hx-btn hx-btn-ghost" to="/dashboard">
                Become a seller
              </Link>
            </div>
          </div>
          <div className="hx-art">
            <img
              src={dark ? heroArtDark : heroArtLight}
              srcSet={dark ? `${heroArtDark} 1536w` : `${heroArtLight} 906w, ${heroArtLight2x} 1812w`}
              sizes={HERO_ART_SIZES}
              width={dark ? 1536 : 906}
              height={dark ? 1024 : 744}
              fetchPriority="high"
              decoding="async"
              alt="The YoteMarket app open on a phone, with 200+ local stores, an M-Pesa payment confirmation, YoteFeed shoppable videos, the YoteAI assistant and a YoteMarket delivery rider in Nairobi"
            />
          </div>
        </div>
      </header>

      <section className="pad" id="roles">
        <div className="wrap">
          <div className="sec-head hx-why reveal">
            <div className="kicker">One platform · every role</div>
            <h2>Whoever you are, there's a place for you</h2>
            <p>
              Shoppers, merchants, marketers and riders each get a dedicated space — built on one shared design system.
            </p>
          </div>
          <div className="cards">
            <Link className="card reveal" style={{ '--rd': '0ms' }} to="/storefront">
              <div className="tile" style={{ background: 'linear-gradient(135deg,#7C2BD4,#A020F0)' }}>
                <i className="fas fa-bag-shopping"></i>
              </div>
              <h3>Shop the mall</h3>
              <p>
                Browse hundreds of local stores like a physical mall, chat with sellers in the app messenger, and check out with M-Pesa.
              </p>
              <span className="go">Enter storefront <i className="fas fa-arrow-right arrow"></i></span>
            </Link>
            <Link className="card reveal" style={{ '--rd': '90ms' }} to="/dashboard">
              <div className="tile" style={{ background: '#4338CA' }}>
                <i className="fas fa-store"></i>
              </div>
              <h3>Sell &amp; grow</h3>
              <p>
                A branded storefront, product management, AI tools, demand insights, wallet and subscriptions — no sales commission.
              </p>
              <span className="go">Open seller dashboard <i className="fas fa-arrow-right arrow"></i></span>
            </Link>
            <Link className="card reveal" style={{ '--rd': '180ms' }} to="/marketers">
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

      {/* shopper features — the new consumer experience */}
      <section className="pad" id="shop" style={{ paddingTop: '8px' }}>
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="kicker">For shoppers</div>
            <h2>A whole mall in your pocket</h2>
            <p>Discover local stores, buy safely with M-Pesa, and collect nearby — all in a few taps.</p>
          </div>
          <div className="mfeat-grid">
            {SHOPPER_FEATURES.map((f, i) => (
              <article className="mfeat-card reveal" key={f.title} style={{ '--rd': `${i * 60}ms` }}>
                <FeatureIcon f={f} />
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
          <div className="sec-cta">
            <Link className="btn btn-primary btn-lg" to="/storefront">Start shopping <i className="fas fa-arrow-right"></i></Link>
            <span className="sec-cta-note">200+ stores · M-Pesa escrow · pickup hubs across 47 counties</span>
          </div>
        </div>
      </section>

      {/* YoteAI and YoteFeed, laid out to the 2026-10-08 brand board — see HomeSections.jsx. */}
      <YoteAiSection />
      <YoteFeedSection clips={feedMod ? clips : []} videoUrl={feedMod?.feedVideoUrl} />

      {/* merchant features — AI tools + subscription benefits */}
      <section className="pad" id="sell" style={{ paddingTop: '8px' }}>
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="kicker">For merchants</div>
            <h2>Everything you need to sell &amp; grow</h2>
            <p>
              Launch a storefront, reach shoppers across 47 counties, and let AI do the heavy lifting — on a flat monthly plan with no commission.
            </p>
          </div>
          <div className="mfeat-grid">
            {MERCHANT_FEATURES.map((f, i) => (
              <article className="mfeat-card reveal" key={f.title} style={{ '--rd': `${i * 55}ms` }}>
                <FeatureIcon f={f} />
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
          <div className="sec-cta">
            <Link className="btn btn-primary btn-lg" to="/dashboard">Start selling <i className="fas fa-arrow-right"></i></Link>
            <span className="sec-cta-note">From Ksh 500/mo · optional hub deliveries · no commission</span>
          </div>
        </div>
      </section>

      {/* earn with YoteMarket — marketers + riders */}
      <section className="pad" id="earn" style={{ paddingTop: '8px' }}>
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="kicker">Earn with YoteMarket</div>
            <h2>Two ways to make money with us</h2>
            <p>Bring merchants on board, or deliver across town — both pay out to M-Pesa.</p>
          </div>
          <div className="earn-grid">
            <article className="earn-card reveal" style={{ '--rd': '0ms' }}>
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
            <article className="earn-card reveal" style={{ '--rd': '110ms' }}>
              <div className="earn-ic" style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}>
                <i className="fas fa-motorcycle"></i>
              </div>
              <h3>Rider Program</h3>
              <p>Deliver on your own schedule. Pick up delivery runs, drop at hubs, and grow your earnings.</p>
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

      <AppsSection />

      <section className="pad" style={{ paddingTop: '24px' }}>
        <div className="wrap stats">
          <div className="stat reveal" style={{ '--rd': '0ms' }}><div className="v">200+</div><div className="l">Local stores</div></div>
          <div className="stat reveal" style={{ '--rd': '80ms' }}><div className="v">47</div><div className="l">Counties served</div></div>
          <div className="stat reveal" style={{ '--rd': '160ms' }}><div className="v">1,200+</div><div className="l">Active merchants</div></div>
          <div className="stat reveal" style={{ '--rd': '240ms' }}><div className="v">M-Pesa</div><div className="l">Instant checkout</div></div>
        </div>
      </section>

      {/* final CTA band */}
      <section className="pad" style={{ paddingTop: '8px' }}>
        <div className="wrap">
          <div className="cta-band reveal">
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
              <Link to="/" aria-label="YoteMarket home"><img id="footlogo" src="/assets/logo.png" alt="YoteMarket" /></Link>
              <p>
                Kenya's virtual mall — combining commerce, merchant tools, and last-mile delivery into one ecosystem.
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
                <li><Link to="/help">Help Center</Link></li>
                <li><Link to="/help#faqs">FAQs</Link></li>
                <li><Link to="/terms">Terms of Service</Link></li>
                <li><Link to="/privacy">Privacy Policy</Link></li>
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
                <li><Link to="/apk"><i className="fab fa-android" style={{ marginRight: '7px' }}></i>Download APK</Link></li>
                <li><Link to="/rider"><i className="fas fa-motorcycle" style={{ marginRight: '7px' }}></i>Ride with us</Link></li>
              </ul>
            </div>
          </div>
          <div className="foot-bar">
            <span className="cr">© 2026 Yote Market Limited — Shop Local. Delivered Fast.</span>
            <div className="socials">
              {SOCIAL_LINKS.map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noreferrer" aria-label={s.label}><i className={`fab ${s.icon}`}></i></a>
              ))}
            </div>
            <Link className="staff-btn" to="/staff"><i className="fas fa-lock"></i> Staff login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default HomePage;
