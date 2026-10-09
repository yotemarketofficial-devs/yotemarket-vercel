import { Link } from 'react-router-dom';
import { APPS } from '../lib/apk-releases.mjs';
import PageHero from '../components/PageHero.jsx';
import YoteAiMark from '../components/YoteAiMark.jsx';
import YoteFeedMark from '../components/YoteFeedMark.jsx';
import { Icon, GooglePlayIcon, AppleIcon } from '../components/LineIcon.jsx';
import phones from '../assets/pages/mobile-phones.webp';
import phones2x from '../assets/pages/mobile-phones@2x.webp';
import feedStill from '../assets/home/feed-handbag.webp';
import mpesaLogo from '../assets/pages/mpesa-logo.png';
import '../styles/pages.css';

/* /mobile — the shopping app, laid out to the 2026-10-09 mobile board: hero with two
   phones, three steps, four feature cards and a closing band.
   The board promised what the app doesn't do, so those lines say what it does instead:
   there is no live delivery tracking and no door delivery (an order is collected with a
   one-time code), hub carriage is paused, there are not "thousands" of shops, and
   payment is M‑Pesa. Its "Live Delivery Tracking" and "Pickup Hubs" cards became
   Chat & negotiate and YoteAI, which the app has. */

const SHOPPER = APPS.find((a) => a.slug === 'shopper');

const STEPS = [
  { icon: 'search', title: 'Browse local shops', text: 'Explore Kenyan shops and their products by category, from fashion to electronics and home essentials.' },
  { icon: 'chat', title: 'Chat & pay securely', text: 'Message sellers, agree a price, then pay with M‑Pesa — held in escrow until you collect.' },
  { icon: 'store', title: 'Collect your order', text: 'Pick it up at the store with your one-time collection code. No code, no handover.' },
];

function MpesaPhone() {
  return (
    <div className="mb-mini mb-mpesa" aria-hidden="true">
      <img className="mb-mpesa-logo" src={mpesaLogo} alt="" width="480" height="141" loading="lazy" decoding="async" />
      <span className="mb-mpesa-ok"><Icon name="check" /></span>
      <span className="mb-mpesa-l">Payment held in escrow</span>
      <span className="mb-mpesa-amt">Ksh 2,850</span>
    </div>
  );
}

function ChatMini() {
  return (
    <div className="mb-mini mb-chat" aria-hidden="true">
      <span className="mb-bub is-in">Is this still Ksh 1,500?</span>
      <span className="mb-bub is-out">For you, Ksh 1,350 🙂</span>
      <span className="mb-bub is-offer"><Icon name="tag" /> Offer accepted</span>
    </div>
  );
}

function AiMini() {
  return (
    <div className="mb-mini mb-ai" aria-hidden="true">
      <span className="mb-ai-q"><YoteAiMark size={16} /> Wireless earbuds under Ksh 3,000?</span>
      <span className="mb-ai-a"><span className="mb-ai-dot" />3 matches in local stores</span>
    </div>
  );
}

const FEATURES = [
  { mark: <YoteFeedMark size={22} />, title: 'YoteFeed', sub: 'Shoppable videos', text: 'Discover products from local sellers through short videos. Tap Buy on a tagged product to add it to your cart.',
    art: <img className="mb-feed" src={feedStill} alt="" loading="lazy" decoding="async" /> },
  { icon: 'wallet', green: true, title: 'M‑Pesa checkout', sub: 'Safe & simple payments', text: 'Pay with M‑Pesa. Your money is held in escrow until you collect your order.', art: <MpesaPhone /> },
  { icon: 'chat', title: 'Chat & negotiate', sub: 'Talk to the seller', text: 'Ask questions, send offers and agree a price in the app messenger before you pay.', art: <ChatMini /> },
  { mark: <YoteAiMark size={22} />, title: 'YoteAI', sub: 'Your shopping assistant', text: 'Ask for what you need in your own words and YoteAI finds it in local stores.', art: <AiMini /> },
];

function StoreBadges() {
  return (
    <div className="badges mb-badges">
      {SHOPPER?.playUrl ? (
        <a className="store" href={SHOPPER.playUrl} target="_blank" rel="noreferrer">
          <GooglePlayIcon />
          <span className="st"><small>GET IT ON</small><b>Google Play</b></span>
        </a>
      ) : (
        <span className="store is-soon" aria-label="Google Play — coming soon">
          <GooglePlayIcon />
          <span className="st"><small>COMING SOON TO</small><b>Google Play</b></span>
        </span>
      )}
      <span className="store is-soon" aria-label="App Store — coming soon">
        <AppleIcon />
        <span className="st"><small>COMING SOON TO</small><b>App Store</b></span>
      </span>
    </div>
  );
}

function MobilePage() {
  return (
    <main className="pg mobile">
      <PageHero
        className="mb-hero"
        pill={{ icon: 'phone', text: 'Shop local · Support Kenyan businesses' }}
        title={<>The YoteMarket<br /><span className="g">shopping app</span></>}
        lead="Discover and shop from local Kenyan stores right from your phone. Chat with sellers, negotiate prices, pay with M‑Pesa and collect your order with a one-time code — all in one app."
        actions={<>
          <Link className="ph-btn" to="/apk"><Icon name="download" /> Get the app</Link>
          <Link className="ph-btn is-ghost" to="/storefront"><Icon name="store" /> Explore shops</Link>
        </>}
        art={{
          node: <img className="mb-art" src={phones} srcSet={`${phones} 865w, ${phones2x} 1730w`} sizes="(max-width: 1100px) 92vw, 54vw"
            width="865" height="510" decoding="async" fetchPriority="high"
            alt="The YoteMarket app on two phones: the home screen with categories and popular shops, and a store page with its products" />,
        }}
      >
        <StoreBadges />
      </PageHero>

      <section className="pg-sec is-soft mb-steps-sec">
        <div className="pg-wrap">
          <ol className="mb-steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="mb-step-ic"><Icon name={s.icon} /><b>{i + 1}</b></span>
                <div>
                  <h2>{s.title}</h2>
                  <p>{s.text}</p>
                </div>
                {i < STEPS.length - 1 && <Icon name="arrow" className="mb-step-arrow" />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pg-sec">
        <div className="pg-wrap">
          <div className="mb-feats">
            {FEATURES.map((f) => (
              <article className="pg-card mb-feat" key={f.title}>
                <div className="mb-feat-copy">
                  <div className="mb-feat-head">
                    <span className={'pg-ic is-sm' + (f.green ? ' is-mpesa' : '')}>{f.mark || <Icon name={f.icon} />}</span>
                    <div><h3>{f.title}</h3><span>{f.sub}</span></div>
                  </div>
                  <p>{f.text}</p>
                </div>
                <div className="mb-feat-art">{f.art}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pg-sec mb-close-sec">
        <div className="pg-wrap">
          <div className="pg-band mb-close">
            <div className="mb-close-brand">
              <img src="/assets/logo-white.png" alt="YoteMarket" width="953" height="368" />
              <span>Local shops. Real opportunities.</span>
            </div>
            <div className="mb-close-copy">
              <h2>Shop local. <span className="g">Delivered</span> fast.</h2>
              <p>Support Kenyan businesses <i>•</i> Chat &amp; negotiate <i>•</i> All in one app</p>
            </div>
            <div className="mb-close-cta">
              <Link className="pg-btn is-white" to="/apk"><Icon name="download" /> Get the app</Link>
              <Link className="pg-btn is-ghost mb-ghost-light" to="/storefront">Explore shops</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default MobilePage;
