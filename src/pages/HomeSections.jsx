// The homepage's YoteAI, YoteFeed and "Get the apps" bands, laid out to the brand
// reference board of 2026-10-08: a pill tag, a two-tone headline, a product-window card
// with a result card over it, icon-card lists, numbered steps, a fan of phones, a "Have
// a store?" card, handwritten notes, a feature list and the shopper photo. The board is
// green and orange; the site's purple and gold replace them, in light and dark.
//
// The board's words were NOT carried over where the product doesn't back them: YoteAI
// does not write listings from a photo, write SEO titles or track orders; YoteFeed checkout
// is the normal cart; there is no iOS app and no door delivery. Every line below is one
// the product makes good on (storefront engage.jsx, feed.jsx, commerce.jsx; dashboard
// extras.jsx, feedmgr.jsx). Keep it that way when editing the copy.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import YoteAiMark from '../components/YoteAiMark.jsx';
import YoteFeedMark from '../components/YoteFeedMark.jsx';
import PhoneMockup from '../components/PhoneMockup.jsx';
import UptodownBadge from '../components/UptodownBadge.jsx';
import { APPS } from '../lib/apk-releases.mjs';
// Cut from the reference board, recoloured to the brand and upscaled (see CLAUDE.md).
import shopperArt from '../assets/home/shopper.webp';
import stillSneaker from '../assets/home/feed-sneaker.webp';
import stillKitchen from '../assets/home/feed-kitchen.webp';
import stillBackpack from '../assets/home/feed-backpack.webp';
import stillLiving from '../assets/home/feed-living.webp';
import '../styles/home-sections.css';

const SHOPPER_APP = APPS.find((a) => a.slug === 'shopper');
const RIDER_APP = APPS.find((a) => a.slug === 'rider');

/* Line icons, 24-unit grid, stroked in currentColor (no icon font: these render even
   when the Font Awesome CDN is slow or blocked). */
const ICONS = {
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></>,
  scale: <><path d="M12 3.5v17M7 20.5h10M5 7.5h14M12 5.5V3.5" /><path d="m5 7.5-3 6.5a3 3 0 0 0 6 0zM19 7.5l-3 6.5a3 3 0 0 0 6 0z" /></>,
  gift: <><rect x="3.5" y="8.5" width="17" height="4" rx="1" /><path d="M5 12.5v8h14v-8M12 8.5v12" /><path d="M12 8.5c-1.5-3.8-6.2-4.4-6.2-1.5 0 1.3 1.6 1.5 6.2 1.5zM12 8.5c1.5-3.8 6.2-4.4 6.2-1.5 0 1.3-1.6 1.5-6.2 1.5z" /></>,
  tag: <><path d="M3.5 12.3V4.8a1.3 1.3 0 0 1 1.3-1.3h7.5l8.2 8.2a1.3 1.3 0 0 1 0 1.8l-7.5 7.5a1.3 1.3 0 0 1-1.8 0z" /><circle cx="8.2" cy="8.2" r="1.4" /></>,
  store: <><path d="M3 9.5V7.6L5.2 3h13.6L21 7.6v1.9a2.6 2.6 0 0 1-4.5 1.7 2.6 2.6 0 0 1-4.5 0 2.6 2.6 0 0 1-4.5 0A2.6 2.6 0 0 1 3 9.5z" /><path d="M4.5 12v8.5h15V12M9.5 20.5v-5h5v5" /></>,
  play: <><circle cx="12" cy="12" r="8.5" /><path d="M10 8.6v6.8l5.4-3.4z" /></>,
  tap: <><path d="M9 11.5V5.2a1.7 1.7 0 0 1 3.4 0v5.3" /><path d="M12.4 10.2a1.7 1.7 0 0 1 3.4 0v1.3a1.7 1.7 0 0 1 3.4 0v3.8a5.7 5.7 0 0 1-5.7 5.7h-1.2a5.8 5.8 0 0 1-4.6-2.3l-2.9-3.9a1.6 1.6 0 0 1 2.5-2l1.7 1.9" /></>,
  bag: <><path d="M5.5 8h13l-1 12.5h-11z" /><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" /></>,
  chat: <><path d="M20.5 15.5a2 2 0 0 1-2 2H8l-4.5 3.5V5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" strokeWidth="2.6" /></>,
  shield: <><path d="M12 3 4.5 6v5.6c0 4.5 3.1 8 7.5 9.4 4.4-1.4 7.5-4.9 7.5-9.4V6z" /><path d="m8.8 12.2 2.3 2.3 4.3-4.6" /></>,
  pin: <><path d="M12 21s-6.5-6.1-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.9 12 21 12 21z" /><circle cx="12" cy="9.8" r="2.4" /></>,
  arrow: <path d="M4.5 12h15M13 5.5l6.5 6.5-6.5 6.5" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />,
};

function Icon({ name, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  );
}

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
                {/* No App Store badge: there is no iOS app. Google Play shows once the listing
                    exists (playUrl in apk-releases.mjs); until then the APK badge is the way in. */}
                {SHOPPER_APP.playUrl ? (
                  <a className="store" href={SHOPPER_APP.playUrl} target="_blank" rel="noreferrer">
                    <i className="fab fa-google-play"></i>
                    <span className="st"><small>GET IT ON</small><b>Google Play</b></span>
                  </a>
                ) : null}
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
              <img src={shopperArt} alt="A smiling shopper browsing YoteMarket on her phone, carrying shopping bags"
                width="640" height="786" loading="lazy" decoding="async" />
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
