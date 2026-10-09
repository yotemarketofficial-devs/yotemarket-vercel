import { Link } from 'react-router-dom';
// One source of truth for the founders' profile urls — these must match the Person
// `sameAs` in index.html, or the entity splits. See lib/socials.js.
import { COMPANY_PROFILES, FOUNDERS } from '../lib/socials.js';
import PageHero from '../components/PageHero.jsx';
import YoteAiMark from '../components/YoteAiMark.jsx';
import YoteFeedMark from '../components/YoteFeedMark.jsx';
import { Icon } from '../components/LineIcon.jsx';
import stallPhoto from '../assets/pages/about-stall.webp';
import stallPhoto2x from '../assets/pages/about-stall@2x.webp';
import mpesaLogo from '../assets/pages/mpesa-logo.png';
import roleShop from '../assets/home/role-shop.webp';
import roleSell from '../assets/home/role-sell.webp';
import roleEarn from '../assets/home/role-earn.webp';
import roleRide from '../assets/home/role-ride.webp';
import '../styles/pages.css';

/* /about — laid out to the 2026-10-09 about board: hero with the merchant at her stall,
   "Why we built YoteMarket" with four values, "One platform, every role", a "Built for
   local business" strip, the founders, and a closing band.
   The board's claims that the product doesn't back were rewritten: there is no door
   delivery and hub carriage is paused (orders are collected with a one-time code), there
   are not "thousands" of shops, merchants pay a monthly plan (no free storefront), POS is
   Growth and up, POS receipts are not eTIMS invoices, and YoteAI has no demand data.
   The founders section and the company profiles are kept whole: index.html's JSON-LD
   claims those profiles, and the page must link every one of them. */

/* Every profile socials.js claims for a founder, as a rel="me" link.
 *
 * The whole list, never just the first entry: the Person `sameAs` in index.html
 * claims all of them, and a profile claimed in JSON-LD but not linked from the page
 * is the exact half-claim that leaves an entity unresolved. The first link carries
 * the name ("Arnold on LinkedIn"), the rest just the site ("and Crunchbase"). */
function FounderLinks({ id, first }) {
  const links = FOUNDERS.find((f) => f.id === id).links;
  return (
    <>
      {links.map((l, i) => (
        <span key={l.url}>
          {i === 0 ? '' : i === links.length - 1 ? ' and ' : ', '}
          <a href={l.url} target="_blank" rel="noopener noreferrer me">{i === 0 ? `${first} on ${l.label}` : l.label}</a>
        </span>
      ))}
    </>
  );
}

const CHIPS = [
  { icon: 'store', text: 'Local shops & communities' },
  { icon: 'shield', text: 'Secure payments (M‑Pesa escrow)' },
  { icon: 'key', text: 'Collect with a one-time code' },
  { icon: 'pin', text: 'Built in Nairobi, for Kenya' },
];

const VALUES = [
  { icon: 'users', title: 'Support local', text: 'Keep money in local communities and help Kenyan businesses grow.' },
  { icon: 'shield', title: 'Create opportunities', text: 'Let merchants, scouts and riders earn on their own terms.' },
  { icon: 'rocket', title: 'Make life easier', text: 'Give shoppers a simple, secure way to shop and pay.' },
  { icon: 'heart', title: 'Build a stronger Kenya', text: 'More local commerce, more work, more thriving communities.' },
];

const ROLES = [
  { key: 'shop', img: roleShop, icon: 'cart', title: 'Shoppers', to: '/storefront', alt: 'A smiling shopper with YoteMarket bags and her phone',
    text: 'Browse branded storefronts, chat and negotiate with sellers, pay with M‑Pesa escrow and collect your order with a one-time code.' },
  { key: 'sell', img: roleSell, icon: 'store', title: 'Merchants', to: '/pricing', alt: 'A merchant in a YoteMarket apron with his laptop',
    text: 'Get a branded storefront from Ksh 500 a month, sell with YoteFeed videos and YoteAI, take M‑Pesa payments, and add POS on Growth.' },
  { key: 'earn', img: roleEarn, icon: 'megaphone', title: 'Marketers', to: '/marketers', alt: 'A YoteMarket scout with a megaphone and her phone',
    text: 'Sign up local shops as a scout and earn for every verified merchant you bring on.' },
  { key: 'ride', img: roleRide, icon: 'scooter', title: 'Riders', to: '/rider', alt: 'A YoteMarket rider with his delivery box, giving a thumbs up',
    text: 'Sign up to carry batched orders from shops to pickup hubs, on your own hours, paid per run.' },
];

const BUILT = [
  { art: <img className="ab-mpesa" src={mpesaLogo} alt="M-Pesa" width="480" height="141" loading="lazy" decoding="async" />, title: 'M‑Pesa', text: 'Escrow checkout and wallet payouts.' },
  { art: <span className="pg-ic is-sm"><Icon name="key" /></span>, title: 'Store pickup', text: 'Collect with a one-time code.' },
  { art: <span className="pg-ic is-sm"><YoteAiMark size={20} /></span>, title: 'YoteAI', text: 'Finds products for shoppers and drafts copy for sellers.' },
  { art: <span className="pg-ic is-sm"><YoteFeedMark size={20} /></span>, title: 'YoteFeed', text: 'Shoppable videos from local stores.' },
];

function About() {
  return (
    <main className="pg about">
      <PageHero
        className="ab-hero"
        pill={{ icon: 'store', text: 'About YoteMarket' }}
        title={<>Local shops. Real people.<br /><span className="g">Real impact.</span></>}
        lead="YoteMarket is Kenya's virtual mall: local shops get their own branded storefront, shoppers chat, negotiate and pay with M‑Pesa, and scouts earn by bringing shops online."
        art={{ src: stallPhoto, src2x: stallPhoto2x, width: 775, height: 269,
          alt: 'A smiling merchant in a YoteMarket apron at her stall beside a "Support Local Business" chalkboard, with shoppers behind her' }}
        note={'Kenyan businesses.\nBigger tomorrows.'}
      >
        <ul className="ab-chips">
          {CHIPS.map((c) => <li key={c.text}><span className="pg-ic is-sm"><Icon name={c.icon} /></span>{c.text}</li>)}
        </ul>
      </PageHero>

      <section className="pg-sec is-soft">
        <div className="pg-wrap ab-why">
          <div className="ab-why-copy">
            <span className="pg-ic is-solid ab-why-ic"><Icon name="target" /></span>
            <div>
              <h2 className="pg-h2">Why we built YoteMarket</h2>
              <p>
                We saw the potential in Kenya&rsquo;s local businesses — and the challenges they face. Many great shops
                lack an online presence, easy access to customers and the right tools to grow. At the same time,
                shoppers want a simpler, safer and more local way to shop.
              </p>
              <p><b>That&rsquo;s why we built YoteMarket — to connect, empower and grow together.</b></p>
            </div>
          </div>
          <ul className="ab-values">
            {VALUES.map((v) => (
              <li key={v.title}>
                <span className="pg-ic"><Icon name={v.icon} /></span>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pg-sec">
        <div className="pg-wrap">
          <div className="pg-head is-center">
            <h2 className="pg-h2">One platform, every role</h2>
            <p className="pg-sub">YoteMarket brings together everyone in local commerce.</p>
          </div>
          <div className="ab-roles">
            {ROLES.map((r) => (
              <Link className={`pg-card ab-role is-${r.key}`} to={r.to} key={r.key}>
                <span className="ab-role-photo"><img src={r.img} alt={r.alt} loading="lazy" decoding="async" /></span>
                <span className="pg-ic is-solid ab-role-ic" aria-hidden="true"><Icon name={r.icon} /></span>
                <b>{r.title}</b>
                <span className="ab-role-text">{r.text}</span>
                <span className="ab-more">Learn more <Icon name="arrow" /></span>
              </Link>
            ))}
          </div>

          <div className="pg-strip ab-built">
            <div className="ab-built-copy">
              <h2>Built for local business</h2>
              <p>The tools that make a real difference to Kenyan commerce.</p>
            </div>
            <ul>
              {BUILT.map((b) => (
                <li key={b.title}>
                  <span className="ab-built-art">{b.art}</span>
                  <span><b>{b.title}</b><span>{b.text}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="pg-sec ab-people">
        <div className="pg-wrap">
          <div className="pg-head">
            <span className="pg-kicker">The founders</span>
            <h2 className="pg-h2">Who&rsquo;s behind YoteMarket</h2>
            <p className="pg-sub">
              YoteMarket was founded by <strong>Moses Kiambi</strong> and <strong>Arnold Kamau</strong>, who lead the
              company as Chief Executive Officer and Chief Operating Officer.
            </p>
          </div>
          <div className="ab-founders">
            <article className="pg-card ab-founder" id="moses-kiambi">
              <h3>Moses Kiambi <span>Chief Executive Officer (CEO)</span></h3>
              <p>
                Moses leads YoteMarket&rsquo;s go-to-market. Marketing strategy, brand and user acquisition sit with him:
                how the mall reaches shoppers across Kenya, how merchants first hear about us, and how that attention
                converts into active stores and repeat buyers.
              </p>
              <p>
                His background is in e-commerce, digital media and marketing. He has run digital marketing and media
                independently, and supports <em>Jacity Travellers &amp; Tours</em> in Nairobi with content and social
                campaigns in the travel sector. He is certified by Google in Digital Marketing Fundamentals and has
                studied information technology.
              </p>
              <p className="ab-links"><FounderLinks id="moses-kiambi" first="Moses" />.</p>
            </article>
            <article className="pg-card ab-founder" id="arnold-kamau">
              <h3>Arnold Kamau <span>Chief Operating Officer (COO)</span></h3>
              <p>
                Arnold carries the rest of the business. Product and technology, operations and logistics, merchant
                systems, finance and compliance all report to him — the platform itself, the pickup-hub and rider
                delivery network, merchant onboarding and the scout program, and the processes that let stores fulfil
                orders reliably.
              </p>
              <p>
                He is a startup operator with a foot in both technology and policy. He is co-founder and COO of
                <em> LeaseUs</em>, a blockchain-powered service-delivery platform, a director at <em>Portico Agency</em>{' '}
                in London, and founder of the <em>Kaiserberg Independent Policy Design Initiative</em>. He also founded{' '}
                <em>Tuelewane</em>, a thought-leadership blog and podcast on geopolitics, technology and social change,
                and serves as Secretary General of The Patriciah Foundation, which backs education, empowerment and
                social-justice work. He holds a bachelor&rsquo;s degree in International Relations from Daystar
                University, with further study at Leiden University in the political economy of institutions and
                development and in international humanitarian law, and a specialisation in negotiation, mediation and
                conflict resolution from ESSEC Business School.
              </p>
              <p className="ab-links"><FounderLinks id="arnold-kamau" first="Arnold" />.</p>
            </article>
          </div>
          <p className="ab-elsewhere">
            YoteMarket is also listed on{' '}
            {COMPANY_PROFILES.map((p, i) => (
              <span key={p.url}>
                {i > 0 ? (i === COMPANY_PROFILES.length - 1 ? ' and ' : ', ') : ''}
                <a href={p.url} target="_blank" rel="noopener noreferrer me">{p.label}</a>
              </span>
            ))}. Those pages describe the same company as this one.
          </p>
        </div>
      </section>

      <section className="pg-sec ab-grow-sec">
        <div className="pg-wrap">
          <div className="pg-band ab-grow">
            <span className="pg-ic ab-grow-ic"><Icon name="chart" /></span>
            <div>
              <h2>Grow with YoteMarket</h2>
              <p>Join the Kenyan shops, shoppers, scouts and riders building a stronger local economy.</p>
            </div>
            <div className="ab-grow-cta">
              <Link className="pg-btn is-white" to="/dashboard">Start selling <Icon name="arrow" /></Link>
              <Link className="pg-btn is-ghost ab-ghost-light" to="/storefront">Shop the mall</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default About;
