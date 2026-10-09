// The homepage's brand bands: "For shoppers" and "For merchants" (laid out to the brand
// board of 2026-10-08, second sheet), and YoteAI, YoteFeed and "Get the apps" (first
// sheet). Pill tags, two-tone headlines, product windows with cards over them, icon-card
// lists, numbered steps, a fan of phones, handwritten notes and photos. The boards are
// green and orange; the site's purple and gold replace them, in light and dark.
//
// The boards' words were NOT carried over where the product doesn't back them: YoteAI
// does not write listings from a photo, write SEO titles or track orders; there is no
// "demand"/trending data for sellers (Insight reports on the store's own sales, prices and
// stock); YoteFeed checkout is the normal cart and its button says Buy; POS invoices carry
// the KRA PIN but are not eTIMS; there is no door delivery. Every line below
// is one the product makes good on (storefront engage.jsx, feed.jsx, commerce.jsx,
// profile.jsx; dashboard extras.jsx, feedmgr.jsx, pos.jsx, pricing.js; lib/entitlements.js).
// Keep it that way when editing the copy.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import YoteAiMark from '../components/YoteAiMark.jsx';
import YoteFeedMark from '../components/YoteFeedMark.jsx';
import SubscriptionMark from '../components/SubscriptionMark.jsx';
import PhoneMockup from '../components/PhoneMockup.jsx';
import { Icon, GooglePlayIcon, AppleIcon } from '../components/LineIcon.jsx';
import UptodownBadge from '../components/UptodownBadge.jsx';
import { APPS } from '../lib/apk-releases.mjs';
// The shopper and merchant photos were supplied (recoloured to the brand, the real logo
// printed on the bags, apron and boxes); the YoteFeed stills were cut from the boards.
// See CLAUDE.md.
import shopperArt from '../assets/home/shopper.webp';
import forShoppers from '../assets/home/for-shoppers.webp';
import forShoppers2x from '../assets/home/for-shoppers@2x.webp';
import forMerchants from '../assets/home/for-merchants.webp';
import forMerchants2x from '../assets/home/for-merchants@2x.webp';
import stillHandbag from '../assets/home/feed-handbag.webp';
// The eight supplied models (images/20.webp), branded the same way (see CLAUDE.md).
import roleShop from '../assets/home/role-shop.webp';
import roleSell from '../assets/home/role-sell.webp';
import roleEarn from '../assets/home/role-earn.webp';
import roleRide from '../assets/home/role-ride.webp';
import earnScout from '../assets/home/earn-scout.webp';
import earnRider from '../assets/home/earn-rider.webp';
import ctaGroup from '../assets/home/cta-group.webp';
import statStores from '../assets/home/stat-stores.webp';
import statProducts from '../assets/home/stat-products.webp';
import statStall from '../assets/home/stat-stall.webp';
import statShelf from '../assets/home/stat-shelf.webp';
import kenyaMap from '../assets/home/kenya-map.webp';
import kenyaMap2x from '../assets/home/kenya-map@2x.webp';
import stillSneaker from '../assets/home/feed-sneaker.webp';
import stillKitchen from '../assets/home/feed-kitchen.webp';
import stillBackpack from '../assets/home/feed-backpack.webp';
import stillLiving from '../assets/home/feed-living.webp';
import '../styles/home-sections.css';

const SHOPPER_APP = APPS.find((a) => a.slug === 'shopper');
const RIDER_APP = APPS.find((a) => a.slug === 'rider');

const ksh = (n) => 'Ksh\u00a0' + Number(n || 0).toLocaleString('en-KE');
const MPESA = 'M\u2011Pesa';   // non-breaking hyphen: never "M-" / "Pesa"

function useMedia(query) {
  const read = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches;
  const [on, setOn] = useState(read);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const m = window.matchMedia(query);
    const fn = () => setOn(m.matches);
    fn();
    m.addEventListener('change', fn);
    return () => m.removeEventListener('change', fn);
  }, [query]);
  return on;
}

/* ── One platform ───────────────────────────────────────────────────────────────── */

// The four ways in. Each card is one link to that role's own space.
const ROLES = [
  { key: 'shop', icon: 'cart', title: 'Shop', to: '/storefront', img: roleShop, alt: 'A shopper with a YoteMarket bag, browsing on her phone',
    desc: 'Discover local stores, chat with sellers and pay with ' + MPESA + '.' },
  { key: 'sell', icon: 'store', title: 'Sell', to: '/dashboard', img: roleSell, alt: 'A merchant in a YoteMarket apron, working on his laptop',
    desc: 'Open your store and sell on a flat monthly plan.' },
  { key: 'earn', icon: 'megaphone', title: 'Earn', to: '/marketers', img: roleEarn, alt: 'A YoteMarket scout with a megaphone and her phone',
    desc: 'Bring merchants on board and get paid for each one.' },
  { key: 'ride', icon: 'scooter', title: 'Ride', to: '/rider', img: roleRide, alt: 'A YoteMarket rider with his delivery box, giving a thumbs up',
    desc: 'Apply to deliver with YoteMarket on your own time.' },
];

export function RolesSection() {
  return (
    <section className="pad hs-sec" id="roles" aria-labelledby="hs-roles-title">
      <div className="wrap hs-wrap">
        <div className="hs-band hs-band-roles reveal">
          <div className="hs-roles-grid">
            <div className="hs-copy">
              <span className="hs-pill hs-pill-ic"><Icon name="users" />One platform</span>
              <h2 className="hs-title" id="hs-roles-title">Every role. <span className="hs-accent">One platform.</span></h2>
              <p className="hs-lead">
                Shop, sell, promote and deliver, all in one place. YoteMarket connects shoppers, merchants,
                marketers and riders in one ecosystem.
              </p>
            </div>
            <ul className="hs-roles">
              {ROLES.map((r) => (
                <li key={r.key}>
                  <Link className={`hs-role is-${r.key}`} to={r.to}>
                    <span className="hs-role-photo">
                      <img src={r.img} alt={r.alt} loading="lazy" decoding="async" />
                    </span>
                    <span className="hs-role-ic" aria-hidden="true"><Icon name={r.icon} /></span>
                    <span className="hs-role-body">
                      <b>{r.title}</b>
                      <span>{r.desc}</span>
                    </span>
                    <span className="hs-role-go" aria-hidden="true"><Icon name="arrow" /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Earn with YoteMarket ───────────────────────────────────────────────────────── */

function Steps({ steps, label }) {
  return (
    <ol className="hs-psteps" aria-label={label}>
      {steps.map((st, i) => (
        <li key={st.label}>
          {i > 0 ? <Icon name="arrow" className="hs-psteps-arrow" /> : null}
          <span className="hs-psteps-ic"><Icon name={st.icon} /></span>
          <span className="hs-psteps-l">{st.label}</span>
        </li>
      ))}
    </ol>
  );
}

const SCOUT_STEPS = [
  { icon: 'user', label: 'Refer' },
  { icon: 'coins', label: 'Earn' },
  { icon: 'climb', label: 'Climb' },
  { icon: 'briefcase', label: 'Interview' },
];
const RIDER_STEPS = [
  { icon: 'form', label: 'Apply' },
  { icon: 'shield', label: 'Get verified' },
  { icon: 'box', label: 'Deliver' },
  { icon: 'coins', label: 'Earn' },
];

export function EarnSection() {
  return (
    <section className="pad hs-sec" id="earn" aria-labelledby="hs-earn-title">
      <div className="wrap hs-wrap">
        <div className="hs-band hs-band-earn reveal">
          <div className="hs-earn-grid">
            <div className="hs-copy">
              <span className="hs-pill hs-pill-ic is-outline"><Icon name="coins" />Earn with YoteMarket</span>
              <h2 className="hs-title" id="hs-earn-title">More ways<br />to earn with <span className="hs-accent">YoteMarket.</span></h2>
              <p className="hs-lead">
                Turn your network and your time into income. Join the marketer or rider program and get
                paid to {MPESA}.
              </p>
              <Link className="hs-btn" to="/marketers#calculator">Earnings calculator <Icon name="arrow" /></Link>
            </div>

            <article className="hs-prog is-scout">
              <img className="hs-prog-photo" src={earnScout} alt="A YoteMarket scout checking her phone"
                loading="lazy" decoding="async" />
              <div className="hs-prog-body">
                <span className="hs-tag">Marketer program</span>
                <h3>Become a YoteMarket Scout</h3>
                <p>Refer merchants. Get paid for each one you bring.</p>
                <Steps steps={SCOUT_STEPS} label="How the marketer program works" />
                <Link className="hs-btn" to="/marketers">Join the program <Icon name="arrow" /></Link>
              </div>
            </article>

            <article className="hs-prog is-rider">
              <div className="hs-prog-body">
                <span className="hs-tag">Rider program</span>
                <h3>Ride with YoteMarket</h3>
                <p>Deliver on your schedule. Get paid per run.</p>
                <Steps steps={RIDER_STEPS} label="How the rider program works" />
                <Link className="hs-btn" to="/rider">Ride with us <Icon name="arrow" /></Link>
              </div>
              <img className="hs-prog-photo" src={earnRider} alt="A smiling YoteMarket rider on his motorbike, with his delivery box"
                loading="lazy" decoding="async" />
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── A growing Kenyan community ─────────────────────────────────────────────────── */

// A number that counts up from 0 the first time it is seen, then follows the live value.
// With reduced motion it just shows the value.
function CountUp({ value }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(null);
  const calm = useMedia('(prefers-reduced-motion: reduce)');
  const started = useRef(false);
  useEffect(() => {
    if (value == null) return undefined;
    if (calm || started.current) { setShown(value); return undefined; }
    const el = ref.current;
    let raf = 0;
    const run = () => {
      started.current = true;
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 1100);
        setShown(Math.round(value * (1 - (1 - k) ** 3)));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    if (!el || !('IntersectionObserver' in window)) { run(); return () => cancelAnimationFrame(raf); }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); run(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, calm]);
  return <span ref={ref}>{shown == null ? '\u2013' : shown.toLocaleString('en-KE')}</span>;
}

// Filled glyphs for the stat tiles, as the board draws them (24-unit grid).
const SOLID = {
  store: <><path d="M3.2 3.5h17.6l1.7 5.4a3.1 3.1 0 0 1-5.4 2.2 3.3 3.3 0 0 1-5.1.2 3.3 3.3 0 0 1-5.1-.2A3.1 3.1 0 0 1 1.5 8.9z" /><path d="M3.6 12.6a5 5 0 0 0 3.2-.3 5.2 5.2 0 0 0 5.2.6 5.2 5.2 0 0 0 5.2-.6 5 5 0 0 0 3.2.3v7.6a1.3 1.3 0 0 1-1.3 1.3h-3.6v-5.2H8.5v5.2H4.9a1.3 1.3 0 0 1-1.3-1.3z" /></>,
  pin: <path fillRule="evenodd" d="M12 1.8a7.6 7.6 0 0 0-7.6 7.6c0 5.6 7.6 12.8 7.6 12.8s7.6-7.2 7.6-12.8A7.6 7.6 0 0 0 12 1.8zm0 10.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />,
  box: <><path d="M12 1.8 3 6.3l9 4.5 9-4.5z" /><path d="M2 8v9.6l9 4.6v-9.7z" /><path d="M13 12.5v9.7l9-4.6V8z" /></>,
  shield: <path fillRule="evenodd" d="M12 1.8 3.8 5.1v6.1c0 5 3.4 8.9 8.2 10.9 4.8-2 8.2-5.9 8.2-10.9V5.1zm4.4 7.5-5.3 5.6-3.4-3.4 1.4-1.4 2 2 3.9-4.2z" />,
};
const Solid = ({ name }) => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">{SOLID[name]}</svg>;
// The board's little emphasis marks beside the woman and the map.
const Burst = ({ className }) => (
  <svg className={`hs-burst ${className}`} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
    <path d="M24 6 18 15M34 18l-11 2.5M32 31l-9.5-5" />
  </svg>
);

/* `stats` is undefined while loading, null if it can't be read, else the live figures
   from lib/community-live.js. Every number here is counted from the catalogue: a new
   merchant's store adds to it on its own, on every open page. */
export function CommunityStatsSection({ stats }) {
  const failed = stats === null;
  const v = stats || {};
  const cards = [
    { key: 'stores', icon: 'store', value: v.stores, label: v.stores === 1 ? 'Local store' : 'Local stores',
      desc: 'Kenyan businesses selling on YoteMarket.' },
    { key: 'counties', icon: 'pin', value: v.counties, label: v.counties === 1 ? 'County' : 'Counties',
      desc: 'From city centres to county towns.' },
    { key: 'products', icon: 'box', value: v.products, label: v.products === 1 ? 'Product' : 'Products',
      desc: 'More businesses. More choices.' },
  ];
  return (
    <section className="pad hs-sec" id="community" aria-labelledby="hs-com-title">
      <div className="wrap hs-wrap">
        <div className="hs-band hs-band-com reveal">
          <div className="hs-com-grid">
            <div className="hs-copy">
              <span className="hs-pill hs-pill-ic is-outline"><Solid name="shield" />Shop. Sell. Deliver. Earn.</span>
              <h2 className="hs-title" id="hs-com-title">A growing<br />Kenyan community.</h2>
              <svg className="hs-brush" viewBox="0 0 300 22" aria-hidden="true" focusable="false">
                <path d="M6 15c38-6 88-7 124-4" /><path d="M156 12c32-3 82-3 128 1" />
              </svg>
              <p className="hs-lead">
                From local stores to everyday shoppers, YoteMarket is bringing people, businesses and
                opportunities together, across Kenya.
              </p>
              {failed ? null : (
                <p className="hs-live"><span className="hs-live-dot" aria-hidden="true" />Live figures. They go up as each new store joins.</p>
              )}
            </div>
            <ul className="hs-stats">
              {cards.map((c) => (
                <li key={c.key} className={`hs-stat is-${c.key}`}>
                  <span className="hs-stat-ic" aria-hidden="true"><Solid name={c.icon} /></span>
                  {failed ? null : <b className="hs-stat-n" aria-live="polite"><CountUp value={c.value} /></b>}
                  <span className="hs-stat-l">{c.label}</span>
                  <span className="hs-stat-d">{c.desc}</span>
                  <span className="hs-stat-art" aria-hidden="true">
                    {c.key === 'stores' ? (<>
                      <span className="hs-scene is-stall"><img src={statStall} alt="" loading="lazy" decoding="async" /></span>
                      <Burst className="is-stall" />
                      <img className="hs-stat-fig" src={statStores} alt="" loading="lazy" decoding="async" />
                    </>) : null}
                    {c.key === 'counties' ? (<>
                      <span className="hs-map-blob" />
                      <img className="hs-map" src={kenyaMap} srcSet={`${kenyaMap} 420w, ${kenyaMap2x} 840w`} sizes="(max-width: 860px) 70vw, 240px" alt="" loading="lazy" decoding="async" />
                      <Burst className="is-map" />
                    </>) : null}
                    {c.key === 'products' ? (<>
                      <span className="hs-scene is-shelf">
                        <img src={statShelf} alt="" loading="lazy" decoding="async" />
                        <img className="is-mirror" src={statShelf} alt="" loading="lazy" decoding="async" />
                      </span>
                      <img className="hs-stat-fig" src={statProducts} alt="" loading="lazy" decoding="async" />
                      <svg className="hs-trend" viewBox="0 0 64 48" focusable="false"><path d="M4 42 22 24l10 9L58 7" /><path d="M44 6h14v14" /></svg>
                    </>) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── The final call to action ───────────────────────────────────────────────────── */

export function CtaSection() {
  return (
    <section className="pad hs-sec" id="ready" aria-labelledby="hs-cta-title">
      <div className="wrap hs-wrap">
        <div className="hs-band hs-band-cta reveal">
          <div className="hs-cta-grid">
            <div className="hs-copy">
              <img className="hs-cta-logo" src="/assets/logo-white.png" alt="YoteMarket" width="953" height="368" loading="lazy" />
              <h2 className="hs-title" id="hs-cta-title">Ready when you are.</h2>
              <p className="hs-lead">Shop the mall. Open your store.<br />Earn with YoteMarket.</p>
              <div className="hs-cta-acts">
                <Link className="hs-btn is-gold" to="/storefront">Start shopping <Icon name="arrow" /></Link>
                <Link className="hs-btn is-line" to="/dashboard">Start selling <Icon name="arrow" /></Link>
                <Link className="hs-btn is-line" to="/#earn">Earn with us <Icon name="arrow" /></Link>
              </div>
            </div>
            <div className="hs-cta-stage">
              <span className="hs-cta-sun" aria-hidden="true" />
              <img className="hs-cta-group" src={ctaGroup}
                alt="A shopper, a merchant with a parcel, a seller on his phone and a rider: the people of YoteMarket"
                loading="lazy" decoding="async" />
              <svg className="hs-sparks is-cta-l" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{ICONS.sparks}</svg>
              <p className="hs-note is-cta">
                Local businesses.<br />Real people.<br />Fair prices.<Icon name="heart" className="hs-heart" />
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── For shoppers ───────────────────────────────────────────────────────────────── */

// What a shopper can do today. Store pickup with a one-time code is always offered; the
// board's "pickup or delivery" is not (there is no door delivery, and hub carriage can be
// paused), and YoteAI finds products but does not follow orders.
const SHOP_ROWS = [
  { icon: 'store', title: 'Shop local stores', desc: 'Browse local stores by category. Verified sellers carry a badge.' },
  { icon: 'chat', title: 'Chat & negotiate', desc: 'Ask the seller, make an offer, and pay the price you agree.' },
  { icon: 'wallet', title: `${MPESA} & YoteWallet`, desc: `Pay by ${MPESA}, or from a wallet you top up with ${MPESA}.` },
  { icon: 'key', title: 'Collect with a code', desc: 'Pick up your order with a one-time collection code.' },
  { mark: 'ai', title: 'Ask YoteAI', desc: 'Describe what you need and get matching products and stores.' },
];

// The two photo widths, mirroring home-sections.css (the stage's column, and the photo's
// share of it), so a 1x screen never fetches the 2x file.
const SHOP_PHOTO_SIZES = '(max-width: 640px) 62vw, (max-width: 1199px) 280px, 240px';
const SELL_PHOTO_SIZES = '(max-width: 860px) 88vw, (max-width: 1199px) 52vw, 430px';

export function ShoppersSection() {
  return (
    <section className="pad hs-sec" id="shop" aria-labelledby="hs-shop-title">
      <div className="wrap hs-wrap">
        <div className="hs-band hs-band-shop reveal">
          <div className="hs-shop-grid">
            <div className="hs-copy">
              <span className="hs-pill hs-pill-ic"><Icon name="user" />For shoppers</span>
              <h2 className="hs-title" id="hs-shop-title">A whole mall <span className="hs-accent">in your pocket.</span></h2>
              <p className="hs-lead">
                Discover local stores and their products in one place. Chat with the seller, agree a price,
                pay with {MPESA} and collect your order.
              </p>
              <Link className="hs-btn" to="/storefront">Start shopping <Icon name="arrow" /></Link>
            </div>

            <div className="hs-shop-stage">
              <span className="hs-blob" aria-hidden="true" />
              <span className="hs-blob is-soft" aria-hidden="true" />
              <img className="hs-shop-photo" src={forShoppers} srcSet={`${forShoppers} 329w, ${forShoppers2x} 658w`}
                sizes={SHOP_PHOTO_SIZES} width="658" height="968" loading="lazy" decoding="async"
                alt="A smiling shopper browsing YoteMarket on her phone, carrying YoteMarket shopping bags" />
              <svg className="hs-sparks is-shop" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{ICONS.sparks}</svg>
              <p className="hs-note is-shop">
                Local stores.<br />Real people.<br />Make an offer.<Icon name="heart" className="hs-heart" />
              </p>
              <div className="hs-shop-phone">
                {/* The shopper app as it actually looks — see components/PhoneMockup.jsx. */}
                <PhoneMockup app="shopper" />
              </div>
            </div>

            <ul className="hs-rows">
              {SHOP_ROWS.map((r) => (
                <li key={r.title}>
                  <span className="hs-ic is-solid tone-purple">
                    {r.mark === 'ai' ? <YoteAiMark size={20} color="#fff" /> : <Icon name={r.icon} />}
                  </span>
                  <div><b>{r.title}</b><span>{r.desc}</span></div>
                </li>
              ))}
            </ul>

            <div className="hs-feedcard">
              <div className="hs-feedcard-head">
                <span className="feed-badge hs-mark"><YoteFeedMark size={18} /></span>
                <div><b>YoteFeed</b><span>Discover. Watch. Shop.</span></div>
              </div>
              {/* An illustrative clip (a supplied photo), so it opens the feed rather than a product.
                  The real overlay's button says Buy and adds the tagged product to the cart. */}
              <FeedPhone cls="is-card" href="/feed" label="Watch shoppable clips from local stores on YoteFeed"
                name="Leather handbag" price={2999} cta="Buy"
                media={<img className="hs-fp-media" src={stillHandbag} alt="" width="400" height="850" loading="lazy" decoding="async" />} />
              <p className="hs-note is-feedcard">Short videos.<br />Real products.<br />Tap Buy.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── For merchants ──────────────────────────────────────────────────────────────── */

// Plan gates as lib/entitlements.js has them: POS and Insight are Growth and up; YoteAI
// chat, YoteFeed, the wallet and chat are on every plan. Prices from dashboard/pricing.js.
const SELL_CARDS = [
  { icon: 'store', title: 'Branded storefront', desc: 'Your name, logo, cover and products.' },
  { sub: true, title: 'Subscriptions, no commission', desc: `Flat plans from ${ksh(500)} a month.` },
  { mark: 'ai', title: 'YoteAI merchant tools', desc: 'Drafts listing copy from your products.' },
  { icon: 'chat', title: 'In-app messenger', desc: 'Chat with buyers and agree a price.' },
  { icon: 'wallet', title: `Wallet & ${MPESA} payouts`, desc: `Withdraw to ${MPESA} whenever you like.` },
  { icon: 'bulb', title: 'YoteMarket Insight', plan: 'Growth+', desc: 'Sales, pricing and restock reports.' },
  { icon: 'receipt', title: 'POS & stock', plan: 'Growth+', desc: 'One stock in-store and online, with receipts.' },
  { mark: 'feed', title: 'YoteFeed shoppable video', desc: 'Post clips and tag your products.' },
];

// The merchant dashboard as it ships (kits/dashboard/layout.jsx NAV, overview.jsx), with
// its own demo store and figures from dashboard/data.js. A picture of the screen, not a
// claim about anyone's sales, so it is hidden from assistive tech like the phones are.
const DASH_NAV = [
  { icon: 'gauge', label: 'Dashboard' },
  { icon: 'store', label: 'Point of sale' },
  { mark: 'ai', label: 'YoteAI' },
  { icon: 'bulb', label: 'YoteMarket Insight' },
  { icon: 'receipt', label: 'Sales' },
  { icon: 'box', label: 'My Products' },
];
const DASH_WEEK = [12, 18, 14, 22, 28, 31, 26];

function DashWindow() {
  return (
    <div className="hs-dash" aria-hidden="true">
      <div className="hs-dash-top">
        <span className="hs-dash-ava">MK</span>
        <span className="hs-dash-who"><b>Tamasha Electronics</b><small>Owner · Nairobi CBD</small></span>
        <span className="hs-dash-view"><Icon name="store" />View storefront</span>
      </div>
      <div className="hs-dash-body">
        <ul className="hs-dash-nav">
          {DASH_NAV.map((n, i) => (
            <li key={n.label} className={i === 0 ? 'is-on' : undefined}>
              {n.mark === 'ai' ? <YoteAiMark size={11} /> : <Icon name={n.icon} />}<span>{n.label}</span>
            </li>
          ))}
        </ul>
        <div className="hs-dash-main">
          <div className="hs-dash-stat"><small>Revenue</small><b>{'Ksh\u00a0348K'}</b></div>
          <div className="hs-dash-chart">
            <small>Orders this week</small>
            <span className="hs-dash-bars">
              {DASH_WEEK.map((v, i) => <i key={i} style={{ height: `${Math.round((v / 31) * 100)}%` }} />)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// The board's card turned a product photo into a listing; YoteAI doesn't. What it does:
// the dashboard's YoteAI chat writes listing copy from the merchant's own products.
function AiCopyCard() {
  return (
    <div className="hs-aicard" aria-hidden="true">
      <div className="hs-aicard-top">
        <span className="hs-aicard-mark"><YoteAiMark size={13} color="#fff" /></span>
        <b>YoteAI</b>
        <span className="hs-aicard-chip">AI</span>
      </div>
      <h5>Write a product description</h5>
      <p>Ask in chat. YoteAI reads your products and store stats.</p>
      <div className="hs-aicard-prod">
        <span className="hs-aicard-shot"><Icon name="box" /></span>
        <div>
          <b>Wireless Bluetooth Headphones</b>
          <ul>
            <li><Icon name="check" />Catchy description</li>
            <li><Icon name="check" />From your real product</li>
            <li><Icon name="check" />Paste it into your listing</li>
          </ul>
        </div>
      </div>
      <span className="hs-aicard-btn">Ask YoteAI</span>
    </div>
  );
}

export function MerchantsSection() {
  return (
    <section className="pad hs-sec" id="sell" aria-labelledby="hs-sell-title">
      <div className="wrap hs-wrap">
        <div className="hs-band hs-band-sell reveal">
          <div className="hs-sell-grid">
            <div className="hs-copy">
              <span className="hs-pill hs-pill-ic is-line"><Icon name="store" />For merchants</span>
              <h2 className="hs-title" id="hs-sell-title">Everything you need <span className="hs-accent">to sell &amp; grow.</span></h2>
              <p className="hs-lead">
                Get your own branded storefront, {MPESA} checkout and YoteAI, all on a flat monthly plan
                with no commission. Built for Kenyan businesses.
              </p>
              <Link className="hs-btn is-gold" to="/dashboard">Start selling <Icon name="arrow" /></Link>
              <Link className="hs-price" to="/pricing"><Icon name="crown" />From {ksh(500)}/mo · no commission</Link>
            </div>

            <div className="hs-sell-stage">
              <img className="hs-sell-photo" src={forMerchants} srcSet={`${forMerchants} 550w, ${forMerchants2x} 1100w`}
                sizes={SELL_PHOTO_SIZES} width="1100" height="819" loading="lazy" decoding="async"
                alt="A YoteMarket merchant at his counter, holding a YoteMarket parcel and checking his phone" />
              <p className="hs-note is-sell">
                <svg className="hs-scribble" viewBox="0 0 70 44" aria-hidden="true" focusable="false">
                  <path d="M4 40C10 24 28 10 58 8" />
                  <path d="M49 2.5 59 8l-8.5 7.5" />
                </svg>
                Save time.<br />Sell more.
                <svg className="hs-swash" viewBox="0 0 120 14" aria-hidden="true" focusable="false">
                  <path d="M4 11C34 4 72 2 116 5" />
                </svg>
              </p>
              <DashWindow />
              <AiCopyCard />
            </div>

            <ul className="hs-sell-cards">
              {SELL_CARDS.map((c) => (
                <li key={c.title}>
                  <span className={c.mark === 'feed' ? 'hs-sell-ic is-feed' : 'hs-sell-ic'}>
                    {c.mark === 'ai' ? <YoteAiMark size={20} color="#1A1205" />
                      : c.mark === 'feed' ? <YoteFeedMark size={17} />
                        : c.sub ? <SubscriptionMark size={20} color="#1A1205" /> : <Icon name={c.icon} />}
                  </span>
                  <div>
                    <b>{c.title}{c.plan ? <em>{c.plan}</em> : null}</b>
                    <span>{c.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── YoteAI ─────────────────────────────────────────────────────────────────────── */

// What YoteAI does for people, as the storefront and dashboard actually ship it.
const AI_HELPS = [
  { icon: 'search', tone: 'purple', title: 'Find anything', desc: 'Describe it in your own words and get the right products and stores.' },
  { icon: 'scale', tone: 'violet', title: 'Compare & decide', desc: 'Weigh up your options before you buy.' },
  { icon: 'gift', tone: 'gold', title: 'Budget & gift ideas', desc: 'Set a price or an occasion and get picks that fit it.' },
  { icon: 'store', tone: 'pink', title: 'Sellers get it too', desc: 'In the dashboard, YoteAI writes listings, drafts replies to buyers and advises on stock and pricing.' },
];

// After the assistant's own starter prompts (storefront engage.jsx), as the window's sidebar.
const AI_SIDE = [
  { icon: 'search', label: 'Find products' },
  { icon: 'tag', label: 'Best deals' },
  { icon: 'gift', label: 'Gift ideas' },
  { icon: 'store', label: 'Find a store' },
];

function AiWindow() {
  return (
    <div className="hs-aiw" aria-hidden="true">
      <div className="hs-aiw-top">
        <span className="hs-aiw-mark"><YoteAiMark size={17} color="#fff" /></span>
        <b>YoteAI</b>
        <span className="hs-aiw-chip">AI</span>
      </div>
      <div className="hs-aiw-body">
        <ul className="hs-aiw-side">
          {AI_SIDE.map((s, i) => (
            <li key={s.label} className={i === 0 ? 'is-on' : undefined}><Icon name={s.icon} />{s.label}</li>
          ))}
        </ul>
        <div className="hs-aiw-main">
          <h4>Ask in plain words</h4>
          <p>Describe what you need and YoteAI searches the mall for you.</p>
          <div className="hs-aiw-q">{'“A travel backpack under Ksh\u00a04,000”'}</div>
          <div className="hs-aiw-prod">
            <img src={stillBackpack} alt="" width="344" height="536" loading="lazy" decoding="async" />
            <div>
              <b>Travel backpack</b>
              <span>{ksh(3999)}</span>
              <i className="hs-skel" />
            </div>
          </div>
          <span className="hs-aiw-btn">See all picks</span>
        </div>
      </div>
      <div className="hs-aiw-res">
        <h5>YoteAI found 3 picks</h5>
        <ul>
          <li><Icon name="check" />Matched to your words</li>
          <li><Icon name="check" />Within your budget</li>
          <li><Icon name="check" />From local stores</li>
        </ul>
        <div className="hs-aiw-acts"><span>Ask more</span><span className="is-pri">Visit store</span></div>
      </div>
    </div>
  );
}

export function YoteAiSection() {
  return (
    <section className="pad hs-sec" id="yoteai" aria-labelledby="hs-ai-title">
      <div className="wrap hs-wrap">
        <div className="hs-band hs-band-ai reveal">
          <div className="hs-ai-grid">
            <div className="hs-copy">
              <span className="hs-pill">Ask</span>
              <h2 className="hs-title" id="hs-ai-title">
                <span className="hs-brandline"><span className="ai-badge hs-mark"><YoteAiMark size={18} color="#fff" /></span>YoteAI</span>
                Just ask. <span className="hs-accent">We&apos;ll find it.</span>
              </h2>
              <p className="hs-lead">
                Your personal shopping assistant. Describe what you want in plain words and YoteAI points
                you to the right products, stores and deals across the mall.
              </p>
              <Link className="hs-btn" to="/storefront">Ask YoteAI <Icon name="arrow" /></Link>
            </div>
            <AiWindow />
            <div className="hs-helps">
              <h3 className="hs-helps-h">How YoteAI helps you</h3>
              <ul>
                {AI_HELPS.map((h) => (
                  <li key={h.title} className="hs-help">
                    <span className={`hs-ic tone-${h.tone}`}><Icon name={h.icon} /></span>
                    <div><b>{h.title}</b><span>{h.desc}</span></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── YoteFeed ───────────────────────────────────────────────────────────────────── */

const FEED_STEPS = [
  { icon: 'play', title: 'Watch', desc: 'Clips from local stores.' },
  { icon: 'tap', title: 'Tap the product', desc: 'See its price and store.' },
  { icon: 'bag', title: 'Buy in a tap', desc: `Add to cart, pay with ${MPESA}.` },
];

// Shown until merchants' clips load (or if they can't): stills cut from the board, the
// sneaker's maker's mark retouched off. Illustrative, so they link to the feed itself.
const FALLBACK_STILLS = [
  { img: stillSneaker, w: 472, h: 776, name: 'Everyday sneakers', price: 7999 },
  { img: stillKitchen, w: 344, h: 560, name: 'Kitchen essentials', price: 1499 },
  { img: stillBackpack, w: 344, h: 536, name: 'Travel backpack', price: 3999 },
  { img: stillLiving, w: 264, h: 400, name: 'Home decor', price: 3899 },
];

// The fan's slots in visual (and tab) order. The lead item takes the big front slot.
const SLOTS = [{ item: 1, cls: 'is-l' }, { item: 0, cls: 'is-c' }, { item: 2, cls: 'is-r1' }, { item: 3, cls: 'is-r2' }];

function FeedPhone({ cls, href, label, media, name, price, cta }) {
  return (
    <Link to={href} className={`hs-fp ${cls}`} aria-label={label}>
      <div className="ymp-device" aria-hidden="true">
        <div className="ymp-phone">
          <div className="ymp-screen hs-fp-screen">
            {media}
            <div className="hs-fp-shade" />
            <div className="hs-fp-brand"><YoteFeedMark size={14} /><b>YoteFeed</b></div>
            <div className="hs-fp-rail">
              <span className="is-liked"><Icon name="heart" /></span>
              <span><Icon name="chat" /></span>
              <span><Icon name="bag" /></span>
            </div>
            <div className="hs-fp-card">
              <div className="hs-fp-info"><b>{name}</b>{price ? <span>{ksh(price)}</span> : null}</div>
              <span className="hs-fp-shop">{cta}</span>
            </div>
            <span className="ymp-island"></span>
            <span className="ymp-homebar"></span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* Merchants' newest clips when they have loaded; the board's stills until then. As
   before, only the front clip plays (muted, looped) and the rest show their first frame:
   egress is the real cost on Kenyan mobile data. Phones show three, so only three load
   there, and nothing autoplays for visitors who ask for reduced motion. Clips tagged with
   a product come first: only those have a Buy button in the feed, so only those say
   "Shop now". */
function FeedFan({ clips, videoUrl }) {
  const narrow = useMedia('(max-width: 640px)');
  const calm = useMedia('(prefers-reduced-motion: reduce)');
  const live = clips.length > 0 && typeof videoUrl === 'function';
  const ranked = live ? [...clips.filter((c) => c.product), ...clips.filter((c) => !c.product)] : FALLBACK_STILLS;
  const items = ranked.slice(0, narrow ? 3 : 4);
  return (
    <div className="hs-fan">
      {SLOTS.filter((s) => items[s.item]).map(({ item: i, cls }) => {
        const it = items[i];
        if (!live) {
          return (
            <FeedPhone key={i} cls={cls} href="/feed" label="Watch clips from local stores on YoteFeed"
              name={it.name} price={it.price} cta="Shop now"
              media={<img className="hs-fp-media" src={it.img} alt="" width={it.w} height={it.h} loading="lazy" decoding="async" />} />
          );
        }
        const lead = i === 0;
        const tagged = !!it.product;
        const name = (tagged && it.product.name) || it.storeName || 'YoteFeed';
        const price = tagged ? it.product.price : null;
        const label = tagged
          ? `${name}${price ? `, ${ksh(price)}` : ''}: watch on YoteFeed and shop now`
          : `Watch ${it.storeName ? `${it.storeName}'s clip` : 'this clip'} on YoteFeed`;
        return (
          <FeedPhone key={it.id} cls={cls} href={`/feed/${encodeURIComponent(it.id)}`} label={label}
            name={name} price={price} cta={tagged ? 'Shop now' : 'Watch'}
            media={(
              <video className="hs-fp-media" src={videoUrl(it) + (lead && !calm ? '' : '#t=0.1')} poster={it.posterUrl || undefined}
                muted playsInline autoPlay={lead && !calm} loop={lead && !calm} preload={lead && !calm ? 'auto' : 'metadata'}
                tabIndex={-1} />
            )} />
        );
      })}
    </div>
  );
}

export function YoteFeedSection({ clips, videoUrl }) {
  return (
    <section className="pad hs-sec" id="yotefeed" aria-labelledby="hs-feed-title">
      <div className="wrap hs-wrap">
        <div className="hs-band hs-band-feed reveal">
          <div className="hs-feed-grid">
            <div className="hs-copy">
              <span className="hs-pill is-gold">Discover</span>
              <h2 className="hs-title" id="hs-feed-title">
                <span className="hs-brandline"><span className="feed-badge hs-mark"><YoteFeedMark size={18} /></span>YoteFeed</span>
                Watch it. Tap it. <span className="hs-accent">Buy it.</span>
              </h2>
              <p className="hs-lead">
                Shoppable short videos from real local stores. Scroll the feed and see products in action.
                When a clip is tagged with a product, one tap on Buy puts it in your cart.
              </p>
              <ol className="hs-steps">
                {FEED_STEPS.map((s, i) => (
                  <li key={s.title}>
                    <span className="hs-step-top"><span className="hs-step-ic"><Icon name={s.icon} /></span><em>0{i + 1}</em></span>
                    <b>{s.title}</b>
                    <span>{s.desc}</span>
                  </li>
                ))}
              </ol>
              <Link className="hs-link" to="/feed">Open YoteFeed <Icon name="arrow" /></Link>
            </div>
            <FeedFan clips={clips} videoUrl={videoUrl} />
            <div className="hs-feed-side">
              <div className="hs-store">
                <span className="hs-ic tone-gold"><Icon name="store" /></span>
                <h3>Have a store?</h3>
                <p>Post short clips of your products, tag them, and reach shoppers on YoteFeed. It comes with every seller plan.</p>
                <Link className="hs-btn is-gold" to="/dashboard">Post on YoteFeed <Icon name="arrow" /></Link>
              </div>
              <p className="hs-note is-feed">
                <svg className="hs-doodle" viewBox="0 0 64 48" aria-hidden="true" focusable="false">
                  <path d="M6 14l9 4M4 25h10M6 36l9-4" />
                  <path d="M26 10c12-4 30 4 32 14s-18 18-30 14-10-24-2-28z" />
                  <path d="M36 18v13l10-6.5z" />
                </svg>
                Real products.<br />Real people.<br />Real stories.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Get the apps ───────────────────────────────────────────────────────────────── */

// What the shopper app does today. Collection is at a pickup point or the store: there
// is no door delivery, so the board's "Get it delivered" became "Collect nearby".
const APP_FEATURES = [
  { icon: 'store', tone: 'purple', title: 'Shop local', desc: 'Browse Kenyan stores by category.' },
  { mark: 'feed', tone: 'pink', title: 'YoteFeed', desc: 'Discover products through video.' },
  { icon: 'chat', tone: 'violet', title: 'Chat with sellers', desc: 'Ask questions and negotiate a price.' },
  { icon: 'shield', tone: 'gold', title: 'Pay securely', desc: `${MPESA}, with escrow protection.` },
  { icon: 'pin', tone: 'rose', title: 'Collect nearby', desc: 'Pick up at a collection point or the store.' },
];

export function AppsSection() {
  return (
    <section className="pad hs-sec" id="download" aria-labelledby="hs-apps-title">
      <div className="wrap hs-wrap">
        <div className="hs-band hs-band-apps reveal">
          <div className="hs-apps-grid">
            <div className="hs-copy">
              <span className="hs-pill">Shop</span>
              <h2 className="hs-title" id="hs-apps-title">YoteMarket <span className="hs-accent">in your pocket.</span></h2>
              <p className="hs-lead">
                Shop on the go and run your store from the same app. Riding with us? YoteMarket Rider
                brings more stops and more earnings.
              </p>
              <div className="badges hs-badges">
                {/* Both store badges, as the owner wants them (2026-10-08). Google Play goes
                    straight to the listing once playUrl is set in apk-releases.mjs; until then,
                    and for the App Store, they lead to /mobile, as before the redesign. */}
                {SHOPPER_APP.playUrl ? (
                  <a className="store" href={SHOPPER_APP.playUrl} target="_blank" rel="noreferrer">
                    <GooglePlayIcon />
                    <span className="st"><small>GET IT ON</small><b>Google Play</b></span>
                  </a>
                ) : (
                  <Link className="store" to="/mobile">
                    <GooglePlayIcon />
                    <span className="st"><small>GET IT ON</small><b>Google Play</b></span>
                  </Link>
                )}
                <Link className="store" to="/mobile">
                  <AppleIcon />
                  <span className="st"><small>Download on the</small><b>App Store</b></span>
                </Link>
                <UptodownBadge />
              </div>
              <ul className="hs-appchips">
                {[SHOPPER_APP, RIDER_APP].map((a) => (
                  <li key={a.slug}>
                    <img src={a.icon} alt="" width="40" height="40" loading="lazy" />
                    <div><b>{a.name}</b><span>{a.subtitle}</span></div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hs-apps-phone">
              {/* The shopper app as it actually looks — see components/PhoneMockup.jsx. */}
              <PhoneMockup app="shopper" />
            </div>
            <ul className="hs-flist">
              {APP_FEATURES.map((f) => (
                <li key={f.title}>
                  <span className={`hs-ic is-solid tone-${f.tone}`}>
                    {f.mark === 'feed' ? <YoteFeedMark size={15} /> : <Icon name={f.icon} />}
                  </span>
                  <div><b>{f.title}</b><span>{f.desc}</span></div>
                </li>
              ))}
            </ul>
            <figure className="hs-apps-photo">
              {/* The backdrop blocks are drawn behind the cut-out (home-sections.css), so they
                  take the theme's colours. */}
              <span className="hs-apps-shot">
                <img src={shopperArt} alt="A smiling shopper checking YoteMarket on her phone, carrying YoteMarket shopping bags"
                  width="600" height="853" loading="lazy" decoding="async" />
              </span>
              <figcaption className="hs-note is-apps">
                More than a<br />marketplace.
                <Icon name="heart" className="hs-heart" />
              </figcaption>
            </figure>
          </div>
          <div className="hs-eco">
            <div className="hs-eco-txt">
              <h3>The complete YoteMarket ecosystem</h3>
              <p>AI to help you find it. Video to help you discover it. An app to bring it all together.</p>
            </div>
            <ol className="hs-eco-row">
              <li>
                <span className="ai-badge hs-eco-ic"><YoteAiMark size={17} color="#fff" /></span>
                <div><b>YoteAI</b><small>Ask. Find. Decide.</small></div>
              </li>
              <li aria-hidden="true" className="hs-eco-arrow"><Icon name="arrow" /></li>
              <li>
                <span className="feed-badge hs-eco-ic"><YoteFeedMark size={17} /></span>
                <div><b>YoteFeed</b><small>Watch. Tap. Buy.</small></div>
              </li>
              <li aria-hidden="true" className="hs-eco-arrow"><Icon name="arrow" /></li>
              <li>
                <img className="hs-eco-ic" src={SHOPPER_APP.icon} alt="" width="40" height="40" loading="lazy" />
                <div><b>YoteMarket app</b><small>Shop. Chat. Pay. Collect.</small></div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
