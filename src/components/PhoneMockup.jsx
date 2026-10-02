// PhoneMockup — the YoteMarket apps drawn as live HTML inside a device frame, used on
// the landing (both apps) and /mobile (shopper). Pure presentational; styles live in
// styles.css (.ymp-* frame, .yms-* shopper screen, .ymr-* rider screen).
//
// Each screen is a transcription of the real app, not an impression of it:
//   • ShopperScreen — mobile_app's Home tab: screens/home/home_screen.dart,
//     widgets/store_rails.dart, widgets/product_card.dart and the main_shell nav, with
//     the stores and products of its screenshot harness (test/screenshots_test.dart).
//   • RiderScreen — the rider app's Jobs tab as its Play Store listing shows it.
// Sizes in the CSS are the apps' own dp values times --d (one dp of a 390dp-wide
// phone), so a screen scales as one piece with its frame. When an app's UI changes,
// re-transcribe from those same sources rather than restyling by eye.
import YoteAiMark from './YoteAiMark.jsx';
import YoteFeedMark from './YoteFeedMark.jsx';

// A Material Symbols Rounded glyph, by ligature name — the icon set both apps draw
// with. The font is subset to exactly the names used below; a new name needs a
// re-subset (see the @font-face note in styles.css) or it renders as text.
const Sym = ({ n, fill }) => <span className={fill ? 'ymp-sym is-fill' : 'ymp-sym'}>{n}</span>;

// YmShot (widgets/ym_image.dart): a photo-less tile tinted by a hue hashed from the
// store id, so one seller's products share a colour. Same FNV walk as the app, so the
// fixture's ids come out in the colours the app paints them.
function hueFor(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  return h % 360;
}
const tint = (seed) => ({ '--h': hueFor(seed) });

function StatusBar() {
  return (
    <div className="ymp-status">
      <span>9:41</span>
      <span className="ymp-status-r">
        <i className="fas fa-signal"></i>
        <i className="fas fa-wifi"></i>
        <i className="fas fa-battery-full"></i>
      </span>
    </div>
  );
}

/* ───────────────────────────── shopper · Home ───────────────────────────── */

const SHOPPER_UID = 'kJ8sPq2mNvB1xR4tY7wZ';

// Top brands = official stores, four across, no scroll (store_rails.dart).
const BRANDS = [
  { id: 's1', name: 'Sound & Vision', icon: 'speaker', branches: 5 },
  { id: 's137', name: 'Duka Digital', icon: 'smartphone', branches: 4 },
  { id: 's3', name: 'Nyumbani Living', icon: 'chair', branches: 3 },
  { id: 's23', name: 'Mavazi House', icon: 'checkroom', branches: 6 },
];

// Featured stores = verified stores, a rail of 150dp cards fading at the right edge.
const FEATURED = [
  { id: 's2', name: 'Sokoni Crafts', icon: 'shopping_basket', meta: 'Westlands · 86 items', rating: '4.9' },
  { id: 's154', name: 'Green Basket', icon: 'eco', meta: 'Karen · 54 items', rating: '4.7' },
  { id: 's136', name: 'Mama Pima Spices', icon: 'storefront', meta: 'Kilimani · 38 items', rating: '4.8' },
];

const FOR_YOU = [
  { store: 's1', name: 'Portable Bluetooth Speaker', icon: 'speaker', price: '2,650', was: 'Ksh 3,400', off: 22, tag: 'Electronics', tagIcon: 'verified' },
  { store: 's1', name: 'Wireless Earbuds', icon: 'headphones', price: '2,450', was: 'Ksh 3,200', off: 23, tag: 'Negotiable', tagIcon: 'sell' },
];

// Home · Feed · Mall · Chats · Orders — Profile is the header avatar, not a tab.
const SHOPPER_TABS = [
  { label: 'Home', icon: 'home' },
  { label: 'Feed', feed: true },
  { label: 'Mall', icon: 'storefront' },
  { label: 'Chats', icon: 'chat_bubble' },
  { label: 'Orders', icon: 'inventory_2' },
];

function SectionTitle({ title, action }) {
  return (
    <div className="yms-sec">
      <h4>{title}</h4>
      <span>{action}</span>
    </div>
  );
}

export function ShopperScreen() {
  return (
    <div className="ymp-app yms">
      <StatusBar />

      {/* WHO you are on the left, WHAT you can do on the right — no logo, no search. */}
      <div className="yms-head">
        <span className="ymp-shot yms-ava" style={tint(SHOPPER_UID)}><Sym n="person" /></span>
        <span className="yms-who"><b>Grace</b><span>YM-SCVUR53</span></span>
        <span className="yms-ai"><YoteAiMark size={17} color="#2A0E64" /></span>
        <span className="yms-cart">
          <span className="yms-cart-card"><b>2</b><small>Items</small></span>
          <span className="yms-cart-bag"><Sym n="shopping_bag" /></span>
          <span className="yms-cart-dot"></span>
        </span>
      </div>

      <div className="yms-pad"><SectionTitle title="Top brands" action="See all" /></div>
      <div className="yms-brands">
        {BRANDS.map((b) => (
          <div className="yms-brand" key={b.id}>
            <span className="yms-ring">
              <span className="ymp-shot" style={tint(b.id)}><Sym n={b.icon} /></span>
              <span className="yms-official"><Sym n="workspace_premium" fill /></span>
            </span>
            <span className="yms-bname">{b.name}</span>
            <span className="yms-bsub">{b.branches} branches</span>
          </div>
        ))}
      </div>

      <div className="yms-pad"><SectionTitle title="Featured stores" action="See all" /></div>
      <div className="yms-rail">
        {FEATURED.map((s) => (
          <div className="yms-fcard" key={s.id}>
            <span className="ymp-shot yms-flogo" style={tint(s.id)}><Sym n={s.icon} /></span>
            <div className="yms-fbody">
              <b>{s.name}</b>
              <span className="yms-fmeta">{s.meta}</span>
              <div className="yms-ffoot">
                <span className="yms-rate"><Sym n="star" fill />{s.rating}</span>
                <span className="yms-arrow"><Sym n="arrow_forward" /></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="yms-pad yms-pad-wide"><SectionTitle title="For you" action="Browse all" /></div>
      <div className="yms-grid">
        {FOR_YOU.map((p) => (
          <div className="yms-pcard" key={p.name}>
            <span className="ymp-shot yms-pshot" style={tint(p.store)}>
              <Sym n={p.icon} />
              <em>-{p.off}%</em>
            </span>
            <div className="yms-pbody">
              <b>{p.name}</b>
              <span className="yms-tag"><Sym n={p.tagIcon} />{p.tag}</span>
              <div className="yms-pfoot">
                <span className="yms-price"><span>{p.price}<small>KSH</small></span><s>{p.was}</s></span>
                <span className="yms-arrow is-sm"><Sym n="arrow_forward" /></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="yms-nav">
        {SHOPPER_TABS.map((t, i) => (
          <span className={i === 0 ? 'yms-tab is-on' : 'yms-tab'} key={t.label}>
            <span className="yms-tab-ic">{t.feed ? <YoteFeedMark size={17} /> : <Sym n={t.icon} fill={i === 0} />}</span>
            <span className="yms-tab-l">{t.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────── rider · Jobs ─────────────────────────────── */

const RUNS = [
  { icon: 'inventory_2', route: 'Westlands Hub → 4 drops', meta: '6.2 km · approx. 38 min · 4 parcels', pay: '520', chips: [['Batched', 'go'], ['Short range', 'band'], ['Leaves 10 min', 'warn']] },
  { icon: 'local_shipping', route: 'Westlands Hub → Kilimani', meta: '11.4 km · approx. 52 min · 2 parcels', pay: '430', chips: [['Mid range', 'band'], ['Bulk bonus', 'go']] },
  { icon: 'two_wheeler', route: 'Sarit pickup → Parklands', meta: '3.8 km · approx. 21 min · 1 parcel', pay: '260' },
  { icon: 'inventory_2', route: 'Yaya pickup → Lavington', meta: '5.1 km · approx. 26 min · 2 parcels', pay: '310' },
];

const RIDER_TABS = [
  { label: 'Jobs', icon: 'two_wheeler' },
  { label: 'Earnings', icon: 'account_balance_wallet' },
  { label: 'Profile', icon: 'person' },
];

export function RiderScreen() {
  return (
    <div className="ymp-app ymr">
      <div className="ymr-top">
        <StatusBar />
        <div className="ymr-head">
          <span className="ymr-ava">BO</span>
          <span className="ymr-who"><b>Brian Omondi</b><span>Westlands hub · 4.9 ★ · 312 deliveries</span></span>
          <span className="ymr-online"><i></i>Online</span>
        </div>
        <div className="ymr-stats">
          <span><small>Earned today</small><b>Ksh 640</b></span>
          <span><small>Runs done</small><b>4</b></span>
          <span><small>Online</small><b>3h 20m</b></span>
        </div>
      </div>

      <div className="ymr-list">
        <div className="ymr-sec"><b>Available runs near you</b><span>Westlands · live</span></div>
        {RUNS.map((r) => (
          <div className="ymr-run" key={r.route}>
            <div className="ymr-run-row">
              <span className="ymr-run-ic"><Sym n={r.icon} /></span>
              <span className="ymr-run-main"><b>{r.route}</b><span>{r.meta}</span></span>
              <span className="ymr-run-pay"><b>Ksh {r.pay}</b><span>payout</span></span>
              <span className="ymr-chev"><Sym n="chevron_right" /></span>
            </div>
            {r.chips && (
              <div className="ymr-chips">
                {r.chips.map(([label, kind]) => <span className={`ymr-chip is-${kind}`} key={label}>{label}</span>)}
              </div>
            )}
          </div>
        ))}
        <div className="ymr-plan">
          <span className="ymr-plan-ic"><Sym n="calendar_clock" /></span>
          <span className="ymr-run-main"><b>Plan your schedule</b><span>Set your availability and ride more</span></span>
          <span className="ymr-chev"><Sym n="chevron_right" /></span>
        </div>
      </div>

      <div className="ymr-nav">
        {RIDER_TABS.map((t, i) => (
          <span className={i === 0 ? 'ymr-tab is-on' : 'ymr-tab'} key={t.label}>
            <Sym n={t.icon} fill={i === 0} />
            <span>{t.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────── the device ───────────────────────────────── */

const SCREENS = {
  shopper: { Screen: ShopperScreen, label: 'The YoteMarket app: the shopper home screen with top brands, featured stores and products picked for you' },
  rider: { Screen: RiderScreen, label: 'The YoteMarket Rider app: the jobs screen with today’s earnings and delivery runs near the rider' },
};

export default function PhoneMockup({ app = 'shopper', className = '' }) {
  const { Screen, label } = SCREENS[app];
  return (
    <div className={`ymp-device ${className}`.trim()} role="img" aria-label={label}>
      <div className="ymp-phone">
        <div className="ymp-screen">
          <Screen />
          <span className="ymp-island"></span>
          <span className="ymp-homebar"></span>
        </div>
      </div>
    </div>
  );
}
