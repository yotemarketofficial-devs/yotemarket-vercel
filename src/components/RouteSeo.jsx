/* RouteSeo — per-page title, description and canonical.
 *
 * This is a single-page app: index.html is served for every URL, so without this
 * every page shipped the homepage's <title>, description AND — worst of all — a
 * canonical of "https://yotemarket.com/". A canonical pointing at the homepage
 * tells Google that /about, /pricing, /careers and the rest ARE the homepage, so
 * they get folded away and never rank, while sitemap.xml is busy asking Google to
 * index them. The two were fighting each other; the canonical was winning.
 *
 * Googlebot runs JS, so setting these on navigation works. Note the honest limit:
 * crawlers that DON'T run JS (WhatsApp, Facebook, X link previews) only ever see
 * index.html, so shared links show the homepage card. Fixing that properly needs
 * prerendering/SSR — see the platform audit.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// The canonical domain is .co.ke. The site also answers on yotemarket.com, so
// every page must canonicalise HERE — otherwise Google sees two copies of the
// whole site and splits the ranking signals between them. (.com should 301 to
// .co.ke at the domain level too; canonical alone is a hint, not a redirect.)
const SITE = 'https://yotemarket.co.ke';

const DEFAULT = {
  title: 'YoteMarket — Shop Local. Delivered Fast.',
  description:
    "YoteMarket is Kenya's virtual mall — shop local stores, chat and negotiate with sellers, pay with M-Pesa, and collect at your nearest hub.",
};

// Written for a person searching, not for a crawler: what the page is, and why
// they'd click. Keep titles ~60 chars and descriptions ~155 or Google truncates.
const PAGES = {
  '/': DEFAULT,
  '/storefront': {
    title: 'Shop Kenyan stores online — YoteMarket',
    description:
      'Browse local Kenyan stores in one place. Chat and negotiate with sellers, pay with M-Pesa, and collect at your nearest pickup hub.',
  },
  '/about': {
    title: 'About YoteMarket — Kenya’s virtual mall',
    description:
      'Why YoteMarket exists: one platform where Kenyan shops sell online, riders deliver, and shoppers collect at a hub near them.',
  },
  '/pricing': {
    title: 'Pricing & plans for sellers — YoteMarket',
    description:
      'Simple monthly plans for Kenyan businesses: your own storefront, POS, delivery and AI tools. No commission on your sales.',
  },
  '/mobile': {
    title: 'The YoteMarket shopping app',
    description:
      'Shop local Kenyan stores from your phone: chat to sellers, pay with M-Pesa, track delivery and collect at a hub.',
  },
  '/rider': {
    title: 'Earn as a YoteMarket rider',
    description:
      'Deliver for YoteMarket and get paid per run. Pick up batched orders and drop at neighbourhood hubs.',
  },
  '/marketers': {
    title: 'Earn as a YoteMarket scout',
    description:
      'Sign up local businesses and earn for every verified merchant you bring to YoteMarket. Paid by M-Pesa.',
  },
  '/careers': {
    title: 'Careers at YoteMarket',
    description: 'Open roles at YoteMarket — help build the platform Kenyan shops sell on.',
  },
  '/help': {
    title: 'Help Centre — YoteMarket',
    description:
      'Answers on orders, delivery, pickup hubs, M-Pesa payments, refunds and selling on YoteMarket — or send us a message.',
  },
  '/contact': {
    title: 'Contact YoteMarket',
    description: 'Get in touch with the YoteMarket team.',
  },
  '/terms': {
    title: 'Terms of Service — YoteMarket',
    description: 'The terms that govern using YoteMarket as a shopper, seller, rider or scout.',
  },
  '/privacy': {
    title: 'Privacy Policy — YoteMarket',
    description: 'What data YoteMarket collects, why, and the choices you have.',
  },
};

/** Set (or create) a <meta> tag. */
function meta(key, content, attr = 'name') {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Point the canonical at THIS url — not blanket-at the homepage. */
function canonical(url) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

export default function RouteSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Trailing slashes would otherwise canonicalise to a different URL than the
    // sitemap lists, which is the same duplicate problem in a smaller hat.
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
    // Catalogue pages (/store/:sid, /product/:pid) are real URLs but their titles
    // live in Firestore, not in this map. Give them a self-canonical and a sane
    // generic title; the screen itself refines the title once the item loads.
    // (A per-item <title> in the crawled HTML needs prerender/SSR — see [[seo]].)
    const page = PAGES[path] || (/^\/(store|product)\//.test(path)
      ? { title: 'Shop Kenyan stores online — YoteMarket', description: PAGES['/storefront'].description }
      : DEFAULT);
    const url = SITE + (path === '/' ? '/' : path);

    document.title = page.title;
    meta('description', page.description);
    canonical(url);

    meta('og:title', page.title, 'property');
    meta('og:description', page.description, 'property');
    meta('og:url', url, 'property');
    meta('twitter:title', page.title);
    meta('twitter:description', page.description);

    // Signed-in app areas are already Disallowed in robots.txt, but a crawler that
    // reaches one anyway shouldn't index a shell of someone's dashboard.
    const gated = ['/dashboard', '/staff', '/admin', '/hub', '/pos', '/marketers/app'];
    meta('robots', gated.some((g) => path.startsWith(g)) ? 'noindex, nofollow' : 'index, follow');
  }, [pathname]);

  return null;
}
